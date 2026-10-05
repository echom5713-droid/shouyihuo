import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CASES, DISCLAIMER, EVIDENCE_LABELS, MODES, PARTS } from '../domain/course';
import { flows, isRetesting, removalConditions, waterLabel } from '../domain/engine';
import type { Attempt, CaseId, ComponentId, Event, PartId } from '../domain/types';
import { getStage } from '../ui/presentation';
import { TankModel } from '../components/TankModel';
import { Icon } from '../components/Icon';

function learningHint(a: Attempt) {
  if (Object.keys(a.evidence).length < 2) return '先查看水位、检查供水。选择部件并记录观察，补充水流位置的证据。';
  if (!a.diagnosis) return '对照已记录的水位、供水和水流路径，选择最能解释现象的原因。';
  if (a.diagnosis !== a.caseId) return '回看诊断解释和证据。引导训练可以重试，但会保留首次诊断情况。';
  if (a.retest.phase === 'passed') return '工作状态验证已通过。可以结束本次训练，在报告中回顾流程与安全记录。';
  if (a.caseId === 'supply') return '此情境无需更换零件。恢复供水后运行复测，验证补水停止和排水后的再补水。';
  if (removalConditions(a).length && !a.process.repaired) return `拆卸前还需要：${removalConditions(a).join('、')}。`;
  if (!a.process.repaired) return `选择${CASES[a.caseId].component === 'drain' ? '排水组件与密封件' : '进水组件'}，依次拆卸、模拟更换、重新装配。`;
  return '完整装配并恢复供水，然后运行复测。需要验证稳定水位与完整排水补水循环。';
}
const phaseKeys = ['observe', 'diagnose', 'process', 'retest'];
const retestLabels = { idle: '待复测', filling: '正在补水', holding: '检查水位稳定', draining: '验证排水', refilling: '验证再次补水', passed: '复测通过', failed: '复测未通过' };

export function Workbench({ attempt: a, dispatch, onFinish, onRestart, persistenceOK }: { persistenceOK: boolean; attempt: Attempt; dispatch: (e: Event) => void; onFinish: () => void; onRestart: () => void }) {
  const [selected, setSelected] = useState<PartId>('inlet');
  const [source, setSource] = useState('list');
  const [cutaway, setCutaway] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [labels, setLabels] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [viewCommand, setViewCommand] = useState<{ type: 'overview' | 'top' | 'focus'; token: number }>({ type: 'overview', token: 0 });
  const [tab, setTab] = useState<'observe' | 'operate'>('observe');
  const [sidebar, setSidebar] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [renderer, setRenderer] = useState<'webgl' | 'fallback' | 'pending'>('pending');
  const [diagnosis, setDiagnosis] = useState<CaseId | ''>(a.diagnosis ?? '');
  const workspaceRef = useRef<HTMLElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const part = PARTS.find(p => p.id === selected)!;
  // The selected part is the only operation target; view state never enters the reducer.
  const component: ComponentId | null = selected === 'drain' || selected === 'inlet' ? selected : null;
  const f = flows(a), busy = isRetesting(a), c = CASES[a.caseId], stage = getStage(a);
  const diagnosisLocked = a.mode === 'assessment' && a.diagnosis !== null;
  const evidenceCount = c.evidence.filter(id => a.evidence[id]).length;
  const completedStages = [evidenceCount >= 2, a.diagnosis === a.caseId, a.process.repaired && !a.defects.seal && !a.defects.inlet && a.assembly.inlet.installed && a.assembly.drain.installed && a.supplyOpen, stage.complete];
  const select = (id: PartId, origin = 'list') => { setSelected(id); setSource(origin); };
  const camera = (type: 'overview' | 'top' | 'focus') => {
    setViewCommand(v => ({ type, token: v.token + 1 }));
    if (type === 'overview') setResetToken(n => n + 1);
  };
  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    expandRef.current?.focus();
    function keyboard(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false);
      if (e.key === 'Tab') {
        const nodes = [...(workspaceRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), summary, [tabindex="0"]') ?? [])].filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
        if (e.shiftKey && document.activeElement === nodes[0]) { e.preventDefault(); nodes.at(-1)?.focus(); }
        else if (!e.shiftKey && document.activeElement === nodes.at(-1)) { e.preventDefault(); nodes[0]?.focus(); }
      }
    }
    document.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = old; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, [expanded]);
  const tabKeyboard = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 'observe' : e.key === 'End' ? 'operate' : tab === 'observe' ? 'operate' : 'observe';
    setTab(next); document.getElementById(`tab-${next}`)?.focus();
  };
  const operationButton = (active: boolean) => `button${active && stage.index === 2 ? ' primary' : ''}`;
  return <main className={`lab-page ${expanded ? 'workspace-expanded' : ''}`}>
    <div className="lab-titlebar" inert={expanded}>
      <div className="lab-title-left"><a href="#/" className="back-button" aria-label="返回课程"><Icon name="arrowLeft" /></a><div><div className="lab-eyebrow"><span>{MODES[a.mode]}</span><span className="muted">/ {a.mode === 'explore' ? '正常工作模型 · 不计分' : `情境 ${c.index}`}</span></div><h1>{a.mode === 'explore' ? '认识水箱的每一个部件' : c.symptom}</h1></div></div>
      <div className="lab-title-actions"><button className="button small-button" onClick={onRestart}>重新开始</button>{a.mode !== 'explore' && <button className="button small-button" onClick={onFinish} disabled={busy}>结束并查看报告<Icon name="arrow" size={16} /></button>}</div>
    </div>
    <div className="workflow-bar" inert={expanded}>
      {a.mode !== 'explore' && <ol className="phase-indicator" data-testid="phase-indicator" data-phase={phaseKeys[stage.index]} aria-label="当前实训阶段">{['观察', '诊断', '处理', '复测'].map((s, i) => { const wrong = i === 1 && a.diagnosis !== null && a.diagnosis !== a.caseId; return <li key={s} className={wrong ? 'error' : i === stage.index ? 'current' : completedStages[i] ? 'done' : ''} aria-current={i === stage.index ? 'step' : undefined} aria-label={wrong ? '诊断：答案不正确' : `${s}：${completedStages[i] ? '已完成' : i === stage.index ? '当前阶段' : '未完成'}`}><span>{wrong ? <Icon name="close" size={14} /> : completedStages[i] ? <Icon name="check" size={14} /> : `0${i + 1}`}</span>{s}{wrong && <span className="sr-only">答案不正确</span>}</li>; })}</ol>}
      <div className="current-task"><strong>{stage.label}</strong><span>{stage.description}</span></div>
      <button className="mobile-sidebar button small-button" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><Icon name="menu" />学习目标与部件列表</button>
    </div>
    <div className={`workbench ${sidebar ? 'sidebar-open' : ''}`}>
      <aside className="lab-sidebar" inert={expanded}>
        <div className="sidebar-task"><span className="eyebrow">{a.mode === 'explore' ? '自由探索' : '本次任务'}</span><p>{a.mode === 'explore' ? '选择部件了解功能，切换视图观察连接关系。可以演示正常进水和排水。' : c.task}</p></div>
        <div className="sidebar-section"><div className="sidebar-section-title"><h2>部件目录</h2><span>09</span></div><div className="part-list">{PARTS.map(p => <button key={p.id} data-testid={`part-${p.id}`} aria-pressed={selected === p.id} className={selected === p.id ? 'selected' : ''} onClick={() => select(p.id)}><span className="part-number">{p.number}</span><span>{p.name}</span>{selected === p.id && <Icon name="chevron" size={14} />}</button>)}</div></div>
        <div className="sidebar-section evidence-section"><div className="sidebar-section-title"><h2>已收集证据</h2><span data-testid="evidence-count">{a.mode === 'guided' ? `${evidenceCount}/${c.evidence.length}` : Object.keys(a.evidence).length}</span></div>{Object.values(a.evidence).length ? <ul>{Object.values(a.evidence).map(e => <li key={e!.id}><Icon name="check" size={14} /><div><strong>{EVIDENCE_LABELS[e!.id]}</strong><p>{e!.text}</p></div></li>)}</ul> : <p className="empty-evidence">记录部件观察与检查结果后，证据会出现在这里。</p>}</div>
      </aside>
      <section ref={workspaceRef} className="model-workspace" aria-label={expanded ? '放大的三维操作区' : '三维操作区'}>
        <div className="model-toolbar">
          <div className="camera-tools"><button disabled={renderer !== 'webgl'} onClick={() => camera('overview')} title="复位视角"><Icon name="rotate" /><span>整体视角</span></button><button disabled={renderer !== 'webgl'} onClick={() => camera('top')} title="只改变镜头，内部结构需打开箱盖"><Icon name="cube" /><span>俯视内部</span></button><button disabled={renderer !== 'webgl'} onClick={() => camera('focus')}><Icon name="focus" /><span>聚焦选中部件</span></button><button ref={expandRef} className="expand-workspace" aria-pressed={expanded} onClick={() => setExpanded(!expanded)}><Icon name={expanded ? 'close' : 'expand'} /><span>{expanded ? '退出放大' : '放大工作区'}</span></button></div>
          <div className="display-tools"><button aria-pressed={cutaway} onClick={() => setCutaway(!cutaway)}><Icon name="cut" /><span>结构剖视</span></button><button aria-pressed={exploded} onClick={() => setExploded(!exploded)}><Icon name="expand" /><span>爆炸视图</span></button><button aria-pressed={labels} onClick={() => setLabels(!labels)}><Icon name="tag" /><span>部件标签</span></button><span className="view-only">仅改变观察视图</span></div>
        </div>
        <div className="model-stage"><div className="stage-caption"><span className="stage-badge">3D 实训</span><span>{exploded ? '部件分离展示 · 未执行拆装' : cutaway ? '前壁已隐藏 · 可观察内部' : '完整外观'}</span></div><TankModel attempt={a} selected={selected} onSelect={select} cutaway={cutaway} exploded={exploded} labels={labels} resetToken={resetToken} viewCommand={viewCommand} onRendererChange={setRenderer} /><div className="stage-bottom"><span><Icon name="rotate" size={15} /><span className="mouse-help">拖动旋转 · 滚轮缩放</span><span className="touch-help">单指滚页 · 双指旋转缩放</span></span><button onClick={() => dispatch({ type: 'TOGGLE_LID' })}>{a.lidOpen ? '放回箱盖' : '打开箱盖'}<Icon name="chevron" size={14} /></button></div></div>
        {renderer === 'fallback' && <p className="renderer-note">二维交互模式：镜头工具需 WebGL，规则训练仍可使用。</p>}
        {expanded && <div className="expanded-selection"><span>选中：<strong>{part.name}</strong> · {part.description}</span><button className="button small-button" onClick={() => dispatch({ type: 'OBSERVE', part: selected })}>记录部件观察</button><span className="small">Esc 退出放大 · 进度保持</span></div>}
        <div className="model-readings"><div><span><Icon name="drop" size={15} />供水状态</span><strong data-testid="supply-reading">{a.supplyOpen ? '供水打开' : '供水关闭'}</strong></div><div><span>教学近似水位</span><strong data-testid="water-reading">{waterLabel(a)}</strong></div><div><span>水流观察</span><strong>{f.overflowing ? '可见溢流' : f.draining ? '正在排水' : f.leaking ? '持续流出' : f.incoming ? '正在补水' : '无持续水流'}</strong></div></div>
        <details className="operation-log"><summary><Icon name="history" size={16} />操作日志<span>{a.logs.length} 条{a.safetyErrors.length ? ` · ${a.safetyErrors.length} 项安全错误` : ''}</span><Icon name="chevron" size={14} /></summary><ol>{[...a.logs].reverse().map(l => <li className={l.kind} key={l.step}><span>{String(l.step).padStart(2, '0')}</span>{l.text}</li>)}</ol></details>
      </section>
      <aside className="action-panel" inert={expanded}>
        <div className="panel-tabs" role="tablist" aria-label="操作面板">{(['observe', 'operate'] as const).map(t => <button key={t} id={`tab-${t}`} role="tab" aria-controls="action-content" tabIndex={tab === t ? 0 : -1} aria-selected={tab === t} onKeyDown={tabKeyboard} onClick={() => setTab(t)}>{t === 'observe' ? '观察与诊断' : '模拟处理'}</button>)}</div>
        {a.safetyErrors.length > 0 && <details className="persistent-error" data-testid="persistent-safety-error"><summary><Icon name="shield" size={17} /><strong>{a.safetyErrors.length} 项关键安全错误 · 本次不能合格</strong></summary><ul>{a.safetyErrors.map(e => <li key={e.code}>{e.text}</li>)}</ul></details>}
        <div className="panel-scroll-hint">此面板可滚动查看诊断、处理与反馈</div>
        <div className="panel-scroll" id="action-content" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          <div className="part-detail" data-testid="part-detail" data-selection-source={source}><div className="part-heading"><span className="part-index">{part.number}</span><div><span className="eyebrow">当前选中部件</span><h2>{part.name}</h2></div></div><p>{part.description}</p><button className={`button observe-button ${stage.index === 0 && a.mode !== 'explore' ? 'primary' : ''}`} onClick={() => dispatch({ type: 'OBSERVE', part: selected })}><Icon name="book" size={16} />记录部件观察</button></div>
          <div className="quick-checks"><button className="button" onClick={() => dispatch({ type: 'CHECK_WATER' })}>查看水位</button><button className="button" onClick={() => dispatch({ type: 'CHECK_SUPPLY' })}>检查供水</button></div>
          {tab === 'observe' ? <>
            {a.mode !== 'explore' ? <div className="diagnosis-section"><div className="panel-heading"><h3>选择诊断</h3><span>依据已收集证据</span></div><label className="sr-only" htmlFor="diagnosis">选择诊断</label><select id="diagnosis" value={diagnosis} disabled={diagnosisLocked} onChange={e => setDiagnosis(e.target.value as CaseId)}><option value="" disabled>选择最符合证据的原因</option>{Object.values(CASES).map(item => <option value={item.id} key={item.id}>{item.diagnosis}</option>)}</select><button className={`button ${stage.index === 1 ? 'primary' : ''} full-width`} disabled={!diagnosis || evidenceCount < 2 || diagnosisLocked} onClick={() => { if (diagnosis) dispatch({ type: 'DIAGNOSE', diagnosis }); }}>{diagnosisLocked ? '首次诊断已锁定' : '提交诊断'}</button><p className="small muted">{diagnosisLocked ? '独立测评保留首次诊断，重复提交不会刷分。' : evidenceCount < 2 ? '至少完成 2 项适用观察后可提交。' : a.mode === 'assessment' ? '已可提交。独立测评只计首次诊断。' : '已可提交。允许重试，重试答对计 15 分。'}</p>{a.diagnosis && <div className={`diagnosis-answer ${a.diagnosis !== a.caseId ? 'answer-wrong' : ''}`}><strong>{a.diagnosis === a.caseId ? '诊断正确' : '诊断不正确 · 回看证据'}</strong><p>{c.explanation}</p><button className="text-link" onClick={() => setTab('operate')}>进入模拟处理<Icon name="arrow" size={14} /></button></div>}</div> : <div className="explore-note"><Icon name="info" /><p>正常工作模型，不产生测评成绩或完成证明。</p><button className="text-link" onClick={() => setTab('operate')}>演示正常工作<Icon name="arrow" size={14} /></button></div>}
          </> : <>
            <div className="operation-section"><h3>供水与排水</h3><div className="operation-grid"><button className={operationButton(!a.supplyOpen && a.process.repaired)} disabled={busy} onClick={() => dispatch({ type: 'SET_SUPPLY', open: !a.supplyOpen })}>{a.supplyOpen ? '关闭供水' : '恢复供水'}</button><button className="button" disabled={busy} onClick={() => dispatch({ type: 'DRAIN' })}>模拟排水</button></div><div className="condition-strip"><span>{a.supplyOpen ? '供水未隔离' : a.isolatedConfirmed ? '已确认隔离' : '关水后待检查'}</span><span>{a.lidOpen ? '箱盖已打开' : '箱盖未打开'}</span></div></div>
            <div className="operation-section"><h3>组件处理</h3><label htmlFor="component" className="small target-label">操作目标与当前选中部件同步</label><select id="component" aria-label="操作组件" value={component ?? ''} onChange={e => select(e.target.value as PartId)}><option value="" disabled>选择可拆装组件</option><option value="drain">排水组件与密封件</option><option value="inlet">进水组件</option></select>{component ? <><div className="assembly-status"><Icon name={a.assembly[component].installed ? 'check' : 'info'} size={15} />{a.assembly[component].installed ? '已装配' : '已拆下'}{a.assembly[component].replaced ? ' · 已模拟更换' : ''}</div><button className={`${operationButton(removalConditions(a).length === 0)} full-width`} disabled={busy || !a.assembly[component].installed} onClick={() => dispatch({ type: 'REMOVE', component })}>拆卸{component === 'drain' ? '排水组件' : '进水组件'}</button><p className="operation-conditions">{!a.assembly[component].installed ? '组件已拆下，可模拟更换或重新装配。' : removalConditions(a).length ? `未满足：${removalConditions(a).join('、')}。尝试拆卸会被阻止并记入安全错误。` : a.mode !== 'explore' && !a.diagnosis ? '请先提交诊断，再处理组件。' : '拆卸条件已满足。'}</p><div className="operation-grid"><button className={operationButton(!a.assembly[component].installed && !a.assembly[component].replaced)} disabled={busy || a.assembly[component].installed || a.assembly[component].replaced} onClick={() => dispatch({ type: 'REPLACE', component })}>模拟更换</button><button className={operationButton(!a.assembly[component].installed && a.assembly[component].replaced)} disabled={busy || a.assembly[component].installed} onClick={() => dispatch({ type: 'ASSEMBLE', component })}>重新装配</button></div>{a.assembly[component].installed && <p className="small muted">更换与装配操作需先拆下组件。</p>}</> : <p className="small muted">当前部件不提供拆装。可在上方选择进水或排水组件作为操作目标。</p>}</div>
          </>}
          <div className={`feedback ${['safety', 'error'].includes(a.logs.at(-1)?.kind ?? '') ? 'feedback-error' : ''}`} role="status" aria-live="polite" aria-atomic="true"><Icon name="info" size={17} /><p>{a.feedback}</p></div>
          {a.mode === 'guided' && <div className="learning-hint"><span className="eyebrow">学习提示 · 本地课程规则</span><p>{learningHint(a)}</p></div>}
        </div>
        <div className="retest-panel"><div className="persistent-safety"><Icon name="shield" size={17} /><span>拆卸前：关水 → 检查确认 → 排空 → 开盖。观察与检查无需先关水。</span></div><div className="retest-heading"><span>{a.mode === 'explore' ? '正常工作演示' : '工作状态验证'}</span><strong className={a.retest.phase === 'failed' ? 'error-text' : ''}>{retestLabels[a.retest.phase]}</strong></div><button className={`button ${stage.index === 3 && !stage.complete ? 'primary' : ''} full-width`} disabled={busy || a.retest.phase === 'passed'} onClick={() => dispatch({ type: 'RETEST' })}><Icon name="play" size={16} />{busy ? '正在执行复测…' : a.retest.phase === 'passed' ? '复测已通过' : '运行复测'}</button><p className="small" data-testid="retest-message" aria-live="polite">{a.retest.message}{a.retest.phase === 'passed' && ' 工作状态通过，最终判定以报告为准。'}</p>{busy && <p className="small muted">复测期间不能改变供水或拆装；仍可观察。</p>}</div>
      </aside>
    </div>
    <footer className="lab-footer"><span><Icon name="info" size={15} />{DISCLAIMER}</span><span>{persistenceOK ? '进度自动保存' : '进度暂未保存'} · 水位与水流为教学近似</span></footer>
  </main>;
}
