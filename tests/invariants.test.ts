import { describe, expect, it } from 'vitest';
import { CASES, LEVEL } from '../src/domain/course';
import { createAttempt, flows, isRetesting, reducer, scoreAttempt, waterLabel } from '../src/domain/engine';
import type { Attempt, CaseId, Event, Mode } from '../src/domain/types';
import { translate } from '../src/i18n';
import { archiveAttempt, emptyStore, parseStore } from '../src/storage/local';
import { getStage, reviewSuggestions } from '../src/ui/presentation';

// Bounded regression exploration, not exhaustive model checking. These seeds and
// public-event checkpoints make failures reproducible without another dependency.
const now = '2026-10-05T09:00:00.000Z';
const cases = ['seal', 'inlet', 'supply'] as const;
const modes = ['explore', 'guided', 'assessment'] as const;
const seeds = [7, 73, 2026] as const;
const run = (a: Attempt, events: readonly Event[]) => events.reduce(reducer, a);
const ticks = (seconds: number, dt = 0.25): Event[] =>
  Array.from({ length: Math.ceil(seconds / dt) }, () => ({ type: 'TICK', dt }));
const observations: Event[] = [
  { type: 'CHECK_WATER' }, { type: 'CHECK_SUPPLY' },
  { type: 'OBSERVE', part: 'drain' }, { type: 'OBSERVE', part: 'inlet' },
  { type: 'OBSERVE', part: 'overflow' }
];

function checkpoints(caseId: CaseId, mode: Mode) {
  const initial = createAttempt(mode, caseId, `invariant-${mode}-${caseId}`, now);
  const diagnosed = run(initial, [...observations, { type: 'DIAGNOSE', diagnosis: caseId }]);
  const isolated = run(diagnosed, [
    { type: 'TOGGLE_LID' }, { type: 'SET_SUPPLY', open: false },
    { type: 'CHECK_SUPPLY' }, { type: 'DRAIN' }, ...ticks(2)
  ]);
  const component = CASES[caseId].component ?? 'inlet';
  const removed = reducer(isolated, { type: 'REMOVE', component });
  const repaired = CASES[caseId].component
    ? run(removed, [{ type: 'REPLACE', component }, { type: 'ASSEMBLE', component }, { type: 'SET_SUPPLY', open: true }])
    : reducer(diagnosed, { type: 'SET_SUPPLY', open: true });
  const verified = run(repaired, [{ type: 'RETEST' }, ...ticks(18)]);
  return { initial, diagnosed, isolated, removed, repaired, verified };
}

const alphabet: Event[] = [
  ...observations, { type: 'OBSERVE', part: 'float' }, { type: 'OBSERVE', part: 'tank' },
  { type: 'SET_SUPPLY', open: false }, { type: 'SET_SUPPLY', open: true },
  { type: 'TOGGLE_LID' }, { type: 'DRAIN' }, { type: 'RETEST' },
  ...(['drain', 'inlet'] as const).flatMap(component => [
    { type: 'REMOVE', component }, { type: 'REPLACE', component }, { type: 'ASSEMBLE', component }
  ] as Event[]),
  ...cases.map(diagnosis => ({ type: 'DIAGNOSE', diagnosis }) as Event),
  ...[0, -1, Number.NaN, Number.POSITIVE_INFINITY, 0.01, 0.05, 0.25, 1, 5]
    .map(dt => ({ type: 'TICK', dt }) as Event)
];

function sequence(seed: number, length: number): Event[] {
  let state = seed >>> 0;
  return Array.from({ length }, () => {
    // Integer xorshift32; no wall clock or Math.random in the generated traces.
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return alphabet[(state >>> 0) % alphabet.length];
  });
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Specification assertions: permitted transitions, not a second reducer. */
function assertTransition(before: Attempt, event: Event, after: Attempt, context: string) {
  expect(Number.isFinite(after.water), context).toBe(true);
  expect(after.water, context).toBeGreaterThanOrEqual(0);
  expect(after.water, context).toBeLessThanOrEqual(LEVEL.overflow);
  expect(after.elapsed, context).toBeGreaterThanOrEqual(before.elapsed);
  expect(after.drainRemaining, context).toBeGreaterThanOrEqual(0);
  expect(after.drainRemaining, context).toBeLessThanOrEqual(1.5);
  expect(after.id, context).toBe(before.id);
  expect(after.mode, context).toBe(before.mode);
  expect(after.caseId, context).toBe(before.caseId);
  if (event.type === 'TICK' && (!Number.isFinite(event.dt) || event.dt <= 0)) {
    expect(after, context).toBe(before);
  }

  if (event.type === 'REMOVE' && before.assembly[event.component].installed && !isRetesting(before)) {
    const unsafe = before.supplyOpen || !before.isolatedConfirmed || !before.lidOpen
      || !before.process.drained || before.water > LEVEL.empty;
    if (unsafe) {
      expect(after.assembly, context).toEqual(before.assembly);
      expect(after.safetyErrors.some(error => error.code === `unsafe-remove-${event.component}`), context).toBe(true);
      expect(after.logs.at(-1)?.kind, context).toBe('safety');
    }
  }

  // Historical evidence and critical errors cannot disappear after recovery.
  for (const [id, evidence] of Object.entries(before.evidence)) {
    expect(after.evidence[id as keyof Attempt['evidence']], context).toEqual(evidence);
  }
  for (const error of before.safetyErrors) expect(after.safetyErrors, context).toContainEqual(error);
  expect(new Set(after.safetyErrors.map(error => error.code)).size, context).toBe(after.safetyErrors.length);
  if (before.firstDiagnosis !== null) expect(after.firstDiagnosis, context).toBe(before.firstDiagnosis);
  if (before.mode === 'assessment' && before.diagnosis !== null) {
    expect(after.diagnosis, context).toBe(before.diagnosis);
    expect(after.diagnosisTries, context).toBe(1);
  }

  for (const component of ['drain', 'inlet'] as const) {
    if (before.assembly[component].installed && !after.assembly[component].installed) {
      expect(event, context).toEqual({ type: 'REMOVE', component });
      expect(before.supplyOpen, context).toBe(false);
      expect(before.isolatedConfirmed, context).toBe(true);
      expect(before.lidOpen, context).toBe(true);
      expect(before.process.drained, context).toBe(true);
      expect(before.water, context).toBeLessThanOrEqual(LEVEL.empty);
      expect(isRetesting(before), context).toBe(false);
    }
  }
  if (!before.supplyOpen && after.supplyOpen) {
    expect(after.assembly.drain.installed && after.assembly.inlet.installed, context).toBe(true);
  }
  for (const [defect, component] of [['seal', 'drain'], ['inlet', 'inlet']] as const) {
    if (before.defects[defect] && !after.defects[defect]) {
      expect(event, context).toEqual({ type: 'REPLACE', component });
      expect(before.assembly[component].installed, context).toBe(false);
    }
  }

  const score = scoreAttempt(after);
  expect(scoreAttempt(after), context).toEqual(score);
  expect(score.sections.map(section => section.possible), context).toEqual([25, 30, 25, 20]);
  expect(score.total, context).toBe(score.sections.reduce((sum, section) => sum + section.earned, 0));
  for (const section of score.sections) {
    expect(section.earned, context).toBeGreaterThanOrEqual(0);
    expect(section.earned, context).toBeLessThanOrEqual(section.possible);
  }
  if (score.passed) {
    expect(after.mode, context).not.toBe('explore');
    expect(after.safetyErrors, context).toEqual([]);
    expect(after.diagnosis, context).toBe(after.caseId);
    expect(after.defects, context).toEqual({ seal: false, inlet: false });
    expect(after.retest.phase, context).toBe('passed');
    expect(Object.values(after.retest.checks).every(Boolean), context).toBe(true);
    expect(after.supplyOpen && after.assembly.inlet.installed && after.assembly.drain.installed, context).toBe(true);
  }
}

function roundTrip(a: Attempt) {
  const store = a.status === 'completed'
    ? archiveAttempt(emptyStore(), a)
    : { ...emptyStore(), sessions: { [a.mode]: a } };
  const restored = parseStore(JSON.stringify(store));
  expect(restored.status).toBe('ok');
  return restored.data.sessions[a.mode] ?? restored.data.records[0];
}

describe('bounded state-machine invariants', () => {
  for (const caseId of cases) {
    it(`${caseId}: preserves safety contracts across 1,296 seeded transitions`, () => {
      const covered = new Set<string>();
      for (const mode of modes) {
        const starts = checkpoints(caseId, mode);
        for (const [checkpoint, start] of Object.entries(starts)) for (const seed of seeds) {
          let a = start;
          sequence(seed, 24).forEach((event, index) => {
            const context = `${caseId}/${mode}/${checkpoint}/seed=${seed}/event=${index}:${event.type}`;
            const original = JSON.stringify(a);
            const b = reducer(freeze(a), freeze(event));
            expect(JSON.stringify(a), context).toBe(original);
            assertTransition(a, event, b, context);
            if (b.safetyErrors.length > a.safetyErrors.length) covered.add('rejected-unsafe-operation');
            if (b.assembly.inlet.installed !== a.assembly.inlet.installed || b.assembly.drain.installed !== a.assembly.drain.installed) covered.add('assembly-change');
            if (a.retest.phase === 'passed' && b.retest.phase !== 'passed') covered.add('verification-invalidated');
            if (isRetesting(a)) covered.add('active-retest');
            a = b;
          });
        }
      }
      // A generator that only produces rejected actions would be a weak test.
      expect([...covered].sort()).toEqual([
        'active-retest', 'assembly-change', 'rejected-unsafe-operation', 'verification-invalidated'
      ]);
    });

    it(`${caseId}: frequent schema-v1 reloads preserve the same continuation and result`, () => {
      for (const mode of modes) for (const start of Object.values(checkpoints(caseId, mode))) {
        let uninterrupted = start;
        let reloaded = roundTrip(start);
        for (const event of sequence(2026, 36)) {
          uninterrupted = reducer(uninterrupted, event);
          reloaded = roundTrip(reducer(reloaded, event));
          expect(reloaded).toEqual(uninterrupted);
          expect(scoreAttempt(reloaded)).toEqual(scoreAttempt(uninterrupted));
        }
      }
    });
  }

  it('read-only presentation and language projections do not affect later simulation', () => {
    for (const caseId of cases) for (const mode of modes) {
      const start = checkpoints(caseId, mode).repaired;
      const events = [{ type: 'RETEST' } as Event, ...ticks(18)];
      const plain = run(start, events);
      let viewed = start;
      for (const event of events) {
        freeze(viewed);
        const before = JSON.stringify(viewed);
        const stage = getStage(viewed);
        const suggestions = reviewSuggestions(viewed);
        flows(viewed); waterLabel(viewed); scoreAttempt(viewed);
        for (const locale of ['en', 'zh'] as const) {
          [stage.label, stage.description, ...suggestions, viewed.feedback]
            .forEach(text => translate(text, locale));
        }
        expect(JSON.stringify(viewed)).toBe(before);
        viewed = reducer(viewed, event);
      }
      expect(viewed).toEqual(plain);
    }
  });

  it('retest decisions agree for supported caller time steps, without equating timestamps', () => {
    for (const caseId of cases) for (const dt of [0.05, 0.25, 1]) {
      const { diagnosed, repaired } = checkpoints(caseId, 'assessment');
      const good = run(repaired, [{ type: 'RETEST' }, ...ticks(24, dt)]);
      const unresolved = run(diagnosed, [{ type: 'RETEST' }, ...ticks(24, dt)]);
      expect(good.retest.phase).toBe('passed');
      expect(scoreAttempt(good).passed).toBe(true);
      expect(unresolved.retest.phase).toBe('failed');
      expect(scoreAttempt(unresolved).passed).toBe(false);
    }
  });

  it('completed records are absorbing and re-archiving cannot replace newer progress', () => {
    for (const caseId of cases) for (const mode of ['guided', 'assessment'] as const) {
      const finished = reducer(checkpoints(caseId, mode).verified, { type: 'FINISH', at: now });
      expect(finished.status).toBe('completed');
      const next = createAttempt(mode, caseId, `${finished.id}-new`, now);
      const archived = archiveAttempt({ ...emptyStore(), sessions: { [mode]: next } }, freeze(finished));
      for (const event of [...alphabet, { type: 'FINISH', at: now } as Event]) {
        expect(reducer(finished, event)).toBe(finished);
        expect(archiveAttempt(archived, finished)).toBe(archived);
      }
      expect(archived.records).toEqual([finished]);
      expect(archived.sessions[mode]).toBe(next);
      expect(roundTrip(finished)).toEqual(finished);
    }
  });
});
