import { describe, expect, it } from 'vitest';
import { CASES } from '../src/domain/course';
import { createAttempt, reducer, scoreAttempt } from '../src/domain/engine';
import type { Attempt, CaseId, Event } from '../src/domain/types';
import { archiveAttempt, clearStore, emptyStore, loadStore, parseStore, saveStore, STORAGE_KEY } from '../src/storage/local';

const now = '2026-09-26T08:00:00.000Z';
const fresh = (id: CaseId = 'seal') => createAttempt('assessment', id, 'SYH-test-1', now);
function run(a: Attempt, ...events: Event[]) { return events.reduce(reducer, a); }
function advance(a: Attempt, seconds = 18) { for (let t = 0; t < seconds; t += 0.25) a = reducer(a, { type: 'TICK', dt: 0.25 }); return a; }
function collect(a: Attempt) { return run(a, { type: 'CHECK_WATER' }, { type: 'CHECK_SUPPLY' }, { type: 'OBSERVE', part: 'drain' }, { type: 'OBSERVE', part: 'inlet' }, { type: 'OBSERVE', part: 'overflow' }); }
function diagnose(a: Attempt) { return reducer(collect(a), { type: 'DIAGNOSE', diagnosis: a.caseId }); }
function isolate(a: Attempt) { return run(advance(run(a, { type: 'SET_SUPPLY', open: false }, { type: 'CHECK_SUPPLY' }, { type: 'DRAIN' }), 2), { type: 'TOGGLE_LID' }); }
function repair(a: Attempt) {
  const c = CASES[a.caseId].component;
  if (!c) return reducer(a, { type: 'SET_SUPPLY', open: true });
  return run(isolate(a), { type: 'REMOVE', component: c }, { type: 'REPLACE', component: c }, { type: 'ASSEMBLE', component: c }, { type: 'SET_SUPPLY', open: true });
}
function pass(a: Attempt) { return advance(reducer(repair(diagnose(a)), { type: 'RETEST' })); }

describe('三个确定性案例', () => {
  for (const id of ['seal', 'inlet', 'supply'] as const) {
    it(`${id} 完整正确路径得 100 分且完成适用验证`, () => {
      const a = pass(fresh(id));
      expect(a.retest.phase).toBe('passed');
      expect(a.safetyErrors).toEqual([]);
      expect(scoreAttempt(a)).toMatchObject({ total: 100, passed: true });
      if (id === 'supply') expect(a.assembly).toEqual({ drain: { installed: true, replaced: false }, inlet: { installed: true, replaced: false } });
    });
  }
  it('正常、漏水、溢流、不补水具有不同可观察状态', () => {
    expect(advance(fresh('seal'), 10).water).toBeCloseTo(0.44, 2);
    expect(advance(fresh('inlet'), 10).water).toBeCloseTo(0.88, 2);
    expect(advance(fresh('supply'), 10).water).toBeCloseTo(0.06, 2);
  });
  it('时间步长可控、相同操作确定性相同', () => {
    const a = fresh('inlet');
    expect(reducer(a, { type: 'TICK', dt: 1 }).water).toBeCloseTo(advance(a, 1).water, 8);
    expect(pass(fresh())).toEqual(pass(fresh()));
  });
});
describe('操作与安全门禁', () => {
  it('测评不能在提交诊断前直接恢复供水完成处理', () => {
    const a = reducer(fresh('supply'), { type: 'SET_SUPPLY', open: true });
    expect(a.supplyOpen).toBe(false); expect(a.process.repaired).toBe(false);
  });
  it('尚未诊断时直接非法拆卸仍记录安全错误且不改变装配', () => {
    const a = fresh(); const b = reducer(a, { type: 'REMOVE', component: 'drain' });
    expect(b.assembly).toEqual(a.assembly); expect(b.safetyErrors).toHaveLength(1);
  });
  it('只关闭供水不会自动修好密封失效', () => {
    const a = advance(reducer(fresh(), { type: 'SET_SUPPLY', open: false }));
    expect(a.defects.seal).toBe(true); expect(scoreAttempt(a).passed).toBe(false);
  });
  it('排水与关水之后，未经检查确认仍不能拆卸', () => {
    const a = run(advance(run(diagnose(fresh()), { type: 'SET_SUPPLY', open: false }, { type: 'DRAIN' }), 2), { type: 'TOGGLE_LID' });
    const b = reducer(a, { type: 'REMOVE', component: 'drain' });
    expect(b.assembly.drain.installed).toBe(true); expect(b.safetyErrors).toHaveLength(1);
  });
  it('错误更换进水组件不能清除密封故障', () => {
    const a = run(isolate(diagnose(fresh())), { type: 'REMOVE', component: 'inlet' }, { type: 'REPLACE', component: 'inlet' }, { type: 'ASSEMBLE', component: 'inlet' }, { type: 'SET_SUPPLY', open: true }, { type: 'RETEST' });
    const b = advance(a); expect(b.defects.seal).toBe(true); expect(b.retest.phase).toBe('failed'); expect(scoreAttempt(b).passed).toBe(false);
  });
  it('正确更换后没有重装不能恢复供水或通过复测', () => {
    const a = run(isolate(diagnose(fresh())), { type: 'REMOVE', component: 'drain' }, { type: 'REPLACE', component: 'drain' }, { type: 'SET_SUPPLY', open: true }, { type: 'RETEST' });
    expect(a.supplyOpen).toBe(false); expect(a.assembly.drain.installed).toBe(false); expect(a.safetyErrors).toHaveLength(1); expect(scoreAttempt(a).passed).toBe(false);
  });
  it('修复但未复测：即使已有 80 分也不合格', () => {
    const a = repair(diagnose(fresh()));
    expect(scoreAttempt(a)).toMatchObject({ total: 80, passed: false });
  });
  it('复测后改变工作状态会使验证失效', () => {
    const a = reducer(pass(fresh()), { type: 'SET_SUPPLY', open: false });
    expect(a.retest.phase).toBe('idle'); expect(scoreAttempt(a).passed).toBe(false);
  });
  it('复测运行期间无法拆装，观察仍可进行', () => {
    const a = reducer(repair(diagnose(fresh())), { type: 'RETEST' });
    const b = reducer(a, { type: 'REMOVE', component: 'drain' });
    expect(b.assembly).toEqual(a.assembly); expect(b.feedback).toContain('复测正在运行');
    expect(reducer(b, { type: 'CHECK_WATER' }).feedback).toContain('再次观察');
  });
  it('关键安全错误使修复后的 100 分尝试仍不合格', () => {
    const a = pass(reducer(fresh(), { type: 'REMOVE', component: 'drain' }));
    expect(scoreAttempt(a).total).toBe(100); expect(scoreAttempt(a).passed).toBe(false);
  });
});
describe('计分与记录幂等', () => {
  it('先观察再诊断，独立测评锁定首次提交', () => {
    expect(reducer(fresh(), { type: 'DIAGNOSE', diagnosis: 'seal' }).diagnosis).toBeNull();
    const a = reducer(collect(fresh()), { type: 'DIAGNOSE', diagnosis: 'inlet' });
    const b = reducer(a, { type: 'DIAGNOSE', diagnosis: 'seal' });
    expect(b.diagnosis).toBe('inlet'); expect(b.diagnosisTries).toBe(1);
  });
  it('重复观察与提交不增加分数，重复归档不增加记录', () => {
    const a = pass(fresh()); const b = run(a, { type: 'CHECK_WATER' }, { type: 'DIAGNOSE', diagnosis: 'seal' }, { type: 'RETEST' });
    expect(scoreAttempt(b)).toEqual(scoreAttempt(a)); expect(b.diagnosisTries).toBe(1);
    const finished = reducer(b, { type: 'FINISH', at: now });
    const store = archiveAttempt(emptyStore(), finished); expect(archiveAttempt(store, finished).records).toHaveLength(1);
    expect(reducer(finished, { type: 'SET_SUPPLY', open: false })).toBe(finished);
  });
  it('引导训练可重试，保留首次错误，结构认知无成绩和证明', () => {
    let a = collect(createAttempt('guided', 'seal', 'guided-1', now));
    a = run(a, { type: 'DIAGNOSE', diagnosis: 'inlet' }, { type: 'DIAGNOSE', diagnosis: 'seal' });
    expect(scoreAttempt(a).sections[1].earned).toBe(15);
    const e = reducer(createAttempt('explore', 'seal', 'explore-1', now), { type: 'FINISH', at: now });
    expect(e.status).toBe('active'); expect(archiveAttempt(emptyStore(), e).records).toHaveLength(0); expect(scoreAttempt(e).passed).toBe(false);
  });
  it('未完成的尝试可以结束为不合格报告，新的 attempt 不篡改它', () => {
    const a = reducer(fresh(), { type: 'FINISH', at: now }); const s = archiveAttempt(emptyStore(), a);
    const next = createAttempt('assessment', 'seal', 'SYH-test-2', now);
    expect(next.id).not.toBe(a.id); expect(s.records[0]).toEqual(a); expect(scoreAttempt(a).passed).toBe(false);
  });
});
describe('持久化与恢复', () => {
  it('JSON 往返保留关键安全错误，刷新不能清除', () => {
    const a = reducer(fresh(), { type: 'REMOVE', component: 'drain' });
    const store = { ...emptyStore(), sessions: { assessment: a } };
    const loaded = parseStore(JSON.stringify(store));
    expect(loaded.status).toBe('ok'); expect(loaded.data.sessions.assessment?.safetyErrors).toEqual(a.safetyErrors);
  });
  it('不同模式进度隔离，完成只归档相应模式', () => {
    const guided = createAttempt('guided', 'inlet', 'guided-1', now);
    const assessment = fresh(); const s = { ...emptyStore(), sessions: { guided, assessment } };
    const archived = archiveAttempt(s, reducer(assessment, { type: 'FINISH', at: now }));
    expect(archived.sessions.guided).toEqual(guided); expect(archived.sessions.assessment).toBeUndefined();
  });
  it('损坏 JSON、缺失字段与不兼容版本返回可恢复状态', () => {
    expect(parseStore('{bad').status).toBe('corrupt');
    expect(parseStore('{"schemaVersion":1,"records":[]}').status).toBe('corrupt');
    expect(parseStore('{"schemaVersion":99}').status).toBe('incompatible');
    expect(parseStore(null).status).toBe('ok');
  });
  it('无效嵌套状态不会进入 UI', () => {
    const a = { ...fresh(), water: 50 };
    expect(parseStore(JSON.stringify({ ...emptyStore(), sessions: { assessment: a } })).status).toBe('corrupt');
  });
  it('禁用存储与写入失败不会抛出异常', () => {
    const storage = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); }, removeItem: () => { throw Error('blocked'); } };
    expect(loadStore(storage).status).toBe('unavailable'); expect(saveStore(storage, emptyStore())).toBe(false); expect(clearStore(storage)).toBe(false);
  });
  it('清空只删除本项目 key', () => {
    const map = new Map([[STORAGE_KEY, '{}'], ['other-project', 'preserve']]);
    const port = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, removeItem: (k: string) => { map.delete(k); } };
    expect(clearStore(port)).toBe(true); expect(map.has(STORAGE_KEY)).toBe(false); expect(map.get('other-project')).toBe('preserve');
  });
});
