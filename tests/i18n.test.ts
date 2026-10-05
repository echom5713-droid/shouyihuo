import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CASES, CERTIFICATE_NOTICE, COURSE_TITLE, DISCLAIMER, EVIDENCE_LABELS, MODES, PARTS, VERIFY_LABELS } from '../src/domain/course';
import { createAttempt, reducer, scoreAttempt } from '../src/domain/engine';
import type { Attempt, CaseId, Event } from '../src/domain/types';
import { LOCALE_KEY, readLocale, translate } from '../src/i18n';
import { parseStore, type LocalStore } from '../src/storage/local';
import { getStage, reviewSuggestions } from '../src/ui/presentation';

const han = /[\u3400-\u9fff]/;
const now = '2026-10-05T08:00:00.000Z';
const oldStore = JSON.parse(readFileSync(new URL('../e2e/fixtures/v0.1-store.json', import.meta.url), 'utf8')) as LocalStore;
function translated(text: string) {
  const output = translate(text, 'en');
  expect(output, `Untranslated learner text: ${text}`).not.toMatch(han);
  expect(output.trim()).not.toBe('');
  expect(translate(text, 'zh')).toBe(text);
}
function checkAttempt(a: Attempt) {
  const before = JSON.stringify(a);
  [a.feedback, a.retest.message, ...a.logs.map(l => l.text), ...a.safetyErrors.map(e => e.text), ...Object.values(a.evidence).map(e => e!.text), getStage(a).label, getStage(a).description, ...reviewSuggestions(a)].forEach(translated);
  const score = scoreAttempt(a);
  score.reasons.forEach(translated);
  score.sections.forEach(s => { translated(s.title); s.items.forEach(item => { translated(item.label); translated(item.reason); }); });
  expect(JSON.stringify(a)).toBe(before);
  expect(scoreAttempt(a)).toEqual(score);
}
function run(a: Attempt, ...events: Event[]) { return events.reduce(reducer, a); }
function advance(a: Attempt, seconds: number) {
  for (let i = 0; i < seconds * 4; i++) { a = reducer(a, { type: 'TICK', dt: 0.25 }); checkAttempt(a); }
  return a;
}

describe('English-first bilingual presentation', () => {
  it('uses a separate preference key, defaults to English, and tolerates blocked or invalid preference storage', () => {
    expect(LOCALE_KEY).toBe('shouyihuo.locale.v1');
    expect(readLocale()).toBe('en');
    expect(readLocale({ getItem: () => null })).toBe('en');
    expect(readLocale({ getItem: () => 'zh' })).toBe('zh');
    expect(readLocale({ getItem: () => 'en' })).toBe('en');
    expect(readLocale({ getItem: () => 'fr' })).toBe('en');
    expect(readLocale({ getItem: () => { throw new Error('blocked'); } })).toBe('en');
    expect(translate('查看水位', 'en')).toMatch(/water/i);
    expect(translate('开始独立测评', 'en')).toMatch(/assessment/i);
    expect(translate('SYH-portfolio-record', 'en')).toBe('SYH-portfolio-record');
  });

  it('translates every course, part, mode, evidence and verification description without altering Chinese content', () => {
    [COURSE_TITLE, DISCLAIMER, CERTIFICATE_NOTICE, ...Object.values(MODES), ...Object.values(EVIDENCE_LABELS), ...Object.values(VERIFY_LABELS)].forEach(translated);
    PARTS.forEach(p => [p.name, p.short, p.description].forEach(translated));
    Object.values(CASES).forEach(c => [c.symptom, c.task, c.diagnosis, c.explanation].forEach(translated));
    expect(translate(CERTIFICATE_NOTICE, 'en')).toMatch(/qualification|licence|license/i);
    expect(translate(DISCLAIMER, 'en')).toMatch(/reviewed|review/i);
  });

  it('renders legacy Chinese evidence, logs and critical safety errors in English without rewriting schema-v1 data', () => {
    const before = JSON.stringify(oldStore);
    const parsed = parseStore(before);
    expect(parsed.status).toBe('ok');
    [...Object.values(parsed.data.sessions), ...parsed.data.records].forEach(a => { if (a) checkAttempt(a); });
    expect(JSON.stringify(oldStore)).toBe(before);
    expect(parsed.data).toEqual(oldStore);
  });

  for (const caseId of ['seal', 'inlet', 'supply'] as CaseId[]) {
    it(`translates ${caseId} simulation output, rejection conditions and complete retest without changing score`, () => {
      let a = createAttempt('assessment', caseId, `i18n-${caseId}`, now);
      checkAttempt(a);
      a = reducer(a, { type: 'REMOVE', component: 'drain' });
      checkAttempt(a);
      a = run(a, { type: 'CHECK_WATER' }, { type: 'CHECK_SUPPLY' }, { type: 'OBSERVE', part: 'drain' }, { type: 'OBSERVE', part: 'inlet' }, { type: 'OBSERVE', part: 'overflow' });
      checkAttempt(a);
      for (const part of PARTS) checkAttempt(reducer(a, { type: 'OBSERVE', part: part.id }));
      a = reducer(a, { type: 'DIAGNOSE', diagnosis: caseId });
      checkAttempt(a);
      const component = CASES[caseId].component;
      if (component) {
        a = run(a, { type: 'SET_SUPPLY', open: false }, { type: 'CHECK_SUPPLY' }, { type: 'TOGGLE_LID' }, { type: 'DRAIN' });
        a = advance(a, 2);
        for (const event of [{ type: 'REMOVE', component }, { type: 'REPLACE', component }, { type: 'ASSEMBLE', component }] as Event[]) { a = reducer(a, event); checkAttempt(a); }
      }
      a = run(a, { type: 'SET_SUPPLY', open: true }, { type: 'RETEST' });
      a = advance(a, 18);
      expect(scoreAttempt(a)).toMatchObject({ total: 100, passed: false });
      checkAttempt(reducer(a, { type: 'FINISH', at: now }));
    });
  }

  it('translates failed and rejected actions while retaining assessment first-diagnosis semantics', () => {
    let a = createAttempt('assessment', 'supply', 'wrong-diagnosis-i18n', now);
    for (const event of [{ type: 'SET_SUPPLY', open: true }, { type: 'REPLACE', component: 'inlet' }, { type: 'RETEST' }, { type: 'DIAGNOSE', diagnosis: 'seal' }] as Event[]) checkAttempt(reducer(a, event));
    a = run(a, { type: 'CHECK_WATER' }, { type: 'CHECK_SUPPLY' }, { type: 'DIAGNOSE', diagnosis: 'seal' });
    checkAttempt(a);
    checkAttempt(reducer(a, { type: 'DIAGNOSE', diagnosis: 'supply' }));
    expect(a.firstDiagnosis).toBe('seal');
    expect(scoreAttempt(a).sections[1].earned).toBe(0);
  });
});
