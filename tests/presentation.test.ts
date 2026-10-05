import { describe, expect, it } from 'vitest';
import { CASES } from '../src/domain/course';
import { createAttempt, reducer, scoreAttempt } from '../src/domain/engine';
import type { Attempt, CaseId, Event, Mode } from '../src/domain/types';
import { getStage, reviewSuggestions } from '../src/ui/presentation';

const now = '2026-09-26T08:00:00.000Z';
const fresh = (id: CaseId = 'seal', mode: Mode = 'assessment') => createAttempt(mode, id, `${mode}-${id}`, now);
const run = (a: Attempt, ...events: Event[]) => events.reduce(reducer, a);
function advance(a: Attempt, seconds = 18) {
  for (let t = 0; t < seconds; t += 0.25) a = reducer(a, { type: 'TICK', dt: 0.25 });
  return a;
}
function collect(a: Attempt) {
  return run(a, { type: 'CHECK_WATER' }, { type: 'CHECK_SUPPLY' }, { type: 'OBSERVE', part: 'drain' }, { type: 'OBSERVE', part: 'inlet' }, { type: 'OBSERVE', part: 'overflow' });
}
const diagnose = (a: Attempt) => reducer(collect(a), { type: 'DIAGNOSE', diagnosis: a.caseId });
function isolate(a: Attempt) {
  return reducer(advance(run(a, { type: 'TOGGLE_LID' }, { type: 'SET_SUPPLY', open: false }, { type: 'CHECK_SUPPLY' }, { type: 'DRAIN' }), 2), { type: 'CHECK_SUPPLY' });
}
function repair(a: Attempt) {
  const component = CASES[a.caseId].component;
  return component
    ? run(isolate(a), { type: 'REMOVE', component }, { type: 'REPLACE', component }, { type: 'ASSEMBLE', component }, { type: 'SET_SUPPLY', open: true })
    : reducer(a, { type: 'SET_SUPPLY', open: true });
}
const pass = (a: Attempt) => advance(reducer(repair(diagnose(a)), { type: 'RETEST' }));

describe('UI 阶段只读派生', () => {
  it('尚未诊断时不透露案例答案或特定组件清单', () => {
    const presentations = (['seal', 'inlet', 'supply'] as const).map(id => getStage(fresh(id)));
    expect(presentations[0]).toEqual(presentations[1]);
    expect(presentations[1]).toEqual(presentations[2]);
    expect(presentations[0]).toMatchObject({ index: 0, label: '观察', complete: false });
    for (const item of presentations) for (const c of Object.values(CASES)) {
      expect(item.description).not.toContain(c.diagnosis);
    }
  });

  it('只按引擎采用的适用证据条件进入诊断阶段', () => {
    const unrelated = run(fresh(), { type: 'OBSERVE', part: 'inlet' }, { type: 'OBSERVE', part: 'overflow' });
    expect(getStage(unrelated).index).toBe(0);
    expect(getStage(reducer(unrelated, { type: 'CHECK_WATER' })).index).toBe(0);
    const ready = run(unrelated, { type: 'CHECK_WATER' }, { type: 'CHECK_SUPPLY' });
    expect(getStage(ready)).toMatchObject({ index: 1, label: '诊断', complete: false });
  });

  it('错误引导答案可重试，错误测评首答锁定后可继续处理', () => {
    const guided = reducer(collect(fresh('seal', 'guided')), { type: 'DIAGNOSE', diagnosis: 'inlet' });
    const assessment = reducer(collect(fresh()), { type: 'DIAGNOSE', diagnosis: 'inlet' });
    expect(getStage(guided)).toMatchObject({ index: 1, label: '诊断' });
    expect(getStage(assessment)).toMatchObject({ index: 2, label: '处理' });
    expect(getStage(assessment).description).toContain('首次诊断已锁定');
  });

  it('未有效修复、未重新装配或未恢复供水时保持处理阶段', () => {
    const diagnosed = diagnose(fresh());
    expect(getStage(diagnosed).index).toBe(2);
    const isolated = isolate(diagnosed);
    const replaced = run(isolated, { type: 'REMOVE', component: 'drain' }, { type: 'REPLACE', component: 'drain' });
    expect(getStage(replaced).index).toBe(2);
    const assembled = reducer(replaced, { type: 'ASSEMBLE', component: 'drain' });
    expect(getStage(assembled).index).toBe(2);
    expect(getStage(reducer(assembled, { type: 'SET_SUPPLY', open: true })).index).toBe(3);
  });

  it('错误更换不显示处理完成，复测失败返回处理阶段', () => {
    const wrong = run(isolate(diagnose(fresh())), { type: 'REMOVE', component: 'inlet' }, { type: 'REPLACE', component: 'inlet' }, { type: 'ASSEMBLE', component: 'inlet' }, { type: 'SET_SUPPLY', open: true });
    expect(getStage(wrong).index).toBe(2);
    const failed = advance(reducer(wrong, { type: 'RETEST' }));
    expect(failed.retest.phase).toBe('failed');
    expect(getStage(failed)).toMatchObject({ index: 2, label: '处理', complete: false });
    expect(getStage(failed).description).toContain(failed.retest.message);
  });

  for (const id of ['seal', 'inlet', 'supply'] as const) {
    it(`${id} 完整处理与复测阶段与引擎同步`, () => {
      const repaired = repair(diagnose(fresh(id)));
      expect(getStage(repaired)).toMatchObject({ index: 3, label: '复测', complete: false });
      const running = reducer(repaired, { type: 'RETEST' });
      expect(getStage(running)).toMatchObject({ index: 3, complete: false, description: running.retest.message });
      const verified = advance(running);
      expect(getStage(verified)).toMatchObject({ index: 3, complete: true });
      expect(getStage(reducer(verified, { type: 'SET_SUPPLY', open: false })).index).toBe(2);
    });
  }

  it('自由观察使用正常演示文案，不标成测评完成', () => {
    const a = advance(reducer(fresh('seal', 'explore'), { type: 'RETEST' }));
    expect(getStage(a)).toMatchObject({ index: 0, label: '自由观察', complete: false });
    expect(getStage(a).description).toContain('不计分');
  });

  it('阶段与建议不会修改尝试、评分或刷新后的阶段', () => {
    const a = pass(fresh());
    const before = JSON.stringify(a);
    const score = scoreAttempt(a);
    getStage(a); reviewSuggestions(a);
    expect(JSON.stringify(a)).toBe(before);
    expect(scoreAttempt(a)).toEqual(score);
    expect(getStage(JSON.parse(before) as Attempt)).toEqual(getStage(a));
  });
});

describe('报告复习建议遵循原评分与安全规则', () => {
  it('100 分且有关键安全错误仍优先复习安全，阶段完成不等于合格', () => {
    const a = pass(reducer(fresh(), { type: 'REMOVE', component: 'drain' }));
    expect(scoreAttempt(a)).toMatchObject({ total: 100, passed: false });
    expect(getStage(a).complete).toBe(true);
    expect(reviewSuggestions(a)[0]).toContain('优先复习拆卸前的安全条件');
    expect(reviewSuggestions(a)[0]).toContain('关键安全错误会保留');
    expect(reviewSuggestions(a)[0]).not.toContain('本次结束时仍需');
    expect(reviewSuggestions(a)[0]).toContain('下次拆卸前需再次确认');
  });

  it('未提交诊断时建议通用且不提前公布评分清单', () => {
    const suggestions = (['seal', 'inlet', 'supply'] as const).map(id => reviewSuggestions(fresh(id)));
    expect(suggestions[0]).toEqual(suggestions[1]);
    expect(suggestions[1]).toEqual(suggestions[2]);
    expect(suggestions[0]).toHaveLength(1);
  });

  it('未复测时给出完整工作循环的复习建议', () => {
    const a = repair(diagnose(fresh('supply')));
    expect(reviewSuggestions(a)).toHaveLength(1);
    expect(reviewSuggestions(a)[0]).toContain('运行复测并等待结束');
    expect(reviewSuggestions(a).join()).not.toContain('拆卸');
  });

  it('错误首答优先复习诊断，建议最多三条', () => {
    const a = reducer(collect(fresh('seal', 'guided')), { type: 'DIAGNOSE', diagnosis: 'inlet' });
    const suggestions = reviewSuggestions(a);
    expect(suggestions[0]).toContain('首次诊断');
    expect(suggestions.length).toBeLessThanOrEqual(3);
    const emptyReport = reducer(fresh(), { type: 'FINISH', at: now });
    expect(reviewSuggestions(emptyReport)).toHaveLength(3);
  });

  it('完整通过时只有保持完整流程的通用建议', () => {
    expect(reviewSuggestions(pass(fresh()))).toEqual(['保持“观察、诊断、安全处理、完整复测”的顺序；在新的情境中继续用证据验证判断。']);
  });
});
