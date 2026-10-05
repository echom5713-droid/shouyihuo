import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CASES, CERTIFICATE_NOTICE, COURSE_TITLE, DISCLAIMER, MODES, PARTS, VERIFY_LABELS } from './domain/course';
import { createAttempt, isRetesting, reducer, scoreAttempt } from './domain/engine';
import type { Attempt, CaseId, Event, Mode, PartId } from './domain/types';
import { archiveAttempt, clearStore, emptyStore, loadStore, saveStore, type StorageStatus } from './storage/local';
import { TankModel } from './components/TankModel';
import { Icon } from './components/Icon';
import { Workbench } from './views/Workbench';
import { reviewSuggestions } from './ui/presentation';

function navigate(path: string) { window.location.hash = path; }
function date(value: string) { return new Date(value).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }); }
function newId() { return `SYH-${crypto.randomUUID()}`; }
function shortId(id: string) { return id.slice(0, 12).toUpperCase(); }
const currentRoute = () => window.location.hash.slice(1) || '/';

function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>('button,input')?.focus();
    function keyboard(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href]') ?? []);
        const first = nodes[0], last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, []);
  return <div className="modal-backdrop"><div ref={ref} className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="关闭弹窗"><Icon name="close" /></button></header>{children}</div></div>;
}

export function App() {
  const [initial] = useState(() => { try { return loadStore(window.localStorage); } catch { return { data: emptyStore(), status: 'unavailable' as const }; } });
  const [store, setStore] = useState(initial.data);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>(initial.status);
  const [route, setRoute] = useState(currentRoute);
  const [confirm, setConfirm] = useState<{ title: string; text: string; label: string; action: () => void } | null>(null);
  const [certificate, setCertificate] = useState<Attempt | null>(null);
  const [tabWarning, setTabWarning] = useState(false);
  const staleTab = useRef(false);
  const latest = useRef(store); latest.current = store;
  useEffect(() => {
    const update = () => { setRoute(currentRoute()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', update);
    const storageChange = (e: StorageEvent) => { if (e.key === 'shouyihuo.local.v1') { staleTab.current = true; setTabWarning(true); } };
    window.addEventListener('storage', storageChange);
    return () => { window.removeEventListener('hashchange', update); window.removeEventListener('storage', storageChange); };
  }, []);
  useEffect(() => {
    if (storageStatus === 'corrupt' || storageStatus === 'incompatible' || staleTab.current) return;
    let success = false; try { success = saveStore(window.localStorage, store); } catch { /* private browsing / policy */ }
    if (!success && storageStatus !== 'unavailable') setStorageStatus('unavailable');
  }, [store, storageStatus]);
  const routeMode = route.split('/')[2] as Mode;
  const a = route.startsWith('/lab/') ? store.sessions[routeMode] : undefined;
  useEffect(() => {
    if (!a || a.status !== 'active' || tabWarning) return;
    const mode = a.mode;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      setStore(s => {
        const live = s.sessions[mode];
        return live ? { ...s, sessions: { ...s.sessions, [mode]: reducer(live, { type: 'TICK', dt: 0.25 }) } } : s;
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [a?.id, tabWarning]);
  const dispatch = (event: Event) => {
    if (!a || tabWarning) return;
    setStore(s => {
      const live = s.sessions[a.mode]; if (!live) return s;
      return { ...s, sessions: { ...s.sessions, [a.mode]: reducer(live, event) } };
    });
  };
  const start = (mode: Mode, caseId: CaseId, force = false) => {
    if (tabWarning) return;
    const existing = store.sessions[mode];
    if (existing && !force && (mode === 'explore' || existing.caseId === caseId)) { navigate(`/lab/${mode}`); return; }
    const act = () => {
      const attempt = createAttempt(mode, caseId, newId(), new Date().toISOString());
      setStore(s => ({ ...s, sessions: { ...s.sessions, [mode]: attempt } }));
      setConfirm(null); navigate(`/lab/${mode}`);
    };
    if (existing) setConfirm({ title: '开始新的尝试？', text: '当前未结束的同模式尝试将被替换。已完成的学习记录会保留，新尝试使用独立编号。', label: '开始新尝试', action: act });
    else act();
  };
  const finish = () => {
    if (!a || a.mode === 'explore') return;
    const act = () => {
      const live = latest.current.sessions[a.mode]; if (!live) return;
      const finished = reducer(live, { type: 'FINISH', at: new Date().toISOString() });
      if (finished.status !== 'completed') return;
      setStore(s => archiveAttempt(s, finished)); setConfirm(null); navigate(`/report/${finished.id}`);
    };
    setConfirm({ title: '结束本次尝试并生成报告？', text: scoreAttempt(a).passed ? '报告将保存当前成绩、观察证据和操作日志。结束后本次记录不再修改。' : '当前仍有未完成项或错误。本次报告会如实保留，结束后可另开一次新尝试。', label: '结束并查看报告', action: act });
  };
  const resetData = () => setConfirm({ title: '确认清空本地学习数据？', text: '将删除本项目的学习记录、当前尝试和昵称，无法撤销。其他网站的数据不受影响。', label: '确认清空', action: () => {
    let ok = false; try { ok = clearStore(window.localStorage); } catch { /* blocked */ }
    if (ok) { setStore(emptyStore()); setStorageStatus('ok'); staleTab.current = false; setTabWarning(false); navigate('/history'); }
    else setStorageStatus('unavailable');
    setConfirm(null);
  } });
  const record = route.startsWith('/report/') ? store.records.find(r => r.id === route.split('/')[2]) : undefined;
  const headerActive = a ? 'lab' : route === '/history' || record ? 'history' : 'course';
  return <>
    <header className="app-header no-print">
      <a className="brand" href="#/"><span className="brand-icon"><Icon name="cube" size={24} /></span><span>手艺活<span className="brand-caption">维修实训</span></span></a>
      <nav aria-label="主导航"><a className={headerActive === 'course' ? 'active' : ''} href="#/">课程学习</a>{a && <span className="active lab-nav">实训工作台</span>}<a className={headerActive === 'history' ? 'active' : ''} href="#/history">学习记录{store.records.length > 0 && <span className="nav-count">{store.records.length}</span>}</a></nav>
      <span className="version"><span className="status-dot" />本地运行 <span className="version-divider">/</span> v0.2</span>
    </header>
    {storageStatus !== 'ok' && <div className="storage-notice no-print" role="alert"><Icon name="info" /><span>{storageStatus === 'unavailable' ? '当前记录不能持久保存：浏览器存储被禁用或写入失败。关闭或刷新页面可能丢失此次进度。' : storageStatus === 'incompatible' ? '检测到不兼容版本的数据。原数据未覆盖；重置前只能临时体验。' : '本地数据损坏，原数据未覆盖；重置前只能临时体验。'}</span>{storageStatus !== 'unavailable' && <button onClick={resetData}>重置本地数据</button>}</div>}
    {tabWarning && <div className="storage-notice no-print" role="alert">其他标签页已修改学习数据，本页已暂停写入。<button onClick={() => window.location.reload()}>重新加载最新记录</button></div>}
    {a ? <Workbench persistenceOK={storageStatus === 'ok' && !tabWarning} key={a.id} attempt={a} dispatch={dispatch} onFinish={finish} onRestart={() => start(a.mode, a.caseId, true)} />
      : record ? <Report attempt={record} onStart={start} onCertificate={() => setCertificate(record)} />
      : route === '/history' ? <History records={store.records} sessions={store.sessions} nickname={store.nickname} onNickname={nickname => setStore(s => ({ ...s, nickname }))} onReset={resetData} onStart={start} />
      : route === '/' ? <Home records={store.records} sessions={store.sessions} onStart={start} />
      : <main className="empty-page"><Icon name="book" size={36} /><h1>这次尝试暂不可用</h1><p>记录可能已被清空，或这次尝试尚未开始。可以返回课程开启新的学习。</p><a className="button primary" href="#/">返回课程</a></main>}
    {confirm && <Dialog title={confirm.title} onClose={() => setConfirm(null)}><p>{confirm.text}</p><div className="dialog-actions"><button className="button" onClick={() => setConfirm(null)}>取消</button><button className="button primary" onClick={confirm.action}>{confirm.label}</button></div></Dialog>}
    {certificate && certificate.mode === 'assessment' && scoreAttempt(certificate).passed && <Dialog title="示范性课程完成证明" wide onClose={() => setCertificate(null)}>
      <div className="print-settings no-print"><label>证明昵称（可选）<input maxLength={24} placeholder="未填写则显示“本地学习者”" value={store.nickname} onChange={e => setStore(s => ({ ...s, nickname: e.target.value }))} /></label><button className="button primary" onClick={() => window.print()}><Icon name="print" />打印 / 另存为 PDF</button></div>
      <article className="certificate"><div className="certificate-eyebrow">手艺活 · LOCAL DEMONSTRATION</div><h1>课程完成证明</h1><span className="certificate-subtitle">本地示范 · 单次情境测评</span><p className="certificate-name">{store.nickname.trim() || '本地学习者'}</p><p>已在内置简化模型中完成</p><h2>{COURSE_TITLE}</h2><div className="certificate-data"><span>情境 {CASES[certificate.caseId].index} · {CASES[certificate.caseId].symptom}</span><strong>{scoreAttempt(certificate).total} / 100</strong><span>{date(certificate.endedAt!)}</span></div><p className="certificate-id">本地记录编号：{certificate.id}</p><p className="certificate-notice">{CERTIFICATE_NOTICE}</p><p className="muted">本地数据可修改，不具备正式认证或防篡改效力。</p></article>
    </Dialog>}
  </>;
}

function Home({ records, sessions, onStart }: { records: Attempt[]; sessions: Partial<Record<Mode, Attempt>>; onStart: (mode: Mode, id: CaseId, force?: boolean) => void }) {
  const [caseId, setCaseId] = useState<CaseId>('seal');
  const [selected, setSelected] = useState<PartId | null>(null);
  const [preview] = useState(() => ({ ...createAttempt('explore', 'seal', 'preview', new Date().toISOString()), lidOpen: true }));
  const unfinished = Object.values(sessions).filter((a): a is Attempt => !!a && a.status === 'active');
  return <main className="home-page">
    <div className="page-eyebrow"><span>课程 001</span><span className="eyebrow-line" />居家设施 · 基础认知</div>
    <section className="course-hero">
      <div className="hero-copy">
        <div className="pill">普通非电动马桶水箱</div>
        <h1>水箱结构与<br />基础故障诊断<span className="title-period">。</span></h1>
        <p className="hero-intro">在可交互的 3D 水箱中，练习观察结构、收集证据、判断原因与验证处理结果。</p>
        <div className="hero-facts"><span><Icon name="cube" />9 个结构部件</span><span><Icon name="book" />3 个教学情境</span><span><Icon name="shield" />无需注册</span></div>
        <div className="hero-entry">
          <div className="hero-entry-heading"><h2>选择练习情境</h2><span>用于引导训练与独立测评</span></div>
          <div className="case-options" role="group" aria-label="选择教学情境">{Object.values(CASES).map(c => <button className={caseId === c.id ? 'selected' : ''} aria-pressed={caseId === c.id} key={c.id} onClick={() => setCaseId(c.id)}><span>{c.index}</span>{c.symptom}<Icon name={caseId === c.id ? 'check' : 'chevron'} size={16} /></button>)}</div>
          <div className="start-buttons home-mode-actions">
            <button className="button primary" onClick={() => onStart('explore', caseId, true)}><Icon name="cube" />认识结构</button>
            <button className="button" onClick={() => onStart('guided', caseId, true)}><Icon name="book" />开始引导训练</button>
            <button className="button" onClick={() => onStart('assessment', caseId, true)}><Icon name="play" />开始独立测评</button>
          </div>
          <p className="hero-mode-note">首次使用可先认识结构，不计分。引导训练提供学习提示；独立测评保留首次诊断。</p>
        </div>
      </div>
      <div className="hero-model">
        <div className="model-heading"><span><span className="status-dot" />交互式教学模型</span><span>浮球 · 翻板式</span></div>
        <TankModel attempt={preview} selected={selected} onSelect={setSelected} cutaway exploded={false} labels={false} resetToken={0} compact />
        <div className="hero-model-foot"><span><Icon name="rotate" />拖动旋转 · 滚轮缩放 · 点击部件</span><span>{selected ? PARTS.find(p => p.id === selected)?.name : '剖视状态'}</span></div>
      </div>
    </section>
    {unfinished.length > 0 && <section className="resume-sessions home-resume" aria-labelledby="home-resume-title">
      <div className="resume-heading"><div><span className="eyebrow">进度已保留</span><h2 id="home-resume-title">继续上次学习</h2></div><a className="text-link" href="#/history">管理学习记录<Icon name="arrow" size={16} /></a></div>
      <div className="resume-list">{unfinished.map(a => <div className="resume-item" key={a.id}>
        <Icon name="history" /><div className="resume-context"><strong>{MODES[a.mode]}</strong><span>{a.mode === 'explore' ? '正常模型 · 自由观察' : `情境 ${CASES[a.caseId].index} · ${CASES[a.caseId].symptom}`}</span></div>
        <div className="resume-actions"><button className="button" onClick={() => onStart(a.mode, a.caseId)}>{a.mode === 'explore' ? '继续认识结构' : `继续${MODES[a.mode]}`}<Icon name="arrow" size={16} /></button><button className="text-link" onClick={() => onStart(a.mode, a.caseId, true)} aria-label={`${MODES[a.mode]}：开始新尝试`}>开始新尝试</button></div>
      </div>)}</div>
    </section>}
    <section className="learning-section">
      <div className="section-label"><span className="eyebrow">本课学习目标</span><h2>识别、诊断与验证</h2><a className="text-link" href="#/history">学习记录{records.length > 0 ? `（${records.length}）` : ''}<Icon name="arrow" size={16} /></a></div>
      <div className="learning-objectives"><div><span>01</span><h3>识别结构</h3><p>理解进水、储水、排水之间的关系。</p></div><div><span>02</span><h3>用证据诊断</h3><p>从水位、供水和水流位置判断原因。</p></div><div><span>03</span><h3>完成闭环</h3><p>遵循模拟操作条件，处理后运行复测。</p></div></div>
    </section>
    <footer className="course-disclaimer"><Icon name="info" /><div><strong>{DISCLAIMER}</strong><p>本课只使用无品牌的浮球进水、翻板排水重力式水箱，不代表所有马桶结构。模拟结果不代表真实维修能力。</p></div><span>LOCAL MVP v0.2</span></footer>
  </main>;
}

function Report({ attempt: a, onStart, onCertificate }: { attempt: Attempt; onStart: (mode: Mode, id: CaseId, force?: boolean) => void; onCertificate: () => void }) {
  const score = scoreAttempt(a), c = CASES[a.caseId];
  const suggestions = reviewSuggestions(a);
  const verdictTitle = score.passed
    ? '已完成本情境的诊断与复测'
    : a.safetyErrors.length
      ? '关键安全错误使本次未合格'
      : '尚未满足本原型的合格条件';
  return <main className={`report-page ${score.passed ? 'report-passed' : 'report-failed'}`}>
    <div className="page-eyebrow"><a href="#/history">学习记录</a><Icon name="chevron" size={14} /><span>本次报告</span></div>
    <div className="report-title"><div><span className="eyebrow">{MODES[a.mode]} · 情境 {c.index}</span><h1>本次实训报告</h1><p>{COURSE_TITLE}</p></div><span className="record-id">{shortId(a.id)}<br /><small>{date(a.endedAt!)}</small></span></div>
    <div className="report-summary">
      <div className="report-verdict">
        <span className={`pill ${score.passed ? 'pass' : 'review'}`}>{score.passed ? a.mode === 'assessment' ? '本原型测评合格' : '引导训练完成' : '本次未合格'}</span>
        <h2>{verdictTitle}</h2>
        {!score.passed && <ul className="report-reasons">{score.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>}
        <p>情境 {c.index} · {c.symptom}。{a.mode === 'assessment' ? '独立测评保留首次诊断。' : '引导训练成绩仅用于学习反馈。'}用时约 {Math.max(1, Math.ceil(a.elapsed / 60))} 分钟，仅供参考。</p>
      </div>
      <div className="score-dial" style={{ '--score': `${score.total}%` } as React.CSSProperties} aria-label={`本次成绩 ${score.total} 分，满分 100 分`}><div><strong data-testid="total-score">{score.total}</strong><span>/ 100</span></div></div>
    </div>
    <section className="review-priorities" aria-labelledby="review-priorities-title">
      <div className="review-heading"><div><span className="eyebrow">基于本次记录</span><h2 id="review-priorities-title">下一次优先练习</h2></div><button className={`button ${score.passed ? '' : 'primary'}`} onClick={() => onStart('guided', a.caseId, true)}>重新训练<Icon name="arrow" size={16} /></button></div>
      <ol>{suggestions.map((suggestion, i) => <li key={suggestion}><span className="review-number">0{i + 1}</span><p>{suggestion}</p></li>)}</ol>
    </section>
    <section className="score-breakdown" aria-label="四项评分明细">{score.sections.map((section, i) => <div key={section.title}><div className="score-category"><span>0{i + 1} / {section.title}</span><strong>{section.earned}<small> / {section.possible}</small></strong></div><div className="score-track"><i style={{ width: `${section.earned / section.possible * 100}%` }} /></div><ul>{section.items.map(item => <li className={item.earned === item.possible ? 'done' : ''} key={item.label}><Icon name={item.earned === item.possible ? 'check' : 'close'} size={14} /><div>{item.label}<small>{item.reason}</small></div><span>{item.earned}/{item.possible}</span></li>)}</ul></div>)}</section>
    <div className="report-details">
      <section><div className="panel-heading"><h2>诊断回顾</h2><span>{a.diagnosis === a.caseId ? '诊断正确' : '待改进'}</span></div><div className="diagnosis-comparison"><div><span>你的首次诊断</span><strong>{a.firstDiagnosis ? CASES[a.firstDiagnosis].diagnosis : '未提交'}</strong></div><div><span>本情境根因</span><strong>{c.diagnosis}</strong></div></div><p>{c.explanation}</p><div className="verification-list">{Object.entries(a.retest.checks).map(([key, checked]) => <span key={key} className={checked ? 'verified' : ''}><Icon name={checked ? 'check' : 'close'} size={15} />{VERIFY_LABELS[key as keyof typeof VERIFY_LABELS]}</span>)}</div></section>
      <section><div className="panel-heading"><h2>安全与操作记录</h2><span>{a.safetyErrors.length} 项关键安全错误</span></div>{a.safetyErrors.length ? <ul className="safety-errors">{a.safetyErrors.map(e => <li key={e.code}><Icon name="shield" size={16} />{e.text}</li>)}</ul> : <p className="safe-result"><Icon name="shield" />本次未记录关键安全错误。</p>}<details className="report-logs"><summary>查看完整操作日志（{a.logs.length} 条）</summary><ol>{a.logs.map(l => <li key={l.step} className={l.kind}><span>{String(l.step).padStart(2, '0')}</span>{l.text}</li>)}</ol></details></section>
    </div>
    <div className="report-actions"><button className={`button ${score.passed ? 'primary' : ''}`} onClick={() => onStart('assessment', a.caseId, true)}>开始新的测评<Icon name="arrow" /></button>{a.mode === 'assessment' && score.passed && <button className="button" onClick={onCertificate}><Icon name="print" />生成示范完成证明</button>}<a className="text-link" href="#/history">全部学习记录</a></div>
    <p className="report-limit">内部合格条件：总分 ≥80、诊断与修复正确、必要验证完成，且无关键安全错误。该分数不代表真实上岗能力。{DISCLAIMER}。</p>
  </main>;
}

function History({ records, sessions, nickname, onNickname, onReset, onStart }: { records: Attempt[]; sessions: Partial<Record<Mode, Attempt>>; nickname: string; onNickname: (v: string) => void; onReset: () => void; onStart: (mode: Mode, id: CaseId) => void }) {
  const [filter, setFilter] = useState<'all' | 'guided' | 'assessment'>('all');
  const shown = records.filter(r => filter === 'all' || r.mode === filter);
  return <main className="history-page"><div className="page-eyebrow"><span>我的学习</span><span className="eyebrow-line" />仅保存在当前浏览器</div><div className="history-heading"><div><h1>学习记录</h1><p>保留每一次尝试，也看见下一次练习的方向。</p></div><a className="button primary" href="#/">返回课程<Icon name="arrow" /></a></div><div className="history-profile"><label>学习昵称 <span className="muted">选填</span><input maxLength={24} placeholder="本地学习者" value={nickname} onChange={e => onNickname(e.target.value)} /></label><p><Icon name="info" />昵称只用于本地示范证明。无需姓名、电话或其他个人信息。</p></div>
    {Object.values(sessions).length > 0 && <section className="resume-sessions"><h2>尚未结束</h2>{Object.values(sessions).map(a => a && <button key={a.id} onClick={() => onStart(a.mode, a.caseId)}><Icon name="history" /><span>{MODES[a.mode]}<small>{a.mode === 'explore' ? '正常模型 · 自由观察' : `情境 ${CASES[a.caseId].index} · ${CASES[a.caseId].symptom}`}</small></span><span>继续<Icon name="arrow" size={16} /></span></button>)}</section>}
    <div className="history-toolbar"><div className="filter-tabs" role="group" aria-label="记录筛选">{(['all', 'guided', 'assessment'] as const).map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? '全部尝试' : MODES[f]}</button>)}</div><span className="muted">{shown.length} 条记录</span></div>
    {shown.length ? <div className="history-table"><table><caption className="sr-only">已完成的本地学习尝试</caption><thead><tr><th scope="col">情境与模式</th><th scope="col">完成时间</th><th scope="col">成绩</th><th scope="col">结果</th><th scope="col"><span className="sr-only">操作</span></th></tr></thead><tbody>{shown.map(a => { const score = scoreAttempt(a); return <tr key={a.id} data-testid="history-row" className={score.passed ? 'history-passed' : 'history-failed'}><td data-label="情境与模式"><strong>{CASES[a.caseId].symptom}</strong><small>{MODES[a.mode]} · {shortId(a.id)}</small></td><td data-label="完成时间">{date(a.endedAt!)}</td><td data-label="成绩"><b>{score.total}</b><span className="muted"> / 100</span></td><td data-label="结果"><span className={`pill ${score.passed ? 'pass' : 'review'}`}>{score.passed ? a.mode === 'assessment' ? '原型内合格' : '训练完成' : '未合格'}</span>{a.safetyErrors.length > 0 && <small className="history-safety-note">含关键安全错误</small>}</td><td data-label="操作"><a className="text-link" href={`#/report/${a.id}`}>查看报告<Icon name="arrow" size={15} /></a></td></tr>; })}</tbody></table></div> : <div className="empty-records"><span className="empty-icon"><Icon name="book" size={30} /></span><h2>还没有{filter === 'all' ? '' : MODES[filter]}记录</h2><p>结束一次训练或独立测评后，报告会保存在这里。结构认知只保存探索进度。</p><a className="button" href="#/">开始第一课</a></div>}
    <footer className="history-footer"><p>数据保存在本设备、当前浏览器及同一访问地址中。清除浏览器数据或更换端口会影响记录读取。<br />本地数据可修改，不具备正式认证或防篡改效力。</p><button className="danger-link" onClick={onReset}>清空学习记录</button></footer></main>;
}
