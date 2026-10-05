import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CASES, DISCLAIMER, EVIDENCE_LABELS, MODES, PARTS } from '../domain/course';
import { flows, isRetesting, removalConditions, waterLabel } from '../domain/engine';
import type { Attempt, CaseId, ComponentId, Event, PartId } from '../domain/types';
import { getStage } from '../ui/presentation';
import { TankModel, type CameraCommand, type CameraView } from '../components/TankModel';
import { Icon } from '../components/Icon';
import { useLocale } from '../i18n';

function learningHint(a: Attempt, t: (text: string) => string) {
  if (Object.keys(a.evidence).length < 2) return t('先查看水位、检查供水。选择部件并记录观察，补充水流位置的证据。');
  if (!a.diagnosis) return t('对照已记录的水位、供水和水流路径，选择最能解释现象的原因。');
  if (a.diagnosis !== a.caseId) return t('回看诊断解释和证据。引导训练可以重试，但会保留首次诊断情况。');
  if (a.retest.phase === 'passed') return t('工作状态验证已通过。可以结束本次训练，在报告中回顾流程与安全记录。');
  if (a.caseId === 'supply') return t('此情境无需更换零件。恢复供水后运行复测，验证补水停止和排水后的再补水。');
  if (removalConditions(a).length && !a.process.repaired) return `${t('拆卸前还需要：')}${removalConditions(a).map(t).join(t('、'))}${t('。')}`;
  if (!a.process.repaired) return `${t('选择')}${CASES[a.caseId].component === 'drain' ? t('排水组件与密封件') : t('进水组件')}${t('，依次拆卸、模拟更换、重新装配。')}`;
  return t('完整装配并恢复供水，然后运行复测。需要验证稳定水位与完整排水补水循环。');
}
const phaseKeys = ['observe', 'diagnose', 'process', 'retest'];
const retestLabels = { idle: '待复测', filling: '正在补水', holding: '检查水位稳定', draining: '验证排水', refilling: '验证再次补水', passed: '复测通过', failed: '复测未通过' };

export function Workbench({ attempt: a, dispatch, onFinish, onRestart, persistenceOK }: { persistenceOK: boolean; attempt: Attempt; dispatch: (e: Event) => void; onFinish: () => void; onRestart: () => void }) {
  const { locale, t } = useLocale();
  const [selected, setSelected] = useState<PartId>('inlet');
  const [source, setSource] = useState('list');
  const [cutaway, setCutaway] = useState(true);
  const [exploded, setExploded] = useState(false);
  const [labels, setLabels] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [viewCommand, setViewCommand] = useState<CameraCommand>({ type: 'overview', token: 0 });
  const [tab, setTab] = useState<'observe' | 'operate'>('observe');
  const [sidebar, setSidebar] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [renderer, setRenderer] = useState<'webgl' | 'fallback' | 'pending'>('pending');
  const [diagnosis, setDiagnosis] = useState<CaseId | ''>(a.diagnosis ?? '');
  const workspaceRef = useRef<HTMLElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const part = PARTS.find(p => p.id === selected)!;
  const description = t(part.description);
  const sentenceEnd = description.indexOf(locale === 'en' ? '. ' : '。');
  const descriptionLead = sentenceEnd < 0 ? description : description.slice(0, sentenceEnd + 1);
  const descriptionNote = sentenceEnd < 0 ? '' : description.slice(sentenceEnd + 1).trim();
  // The selected part is the only operation target; view state never enters the reducer.
  const component: ComponentId | null = selected === 'drain' || selected === 'inlet' ? selected : null;
  const f = flows(a), busy = isRetesting(a), c = CASES[a.caseId], stage = getStage(a);
  const diagnosisLocked = a.mode === 'assessment' && a.diagnosis !== null;
  const evidenceCount = c.evidence.filter(id => a.evidence[id]).length;
  const completedStages = [evidenceCount >= 2, a.diagnosis === a.caseId, a.process.repaired && !a.defects.seal && !a.defects.inlet && a.assembly.inlet.installed && a.assembly.drain.installed && a.supplyOpen, stage.complete];
  const select = (id: PartId, origin = 'list') => { setSelected(id); setSource(origin); };
  const camera = (type: CameraView) => {
    setViewCommand(v => ({ type, token: v.token + 1 }));
    if (type === 'overview') setResetToken(n => n + 1);
  };
  const focus = (id: PartId) => { select(id, 'model'); setViewCommand(v => ({ type: 'focus', part: id, token: v.token + 1 })); };
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
      <div className="lab-title-left"><a href="#/" className="back-button" aria-label={t("返回课程")}><Icon name="arrowLeft" /></a><div><div className="lab-eyebrow"><span>{t(MODES[a.mode])}</span><span className="muted">/ {a.mode === 'explore' ? t('正常工作模型 · 不计分') : `${t('情境')} ${c.index}`}</span></div><h1>{a.mode === 'explore' ? t('认识水箱的每一个部件') : t(c.symptom)}</h1></div></div>
      <div className="lab-title-actions"><button className="button small-button" onClick={onRestart}>{t("重新开始")}</button>{a.mode !== 'explore' && <button className="button small-button" onClick={onFinish} disabled={busy}>{t("结束并查看报告")}<Icon name="arrow" size={16} /></button>}</div>
    </div>
    <div className="workflow-bar" inert={expanded}>
      {a.mode !== 'explore' && <ol className="phase-indicator" data-testid="phase-indicator" data-phase={phaseKeys[stage.index]} aria-label={t("当前实训阶段")}>{[t('观察'), t('诊断'), t('处理'), t('复测')].map((s, i) => { const wrong = i === 1 && a.diagnosis !== null && a.diagnosis !== a.caseId; return <li key={s} className={wrong ? 'error' : i === stage.index ? 'current' : completedStages[i] ? 'done' : ''} aria-current={i === stage.index ? 'step' : undefined} aria-label={wrong ? t('诊断：答案不正确') : `${s}：${completedStages[i] ? t('已完成') : i === stage.index ? t('当前阶段') : t('未完成')}`}><span>{wrong ? <Icon name="close" size={14} /> : completedStages[i] ? <Icon name="check" size={14} /> : `0${i + 1}`}</span>{s}{wrong && <span className="sr-only">{t("答案不正确")}</span>}</li>; })}</ol>}
      <div className="current-task"><strong>{t(stage.label)}</strong><span>{t(stage.description)}</span></div>
      <button className="mobile-sidebar button small-button" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}><Icon name="menu" />{t("学习目标与部件列表")}</button>
    </div>
    <div className={`workbench ${sidebar ? 'sidebar-open' : ''}`}>
      <aside className="lab-sidebar" inert={expanded}>
        <div className="sidebar-task"><span className="eyebrow">{a.mode === 'explore' ? t('自由探索') : t('本次任务')}</span><p>{a.mode === 'explore' ? t('选择部件了解功能，切换视图观察连接关系。可以演示正常进水和排水。') : t(c.task)}</p></div>
        <div className="sidebar-section"><div className="sidebar-section-title"><h2>{t("部件目录")}</h2><span>09</span></div><div className="part-list">{PARTS.map(p => <button key={p.id} data-testid={`part-${p.id}`} aria-pressed={selected === p.id} className={selected === p.id ? 'selected' : ''} onClick={() => select(p.id)}><span className="part-number">{p.number}</span><span>{t(p.name)}</span>{selected === p.id && <Icon name="chevron" size={14} />}</button>)}</div></div>
        <div className="sidebar-section evidence-section"><div className="sidebar-section-title"><h2>{t("已收集证据")}</h2><span data-testid="evidence-count">{a.mode === 'guided' ? `${evidenceCount}/${c.evidence.length}` : Object.keys(a.evidence).length}</span></div>{Object.values(a.evidence).length ? <ul>{Object.values(a.evidence).map(e => <li key={e!.id}><Icon name="check" size={14} /><div><strong>{t(EVIDENCE_LABELS[e!.id])}</strong><p>{t(e!.text)}</p></div></li>)}</ul> : <p className="empty-evidence">{t("记录部件观察与检查结果后，证据会出现在这里。")}</p>}</div>
      </aside>
      <section ref={workspaceRef} className="model-workspace" aria-label={expanded ? t('放大的三维操作区') : t('三维操作区')}>
        <div className="model-toolbar" aria-label={t("观察工具")}>
          <div className="camera-tools"><button disabled={renderer !== 'webgl'} onClick={() => camera('overview')} title={t("复位视角")}><Icon name="rotate" /><span>{t("整体视角")}</span></button><button disabled={renderer !== 'webgl'} onClick={() => camera('top')} title={t("只改变镜头，内部结构需打开箱盖")}><Icon name="cube" /><span>{t("俯视内部")}</span></button><button disabled={renderer !== 'webgl'} onClick={() => camera('focus')}><Icon name="focus" /><span>{t("聚焦选中部件")}</span></button><button ref={expandRef} className="expand-workspace" title={expanded ? t('退出放大') : t('放大工作区')} aria-pressed={expanded} onClick={() => setExpanded(!expanded)}><Icon name={expanded ? 'close' : 'expand'} /><span>{expanded ? t('退出放大') : t('放大工作区')}</span></button></div>
          <div className="display-tools"><button aria-pressed={cutaway} onClick={() => setCutaway(!cutaway)}><Icon name="cut" /><span>{t("结构剖视")}</span></button><button aria-pressed={exploded} onClick={() => setExploded(!exploded)}><Icon name="expand" /><span>{t("爆炸视图")}</span></button><button aria-pressed={labels} onClick={() => setLabels(!labels)}><Icon name="tag" /><span>{t("部件标签")}</span></button><span className="view-only">{t("仅改变观察视图")}</span></div>
        </div>
        <div className="model-stage"><div className="stage-caption"><span className="stage-badge"><span className="status-dot" />{t("3D 实训")}</span><span>{exploded ? t('部件分离展示 · 未执行拆装') : cutaway ? t('前壁已隐藏 · 可观察内部') : t('完整外观')}</span></div><TankModel attempt={a} selected={selected} onSelect={select} onFocus={focus} cutaway={cutaway} exploded={exploded} labels={labels} resetToken={resetToken} viewCommand={viewCommand} onRendererChange={setRenderer} /><div className="stage-bottom"><span><Icon name="rotate" size={15} /><span className="mouse-help">{t("拖动旋转 · 滚轮缩放 · 双击聚焦")}</span><span className="touch-help">{t("单指滚页 · 双指旋转缩放")}</span></span><button onClick={() => dispatch({ type: 'TOGGLE_LID' })}>{a.lidOpen ? t('放回箱盖') : t('打开箱盖')}<Icon name="chevron" size={14} /></button></div></div>
        {renderer === 'fallback' && <p className="renderer-note">{t("二维交互模式：镜头工具需 WebGL，规则训练仍可使用。")}</p>}
        {expanded && <div className="expanded-selection"><span>{t("选中：")}<strong>{t(part.name)}</strong> · {t(part.description)}</span><button className="button small-button" onClick={() => dispatch({ type: 'OBSERVE', part: selected })}>{t("记录部件观察")}</button><span className="small">{t("Esc 退出放大 · 进度保持")}</span></div>}
        <div className="model-readings"><div data-state={a.supplyOpen ? 'on' : 'off'}><span><Icon name="drop" size={15} />{t("供水状态")}</span><strong data-testid="supply-reading">{a.supplyOpen ? t('供水打开') : t('供水关闭')}</strong></div><div><span>{t("教学近似水位")}</span><strong data-testid="water-reading">{t(waterLabel(a))}</strong></div><div><span>{t("水流观察")}</span><strong>{f.overflowing ? t('可见溢流') : f.draining ? t('正在排水') : f.leaking ? t('持续流出') : f.incoming ? t('正在补水') : t('无持续水流')}</strong></div></div>
        <details className="operation-log"><summary><Icon name="history" size={16} />{t("操作日志")}<span>{a.logs.length} {locale === 'en' && a.logs.length === 1 ? 'entry' : t('条')}{a.safetyErrors.length ? ` · ${a.safetyErrors.length} ${locale === 'en' && a.safetyErrors.length === 1 ? 'safety error' : t('项安全错误')}` : ''}</span><Icon name="chevron" size={14} /></summary><ol>{[...a.logs].reverse().map(l => <li className={l.kind} key={l.step}><span>{String(l.step).padStart(2, '0')}</span>{t(l.text)}</li>)}</ol></details>
      </section>
      <aside className="action-panel" inert={expanded}>
        <div className="panel-tabs" role="tablist" aria-label={t("操作面板")}>{(['observe', 'operate'] as const).map(panelTab => <button key={panelTab} id={`tab-${panelTab}`} role="tab" aria-controls="action-content" tabIndex={tab === panelTab ? 0 : -1} aria-selected={tab === panelTab} onKeyDown={tabKeyboard} onClick={() => setTab(panelTab)}>{panelTab === 'observe' ? t('观察与诊断') : t('模拟处理')}</button>)}</div>
        {a.safetyErrors.length > 0 && <details className="persistent-error" data-testid="persistent-safety-error"><summary><Icon name="shield" size={17} /><strong>{a.safetyErrors.length} {locale === 'en' && a.safetyErrors.length === 1 ? 'critical safety error · This attempt cannot pass' : t('项关键安全错误 · 本次不能合格')}</strong></summary><ul>{a.safetyErrors.map(e => <li key={e.code}>{t(e.text)}</li>)}</ul></details>}
        <div className="panel-scroll-hint">{t("此面板可滚动查看诊断、处理与反馈")}</div>
        <div className="panel-scroll" id="action-content" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          <div className="part-detail" data-testid="part-detail" data-selection-source={source}><div className="part-heading"><span className="part-index" aria-hidden="true">{part.number}</span><div><span className="eyebrow">{t("当前选中部件")}</span><h2>{t(part.name)}</h2></div></div><button className={`button observe-button ${stage.index === 0 && a.mode !== 'explore' ? 'primary' : ''}`} onClick={() => dispatch({ type: 'OBSERVE', part: selected })}><Icon name="book" size={16} />{t("记录部件观察")}</button></div>
          <div className="quick-checks"><button className="button" onClick={() => dispatch({ type: 'CHECK_WATER' })}>{t("查看水位")}</button><button className="button" onClick={() => dispatch({ type: 'CHECK_SUPPLY' })}>{t("检查供水")}</button></div>
          <div className="component-description"><p className="selected-part-description">{descriptionLead}</p>{descriptionNote && <details key={selected} className="component-notes" open={a.mode === 'explore' || undefined}><summary>{t("模型说明")}<Icon name="chevron" size={13} /></summary><p>{descriptionNote}</p></details>}</div>
          {tab === 'observe' ? <>
            {a.mode !== 'explore' ? <div className="diagnosis-section"><div className="panel-heading"><h3>{t("选择诊断")}</h3><span>{t("依据已收集证据")}</span></div><label className="sr-only" htmlFor="diagnosis">{t("选择诊断")}</label><select id="diagnosis" value={diagnosis} disabled={diagnosisLocked} onChange={e => setDiagnosis(e.target.value as CaseId)}><option value="" disabled>{t("选择最符合证据的原因")}</option>{Object.values(CASES).map(item => <option value={item.id} key={item.id}>{t(item.diagnosis)}</option>)}</select><button className={`button ${stage.index === 1 ? 'primary' : ''} full-width`} disabled={!diagnosis || evidenceCount < 2 || diagnosisLocked} onClick={() => { if (diagnosis) dispatch({ type: 'DIAGNOSE', diagnosis }); }}>{diagnosisLocked ? t('首次诊断已锁定') : t('提交诊断')}</button><p className="small muted">{diagnosisLocked ? t('独立测评保留首次诊断，重复提交不会刷分。') : evidenceCount < 2 ? t('至少完成 2 项适用观察后可提交。') : a.mode === 'assessment' ? t('已可提交。独立测评只计首次诊断。') : t('已可提交。允许重试，重试答对计 15 分。')}</p>{a.diagnosis && <div className={`diagnosis-answer ${a.diagnosis !== a.caseId ? 'answer-wrong' : ''}`}><strong>{a.diagnosis === a.caseId ? t('诊断正确') : t('诊断不正确 · 回看证据')}</strong><p>{t(c.explanation)}</p><button className="text-link" onClick={() => setTab('operate')}>{t("进入模拟处理")}<Icon name="arrow" size={14} /></button></div>}</div> : <div className="explore-note"><Icon name="info" /><p>{t("正常工作模型，不产生测评成绩或完成证明。")}</p><button className="text-link" onClick={() => setTab('operate')}>{t("演示正常工作")}<Icon name="arrow" size={14} /></button></div>}
          </> : <>
            <div className="operation-section"><h3>{t("供水与排水")}</h3><div className="operation-grid"><button className={operationButton(!a.supplyOpen && a.process.repaired)} disabled={busy} onClick={() => dispatch({ type: 'SET_SUPPLY', open: !a.supplyOpen })}>{a.supplyOpen ? t('关闭供水') : t('恢复供水')}</button><button className="button" disabled={busy} onClick={() => dispatch({ type: 'DRAIN' })}>{t("模拟排水")}</button></div><div className="condition-strip"><span>{a.supplyOpen ? t('供水未隔离') : a.isolatedConfirmed ? t('已确认隔离') : t('关水后待检查')}</span><span>{a.lidOpen ? t('箱盖已打开') : t('箱盖未打开')}</span></div></div>
            <div className="operation-section"><h3>{t("组件处理")}</h3><label htmlFor="component" className="small target-label">{t("操作目标与当前选中部件同步")}</label><select id="component" aria-label={t("操作组件")} value={component ?? ''} onChange={e => select(e.target.value as PartId)}><option value="" disabled>{t("选择可拆装组件")}</option><option value="drain">{t("排水组件与密封件")}</option><option value="inlet">{t("进水组件")}</option></select>{component ? <><div className="assembly-status"><Icon name={a.assembly[component].installed ? 'check' : 'info'} size={15} />{a.assembly[component].installed ? t('已装配') : t('已拆下')}{a.assembly[component].replaced ? t(' · 已模拟更换') : ''}</div><button className={`${operationButton(removalConditions(a).length === 0)} full-width`} disabled={busy || !a.assembly[component].installed} onClick={() => dispatch({ type: 'REMOVE', component })}>{component === 'drain' ? t('拆卸排水组件') : t('拆卸进水组件')}</button><p className="operation-conditions">{!a.assembly[component].installed ? t('组件已拆下，可模拟更换或重新装配。') : removalConditions(a).length ? `${t('未满足：')}${removalConditions(a).map(t).join(t('、'))}${t('。尝试拆卸会被阻止并记入安全错误。')}` : a.mode !== 'explore' && !a.diagnosis ? t('请先提交诊断，再处理组件。') : t('拆卸条件已满足。')}</p><div className="operation-grid"><button className={operationButton(!a.assembly[component].installed && !a.assembly[component].replaced)} disabled={busy || a.assembly[component].installed || a.assembly[component].replaced} onClick={() => dispatch({ type: 'REPLACE', component })}>{t("模拟更换")}</button><button className={operationButton(!a.assembly[component].installed && a.assembly[component].replaced)} disabled={busy || a.assembly[component].installed} onClick={() => dispatch({ type: 'ASSEMBLE', component })}>{t("重新装配")}</button></div>{a.assembly[component].installed && <p className="small muted">{t("更换与装配操作需先拆下组件。")}</p>}</> : <p className="small muted">{t("当前部件不提供拆装。可在上方选择进水或排水组件作为操作目标。")}</p>}</div>
          </>}
          <div className={`feedback ${['safety', 'error'].includes(a.logs.at(-1)?.kind ?? '') ? 'feedback-error' : ''}`} role="status" aria-live="polite" aria-atomic="true"><Icon name="info" size={17} /><p>{t(a.feedback)}</p></div>
          {a.mode === 'guided' && <div className="learning-hint"><span className="eyebrow">{t("学习提示 · 本地课程规则")}</span><p>{learningHint(a, t)}</p></div>}
        </div>
        <div className={`retest-panel ${stage.index === 3 ? 'retest-current' : ''}`}><div className="persistent-safety"><Icon name="shield" size={17} /><span>{t("拆卸前：关水 → 检查确认 → 排空 → 开盖。观察与检查无需先关水。")}</span></div><div className="retest-heading"><span>{a.mode === 'explore' ? t('正常工作演示') : t('工作状态验证')}</span><strong className={a.retest.phase === 'failed' ? 'error-text' : ''}>{t(retestLabels[a.retest.phase])}</strong></div><button className={`button ${stage.index === 3 && !stage.complete ? 'primary' : ''} full-width`} disabled={busy || a.retest.phase === 'passed'} onClick={() => dispatch({ type: 'RETEST' })}><Icon name="play" size={16} />{busy ? t('正在执行复测…') : a.retest.phase === 'passed' ? t('复测已通过') : t('运行复测')}</button><p className="small" data-testid="retest-message" aria-live="polite">{t(a.retest.message)}{a.retest.phase === 'passed' && t(' 工作状态通过，最终判定以报告为准。')}</p>{busy && <p className="small muted">{t("复测期间不能改变供水或拆装；仍可观察。")}</p>}</div>
      </aside>
    </div>
    <footer className="lab-footer"><span><Icon name="info" size={15} />{t(DISCLAIMER)}</span><span>{persistenceOK ? t('进度自动保存') : t('进度暂未保存')} · {t('水位与水流为教学近似')}</span></footer>
  </main>;
}
