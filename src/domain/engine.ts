import { CASES, LEVEL, PARTS } from './course';
import type { Attempt, CaseId, ComponentId, EvidenceId, Event, Mode, Retest, Score, ScoreItem } from './types';

export function emptyRetest(): Retest {
  return { phase: 'idle', elapsed: 0, checks: { assembly: false, supply: false, stable: false, cycle: false }, message: '尚未复测' };
}
export function createAttempt(mode: Mode, caseId: CaseId, id: string, at: string): Attempt {
  return {
    id, mode, caseId, startedAt: at, endedAt: null, status: 'active',
    supplyOpen: mode === 'explore' || caseId !== 'supply', isolatedConfirmed: false,
    water: mode === 'explore' ? LEVEL.normal : caseId === 'seal' ? 0.44 : caseId === 'inlet' ? 0.76 : 0.06,
    drainRemaining: 0, lidOpen: false,
    defects: { seal: mode !== 'explore' && caseId === 'seal', inlet: mode !== 'explore' && caseId === 'inlet' },
    assembly: { drain: { installed: true, replaced: false }, inlet: { installed: true, replaced: false } },
    evidence: {}, diagnosis: null, diagnosisTries: 0, firstDiagnosis: null,
    process: { isolated: false, confirmed: false, drained: false, repaired: false, assembled: false },
    logs: [{ step: 0, kind: 'info', text: mode === 'explore' ? '结构认知已开始：此模式使用正常模型，不计分。' : `情境 ${CASES[caseId].index} 已开始。请先观察并收集证据。` }],
    safetyErrors: [], retest: emptyRetest(), feedback: '点击模型或左侧部件列表，查看功能并记录观察。', elapsed: 0, step: 0
  };
}
export function waterLabel(a: Attempt) {
  if (a.water <= LEVEL.empty) return '已排空';
  if (a.water >= LEVEL.overflow - 0.015) return '到达溢流位置';
  if (a.water >= LEVEL.normal - 0.02 && a.water <= LEVEL.normal + 0.02) return '正常工作水位附近';
  if (a.water < LEVEL.normal) return '低于正常工作水位';
  return '高于正常工作水位';
}
export function flows(a: Attempt) {
  const draining = a.drainRemaining > 0 || !a.assembly.drain.installed;
  const incoming = a.supplyOpen && (a.defects.inlet || !a.assembly.inlet.installed || a.water < LEVEL.normal - 0.0001);
  return {
    incoming,
    leaking: a.defects.seal && a.assembly.drain.installed && a.water > LEVEL.empty,
    draining: draining && a.water > 0,
    overflowing: a.water >= LEVEL.overflow - 0.01
  };
}
export function isRetesting(a: Attempt) { return ['filling', 'holding', 'draining', 'refilling'].includes(a.retest.phase); }
function log(a: Attempt, text: string, kind: 'info' | 'success' | 'error' | 'safety' = 'info'): Attempt {
  const step = a.step + 1;
  return { ...a, step, feedback: text, logs: [...a.logs, { step, text, kind }] };
}
function error(a: Attempt, text: string, code?: string): Attempt {
  const b = log(a, text, code ? 'safety' : 'error');
  if (code && !b.safetyErrors.some(e => e.code === code)) b.safetyErrors = [...b.safetyErrors, { code, text, step: b.step }];
  return b;
}
function evidence(a: Attempt, id: EvidenceId, text: string): Attempt {
  if (a.evidence[id]) return { ...a, feedback: `再次观察：${text}（该证据已记录，不重复计分）` };
  const b = log(a, `已记录：${text}`, 'success');
  return { ...b, evidence: { ...b.evidence, [id]: { id, text, step: b.step } } };
}
function invalidate(a: Attempt): Attempt { return { ...a, retest: emptyRetest() }; }
export function removalConditions(a: Attempt) {
  return [
    !a.lidOpen ? '打开箱盖' : '',
    a.supplyOpen ? '关闭供水阀' : '',
    !a.isolatedConfirmed ? '关闭供水后检查确认' : '',
    a.water > LEVEL.empty || !a.process.drained ? '模拟排水并等待排空' : ''
  ].filter(Boolean);
}
function observe(a: Attempt, part: string): Attempt {
  const f = flows(a);
  if (part === 'water') return evidence(a, 'water', `当前${waterLabel(a)}；${f.incoming ? '可见持续补水' : '未见进水'}。`);
  if (part === 'supply') return evidence({ ...a, isolatedConfirmed: !a.supplyOpen, process: { ...a.process, confirmed: a.process.confirmed || !a.supplyOpen } }, 'supply', `供水阀处于${a.supplyOpen ? '打开' : '关闭'}状态${a.supplyOpen ? '。' : '，已确认隔离。'}`);
  if (part === 'drain') return evidence(a, 'drain', !a.assembly.drain.installed ? '排水组件已拆下，排水口开放。' : f.leaking ? '翻板处于关闭位置，但排水口仍可见持续水流。' : f.draining ? '排水口正在释放箱内水。' : '当前排水口未见持续水流。');
  if (part === 'inlet' || part === 'float') return evidence(a, 'inlet', `${a.water >= LEVEL.normal ? '水位已到工作水位或更高' : '水位低于工作水位'}，${f.incoming ? '进水组件仍在补水' : '进水组件当前没有水流'}。`);
  if (part === 'overflow') return evidence(a, 'overflow', f.overflowing ? '水已到溢流管口，可见水流进入管内。' : '水面低于溢流管口，当前未见溢流。');
  return log(a, `已观察${PARTS.find(p => p.id === part)?.name ?? '部件'}。本操作不增加诊断证据分。`);
}
function physics(a: Attempt, dt: number): Attempt {
  // Teaching units, deliberately not litres, pressure or engineering time.
  const f = flows(a);
  const inflow = f.incoming ? 0.22 : 0;
  const outflow = a.drainRemaining > 0 || !a.assembly.drain.installed ? 0.9 : a.defects.seal ? 0.5 * a.water : 0;
  let water = Math.max(0, Math.min(LEVEL.overflow, a.water + (inflow - outflow) * dt));
  if (!a.defects.inlet && a.assembly.inlet.installed && a.supplyOpen && a.water <= LEVEL.normal && water > LEVEL.normal) water = LEVEL.normal;
  const remaining = Math.max(0, a.drainRemaining - dt);
  return { ...a, water, drainRemaining: remaining, elapsed: a.elapsed + dt,
    process: { ...a.process, drained: a.process.drained || (!a.supplyOpen && water <= LEVEL.empty && a.drainRemaining > 0) } };
}
function tick(a: Attempt, dt: number): Attempt {
  if (!Number.isFinite(dt) || dt <= 0) return a;
  // Fixed internal 50 ms steps keep the simulation deterministic across callers.
  const time = Math.min(dt, 1);
  let b = a;
  for (let rest = time; rest > 1e-8; rest -= 0.05) b = physics(b, Math.min(0.05, rest));
  if (!isRetesting(b)) return b;
  const r = { ...b.retest, checks: { ...b.retest.checks }, elapsed: b.retest.elapsed + time };
  b = { ...b, retest: r };
  const fail = (text: string) => log({ ...b, retest: { ...r, phase: 'failed', message: text } }, text, 'error');
  if (!b.supplyOpen || !b.assembly.drain.installed || !b.assembly.inlet.installed) return fail('复测中止：供水或装配状态不满足条件。');
  if (b.water >= LEVEL.overflow - 0.01) return fail('复测未通过：水位到达溢流位置，进水未正常停止。');
  if (r.elapsed > 9) return fail('复测未通过：限定的模型时间内未形成稳定工作水位。');
  if (r.phase === 'filling' && Math.abs(b.water - LEVEL.normal) < 0.002) return { ...b, retest: { ...r, phase: 'holding', elapsed: 0, message: '正在检查停止进水后的水位稳定性…' } };
  if (r.phase === 'holding') {
    if (Math.abs(b.water - LEVEL.normal) > 0.015) return fail('复测未通过：停止补水后水位未能保持稳定。');
    if (r.elapsed >= 1.5) return { ...b, drainRemaining: 1.5, retest: { ...r, phase: 'draining', elapsed: 0, checks: { ...r.checks, stable: true }, message: '稳定性验证完成，正在模拟排水…' } };
  }
  if (r.phase === 'draining' && b.drainRemaining === 0) return { ...b, retest: { ...r, phase: 'refilling', elapsed: 0, message: '正在验证排水后自动补水并停止…' } };
  if (r.phase === 'refilling' && Math.abs(b.water - LEVEL.normal) < 0.002 && !b.defects.inlet && !b.defects.seal) {
    return log({ ...b, retest: { ...r, phase: 'passed', checks: { assembly: true, supply: true, stable: true, cycle: true }, message: '复测通过：补水停止、水位稳定，排水后可再次正常补水。' } }, '复测通过：完整工作循环已验证。', 'success');
  }
  return b;
}
export function reducer(a: Attempt, e: Event): Attempt {
  if (a.status === 'completed') return a;
  if (e.type === 'TICK') return tick(a, e.dt);
  if (e.type === 'OBSERVE') return observe(a, e.part);
  if (e.type === 'CHECK_WATER') return observe(a, 'water');
  if (e.type === 'CHECK_SUPPLY') return observe(a, 'supply');
  if (e.type === 'TOGGLE_LID') return log({ ...a, lidOpen: !a.lidOpen }, a.lidOpen ? '箱盖已放回。' : '箱盖已打开。');
  if (e.type === 'DIAGNOSE') {
    if (a.diagnosis === e.diagnosis || (a.mode === 'assessment' && a.diagnosis !== null)) return { ...a, feedback: '诊断已提交，不重复计分。独立测评采用首次提交结果。' };
    if (a.mode === 'explore') return { ...a, feedback: '结构认知不进行故障诊断或计分。' };
    if (CASES[a.caseId].evidence.filter(id => a.evidence[id]).length < 2) return error(a, '先完成至少 2 项适用观察，再提交诊断。');
    const b = { ...a, diagnosis: e.diagnosis, firstDiagnosis: a.firstDiagnosis ?? e.diagnosis, diagnosisTries: a.diagnosisTries + 1 };
    return log(b, `${e.diagnosis === a.caseId ? '诊断正确。' : '诊断不正确。'}${CASES[a.caseId].explanation}`, e.diagnosis === a.caseId ? 'success' : 'error');
  }
  if (e.type === 'FINISH') {
    if (a.mode === 'explore') return { ...a, feedback: '结构认知不生成测评记录或合格证明。' };
    if (isRetesting(a)) return error(a, '复测正在运行，请等待结果后再结束。');
    return log({ ...a, status: 'completed', endedAt: e.at }, '本次尝试已结束并保存。报告包含完成项、遗漏项与错误记录。');
  }
  if (isRetesting(a)) return error(a, '复测正在运行，暂不能改变供水或拆装状态；仍可观察。');
  if (e.type === 'SET_SUPPLY') {
    if (a.supplyOpen === e.open) return { ...a, feedback: `供水已经${e.open ? '打开' : '关闭'}，没有重复操作。` };
    if (e.open && (!a.assembly.inlet.installed || !a.assembly.drain.installed)) return error(a, '已阻止恢复供水：请先完整装配两个组件。', 'supply-before-assembly');
    if (e.open && a.mode !== 'explore' && a.diagnosis === null) return error(a, '供水状态未改变：请先观察并提交诊断，再执行恢复供水。');
    return log({ ...invalidate(a), supplyOpen: e.open, isolatedConfirmed: false, process: { ...a.process, isolated: a.process.isolated || !e.open, repaired: a.process.repaired || (a.caseId === 'supply' && e.open) } }, e.open ? '供水已恢复，观察水位变化；还需要运行复测。' : '供水已关闭。下一次拆卸前请检查供水并排空水箱。');
  }
  if (e.type === 'DRAIN') return log({ ...invalidate(a), drainRemaining: 1.5 }, '正在模拟排水。水位会随时间下降；供水打开时仍可能补水。');
  const component: ComponentId | undefined = 'component' in e ? e.component : undefined;
  if (component) {
    if (e.type === 'REMOVE') {
      if (!a.assembly[component].installed) return { ...a, feedback: '该组件已拆下。' };
      const missing = removalConditions(a);
      if (missing.length) return error(a, `拆卸被阻止，尚需：${missing.join('、')}。`, `unsafe-remove-${component}`);
      if (a.mode !== 'explore' && a.diagnosis === null) return error(a, '请先观察并提交诊断，再进行组件处理。');
      return log({ ...invalidate(a), assembly: { ...a.assembly, [component]: { ...a.assembly[component], installed: false } } }, `${component === 'drain' ? '排水' : '进水'}组件已拆下，供水保持隔离。`);
    }
    if (e.type === 'REPLACE') {
      if (a.assembly[component].installed) return error(a, '模拟更换被阻止：先按条件拆下该组件。');
      if (a.assembly[component].replaced) return { ...a, feedback: '该组件已模拟更换，无需重复。' };
      const correct = CASES[a.caseId].component === component;
      const b: Attempt = { ...invalidate(a), assembly: { ...a.assembly, [component]: { installed: false, replaced: true } }, defects: { ...a.defects, ...(component === 'drain' ? { seal: false } : { inlet: false }) }, process: { ...a.process, repaired: a.process.repaired || correct } };
      return log(b, correct ? '已模拟更换目标组件。请重新装配、恢复供水并复测。' : '该组件已模拟更换，但这不能消除本情境的根因。请重新装配后继续处理。', correct ? 'success' : 'error');
    }
    if (e.type === 'ASSEMBLE') {
      if (a.assembly[component].installed) return { ...a, feedback: '该组件已装配。' };
      return log({ ...invalidate(a), assembly: { ...a.assembly, [component]: { ...a.assembly[component], installed: true } }, process: { ...a.process, assembled: a.process.assembled || (CASES[a.caseId].component === component && a.assembly[component].replaced) } }, '组件已重新装配。若处理完成，请恢复供水并运行复测。', 'success');
    }
  }
  if (e.type === 'RETEST') {
    if (a.retest.phase === 'passed') return { ...a, feedback: '本状态的复测已经通过，不重复计分。' };
    if (!a.assembly.inlet.installed || !a.assembly.drain.installed || !a.supplyOpen) return error({ ...a, retest: { ...emptyRetest(), phase: 'failed', message: '请完整装配并恢复供水后再复测。' } }, '复测未启动：请完整装配并恢复供水。');
    return log({ ...a, retest: { phase: 'filling', elapsed: 0, checks: { assembly: true, supply: true, stable: false, cycle: false }, message: '正在观察补水到工作水位…' } }, '复测已启动，将自动执行稳定性观察与一次排水补水循环。');
  }
  return a;
}
export function scoreAttempt(a: Attempt): Score {
  const c = CASES[a.caseId];
  const check = (label: string, ok: boolean, possible: number, reason: string): ScoreItem => ({ label, earned: ok ? possible : 0, possible, reason: ok ? '已完成' : reason });
  const count = c.evidence.length;
  const evidenceItems = c.evidence.map((id, i) => check(({ water: '查看水位', supply: '检查供水', drain: '观察排水口', inlet: '观察进水组件', overflow: '观察溢流管' })[id], !!a.evidence[id], Math.floor(25 / count) + (i < 25 % count ? 1 : 0), '未记录此项观察'));
  const diagnosisPoints = a.diagnosis === a.caseId ? (a.firstDiagnosis === a.caseId ? 30 : 15) : 0;
  const processItems = c.component ? [
    check('隔离供水', a.process.isolated, 5, '没有关闭供水'),
    check('确认隔离', a.process.confirmed, 5, '关闭后没有检查确认'),
    check('排空水箱', a.process.drained, 5, '没有完成隔离状态下的排水'),
    check('有效处理', a.process.repaired && !a.defects.seal && !a.defects.inlet, 5, '故障组件未有效更换'),
    check('重新装配', a.process.assembled && a.assembly.inlet.installed && a.assembly.drain.installed, 5, '未完整装配修复组件')
  ] : [check('检查供水原因', !!a.evidence.supply, 10, '未检查供水'), check('恢复供水', a.process.repaired && a.supplyOpen, 15, '没有恢复供水')];
  const verifyItems = Object.entries(a.retest.checks).map(([key, ok]) => check(({ assembly: '组件完整装配', supply: '供水恢复', stable: '水位稳定且停止补水', cycle: '排水补水循环正常' })[key]!, ok, 5, '未通过此项复测'));
  const sections = [
    { title: '证据收集', possible: 25, items: evidenceItems },
    { title: '故障诊断', possible: 30, items: [{ label: '基于观察提交诊断', earned: diagnosisPoints, possible: 30, reason: diagnosisPoints === 30 ? '首次诊断正确' : diagnosisPoints === 15 ? '引导重试后答对，保留首次错误记录' : a.diagnosis ? '诊断与本情境根因不符' : '尚未提交诊断' }] },
    { title: '处理流程', possible: 25, items: processItems },
    { title: '复测验证', possible: 20, items: verifyItems }
  ].map(s => ({ ...s, earned: s.items.reduce((sum, item) => sum + item.earned, 0) }));
  const total = sections.reduce((sum, s) => sum + s.earned, 0);
  const reasons: string[] = [];
  if (total < 80) reasons.push('总分未达到本原型的 80 分门槛');
  if (a.diagnosis !== a.caseId) reasons.push('诊断未正确完成');
  if (!a.process.repaired || a.defects.inlet || a.defects.seal) reasons.push('根因尚未有效处理');
  if (!a.assembly.inlet.installed || !a.assembly.drain.installed) reasons.push('组件尚未完整装配');
  if (!a.supplyOpen || a.retest.phase !== 'passed' || !Object.values(a.retest.checks).every(Boolean)) reasons.push('必要的工作状态复测未全部通过');
  if (a.safetyErrors.length) reasons.push(`存在 ${a.safetyErrors.length} 项关键安全错误，本次不能合格`);
  if (a.mode === 'explore') reasons.push('结构认知不计入测评');
  return { total, passed: reasons.length === 0, sections, reasons };
}
