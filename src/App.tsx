import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CASES, CERTIFICATE_NOTICE, COURSE_TITLE, DISCLAIMER, MODES, PARTS, VERIFY_LABELS } from './domain/course';
import { createAttempt, isRetesting, reducer, scoreAttempt } from './domain/engine';
import type { Attempt, CaseId, Event, Mode, PartId } from './domain/types';
import { archiveAttempt, clearStore, emptyStore, loadStore, saveStore, type StorageStatus } from './storage/local';
import { TankModel } from './components/TankModel';
import { Icon } from './components/Icon';
import { Workbench } from './views/Workbench';
import { reviewSuggestions } from './ui/presentation';
import { useLocale } from './i18n';

function navigate(path: string) { window.location.hash = path; }
function date(value: string, locale: 'en' | 'zh') { return new Date(value).toLocaleString(locale === 'en' ? 'en-GB' : 'zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }); }
function newId() { return `SYH-${crypto.randomUUID()}`; }
function shortId(id: string) { return id.slice(0, 12).toUpperCase(); }
const currentRoute = () => window.location.hash.slice(1) || '/';

function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const { t } = useLocale();
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
  return <div className="modal-backdrop"><div ref={ref} className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={t(title)}><header><h2>{t(title)}</h2><button className="icon-button" onClick={onClose} aria-label={t("关闭弹窗")}><Icon name="close" /></button></header>{children}</div></div>;
}

export function App() {
  const { locale, setLocale, t } = useLocale();
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
      <a className="brand" href="#/"><span className="brand-icon"><Icon name="cube" size={24} /></span><span>{t("手艺活")}<span className="brand-caption">{t("维修实训")}</span></span></a>
      <nav aria-label={t("主导航")}><a className={headerActive === 'course' ? 'active' : ''} href="#/">{t("课程学习")}</a>{a && <span className="active lab-nav">{t("实训工作台")}</span>}<a className={headerActive === 'history' ? 'active' : ''} href="#/history">{t("学习记录")}{store.records.length > 0 && <span className="nav-count">{store.records.length}</span>}</a></nav>
      <div className="language-switch" role="group" aria-label={t("界面语言")}><button lang="en" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button><button lang="zh-CN" aria-pressed={locale === 'zh'} onClick={() => setLocale('zh')}>中文</button></div>
      <span className="version"><span className="status-dot" />{t("本地运行")}<span className="version-divider">/</span> v0.2</span>
    </header>
    {storageStatus !== 'ok' && <div className="storage-notice no-print" role="alert"><Icon name="info" /><span>{storageStatus === 'unavailable' ? t("当前记录不能持久保存：浏览器存储被禁用或写入失败。关闭或刷新页面可能丢失此次进度。") : storageStatus === 'incompatible' ? t("检测到不兼容版本的数据。原数据未覆盖；重置前只能临时体验。") : t("本地数据损坏，原数据未覆盖；重置前只能临时体验。")}</span>{storageStatus !== 'unavailable' && <button onClick={resetData}>{t("重置本地数据")}</button>}</div>}
    {tabWarning && <div className="storage-notice no-print" role="alert">{t("其他标签页已修改学习数据，本页已暂停写入。")}<button onClick={() => window.location.reload()}>{t("重新加载最新记录")}</button></div>}
    {a ? <Workbench persistenceOK={storageStatus === 'ok' && !tabWarning} key={a.id} attempt={a} dispatch={dispatch} onFinish={finish} onRestart={() => start(a.mode, a.caseId, true)} />
      : record ? <Report attempt={record} onStart={start} onCertificate={() => setCertificate(record)} />
      : route === '/history' ? <History records={store.records} sessions={store.sessions} nickname={store.nickname} onNickname={nickname => setStore(s => ({ ...s, nickname }))} onReset={resetData} onStart={start} />
      : route === '/' ? <Home records={store.records} sessions={store.sessions} onStart={start} />
      : <main className="empty-page"><Icon name="book" size={36} /><h1>{t("这次尝试暂不可用")}</h1><p>{t("记录可能已被清空，或这次尝试尚未开始。可以返回课程开启新的学习。")}</p><a className="button primary" href="#/">{t("返回课程")}</a></main>}
    {confirm && <Dialog title={confirm.title} onClose={() => setConfirm(null)}><p>{t(confirm.text)}</p><div className="dialog-actions"><button className="button" onClick={() => setConfirm(null)}>{t("取消")}</button><button className="button primary" onClick={confirm.action}>{t(confirm.label)}</button></div></Dialog>}
    {certificate && certificate.mode === 'assessment' && scoreAttempt(certificate).passed && <Dialog title={t("示范性课程完成证明")} wide onClose={() => setCertificate(null)}>
      <div className="print-settings no-print"><label>{t("证明昵称（可选）")}<input maxLength={24} placeholder={t("未填写则显示“本地学习者”")} value={store.nickname} onChange={e => setStore(s => ({ ...s, nickname: e.target.value }))} /></label><button className="button primary" onClick={() => window.print()}><Icon name="print" />{t("打印 / 另存为 PDF")}</button></div>
      <article className="certificate"><div className="certificate-eyebrow">{t("手艺活 · LOCAL DEMONSTRATION")}</div><h1>{t("课程完成证明")}</h1><span className="certificate-subtitle">{t("本地示范 · 单次情境测评")}</span><p className="certificate-name">{store.nickname.trim() || t("本地学习者")}</p><p>{t("已在内置简化模型中完成")}</p><h2>{t(COURSE_TITLE)}</h2><div className="certificate-data"><span>{t("情境")}{CASES[certificate.caseId].index} · {t(CASES[certificate.caseId].symptom)}</span><strong>{scoreAttempt(certificate).total} / 100</strong><span>{date(certificate.endedAt!, locale)}</span></div><p className="certificate-id">{t("本地记录编号：")}{certificate.id}</p><p className="certificate-notice">{t(CERTIFICATE_NOTICE)}</p><p className="muted">{t("本地数据可修改，不具备正式认证或防篡改效力。")}</p></article>
    </Dialog>}
  </>;
}

function Home({ records, sessions, onStart }: { records: Attempt[]; sessions: Partial<Record<Mode, Attempt>>; onStart: (mode: Mode, id: CaseId, force?: boolean) => void }) {
  const { t } = useLocale();
  const [caseId, setCaseId] = useState<CaseId>('seal');
  const [selected, setSelected] = useState<PartId | null>(null);
  const [preview] = useState(() => ({ ...createAttempt('explore', 'seal', 'preview', new Date().toISOString()), lidOpen: true }));
  const unfinished = Object.values(sessions).filter((a): a is Attempt => !!a && a.status === 'active');
  return <main className="home-page">
    <div className="page-eyebrow"><span>{t("课程 001")}</span><span className="eyebrow-line" />{t("居家设施 · 基础认知")}</div>
    <section className="course-hero">
      <div className="hero-copy">
        <div className="pill">{t("普通非电动马桶水箱")}</div>
        <h1>{t("水箱结构与")}<br />{t("基础故障诊断")}<span className="title-period">{t("。")}</span></h1>
        <p className="hero-intro">{t("在可交互的 3D 水箱中，练习观察结构、收集证据、判断原因与验证处理结果。")}</p>
        <div className="hero-facts"><span><Icon name="cube" />{t("9 个结构部件")}</span><span><Icon name="book" />{t("3 个教学情境")}</span><span><Icon name="shield" />{t("无需注册")}</span></div>
        <div className="hero-entry">
          <div className="hero-entry-heading"><h2>{t("选择练习情境")}</h2><span>{t("用于引导训练与独立测评")}</span></div>
          <div className="case-options" role="group" aria-label={t("选择教学情境")}>{Object.values(CASES).map(c => <button className={caseId === c.id ? 'selected' : ''} aria-pressed={caseId === c.id} key={c.id} onClick={() => setCaseId(c.id)}><span>{c.index}</span>{t(c.symptom)}<Icon name={caseId === c.id ? 'check' : 'chevron'} size={16} /></button>)}</div>
          <div className="start-buttons home-mode-actions">
            <button className="button primary" onClick={() => onStart('explore', caseId, true)}><Icon name="cube" />{t("认识结构")}</button>
            <button className="button" onClick={() => onStart('guided', caseId, true)}><Icon name="book" />{t("开始引导训练")}</button>
            <button className="button" onClick={() => onStart('assessment', caseId, true)}><Icon name="play" />{t("开始独立测评")}</button>
          </div>
          <p className="hero-mode-note">{t("首次使用可先认识结构，不计分。引导训练提供学习提示；独立测评保留首次诊断。")}</p>
        </div>
      </div>
      <div className="hero-model">
        <div className="model-heading"><span><span className="status-dot" />{t("交互式教学模型")}</span><span>{t("浮球 · 翻板式")}</span></div>
        <TankModel attempt={preview} selected={selected} onSelect={setSelected} cutaway exploded={false} labels={false} resetToken={0} compact />
        <div className="hero-model-foot"><span><Icon name="rotate" />{t("拖动旋转 · 滚轮缩放 · 点击部件")}</span><span>{selected ? t(PARTS.find(p => p.id === selected)?.name ?? '') : t("剖视状态")}</span></div>
      </div>
    </section>
    {unfinished.length > 0 && <section className="resume-sessions home-resume" aria-labelledby="home-resume-title">
      <div className="resume-heading"><div><span className="eyebrow">{t("进度已保留")}</span><h2 id="home-resume-title">{t("继续上次学习")}</h2></div><a className="text-link" href="#/history">{t("管理学习记录")}<Icon name="arrow" size={16} /></a></div>
      <div className="resume-list">{unfinished.map(a => <div className="resume-item" key={a.id}>
        <Icon name="history" /><div className="resume-context"><strong>{t(MODES[a.mode])}</strong><span>{a.mode === 'explore' ? t("正常模型 · 自由观察") : `${t("情境")}${CASES[a.caseId].index} · ${t(CASES[a.caseId].symptom)}`}</span></div>
        <div className="resume-actions"><button className="button" onClick={() => onStart(a.mode, a.caseId)}>{a.mode === 'explore' ? t("继续认识结构") : `${t("继续")}${t(MODES[a.mode])}`}<Icon name="arrow" size={16} /></button><button className="text-link" onClick={() => onStart(a.mode, a.caseId, true)} aria-label={`${t(MODES[a.mode])}: ${t("开始新尝试")}`}>{t("开始新尝试")}</button></div>
      </div>)}</div>
    </section>}
    <section className="learning-section">
      <div className="section-label"><span className="eyebrow">{t("本课学习目标")}</span><h2>{t("识别、诊断与验证")}</h2><a className="text-link" href="#/history">{t("学习记录")}{records.length > 0 ? `（${records.length}）` : ''}<Icon name="arrow" size={16} /></a></div>
      <div className="learning-objectives"><div><span>01</span><h3>{t("识别结构")}</h3><p>{t("理解进水、储水、排水之间的关系。")}</p></div><div><span>02</span><h3>{t("用证据诊断")}</h3><p>{t("从水位、供水和水流位置判断原因。")}</p></div><div><span>03</span><h3>{t("完成闭环")}</h3><p>{t("遵循模拟操作条件，处理后运行复测。")}</p></div></div>
    </section>
    <footer className="course-disclaimer"><Icon name="info" /><div><strong>{t(DISCLAIMER)}</strong><p>{t("本课只使用无品牌的浮球进水、翻板排水重力式水箱，不代表所有马桶结构。模拟结果不代表真实维修能力。")}</p></div><span>LOCAL MVP v0.2</span></footer>
  </main>;
}

function Report({ attempt: a, onStart, onCertificate }: { attempt: Attempt; onStart: (mode: Mode, id: CaseId, force?: boolean) => void; onCertificate: () => void }) {
  const { locale, t } = useLocale();
  const score = scoreAttempt(a), c = CASES[a.caseId];
  const suggestions = reviewSuggestions(a);
  const verdictTitle = score.passed
    ? t("已完成本情境的诊断与复测")
    : a.safetyErrors.length
      ? t("关键安全错误使本次未合格")
      : t("尚未满足本原型的合格条件");
  return <main className={`report-page ${score.passed ? 'report-passed' : 'report-failed'}`}>
    <div className="page-eyebrow"><a href="#/history">{t("学习记录")}</a><Icon name="chevron" size={14} /><span>{t("本次报告")}</span></div>
    <div className="report-title"><div><span className="eyebrow">{t(MODES[a.mode])} {t("· 情境")}{c.index}</span><h1>{t("本次实训报告")}</h1><p>{t(COURSE_TITLE)}</p></div><span className="record-id">{shortId(a.id)}<br /><small>{date(a.endedAt!, locale)}</small></span></div>
    <div className="report-summary">
      <div className="report-verdict">
        <span className={`pill ${score.passed ? 'pass' : 'review'}`}>{score.passed ? a.mode === 'assessment' ? t("本原型测评合格") : t("引导训练完成") : t("本次未合格")}</span>
        <h2>{verdictTitle}</h2>
        {!score.passed && <ul className="report-reasons">{score.reasons.map(reason => <li key={reason}>{t(reason)}</li>)}</ul>}
        <p>{t("情境")}{c.index} · {t(c.symptom)}{t("。")} {a.mode === 'assessment' ? t("独立测评保留首次诊断。") : t("引导训练成绩仅用于学习反馈。")}{t("用时约")}{Math.max(1, Math.ceil(a.elapsed / 60))} {t("分钟，仅供参考。")}</p>
      </div>
      <div className="score-dial" style={{ '--score': `${score.total}%` } as React.CSSProperties} aria-label={`${t("成绩")}: ${score.total} / 100`}><div><strong data-testid="total-score">{score.total}</strong><span>/ 100</span></div></div>
    </div>
    <section className="review-priorities" aria-labelledby="review-priorities-title">
      <div className="review-heading"><div><span className="eyebrow">{t("基于本次记录")}</span><h2 id="review-priorities-title">{t("下一次优先练习")}</h2></div><button className={`button ${score.passed ? '' : 'primary'}`} onClick={() => onStart('guided', a.caseId, true)}>{t("重新训练")}<Icon name="arrow" size={16} /></button></div>
      <ol>{suggestions.map((suggestion, i) => <li key={suggestion}><span className="review-number">0{i + 1}</span><p>{t(suggestion)}</p></li>)}</ol>
    </section>
    <section className="score-breakdown" aria-label={t("四项评分明细")}>{score.sections.map((section, i) => <div key={section.title}><div className="score-category"><span>0{i + 1} / {t(section.title)}</span><strong>{section.earned}<small> / {section.possible}</small></strong></div><div className="score-track"><i style={{ width: `${section.earned / section.possible * 100}%` }} /></div><ul>{section.items.map(item => <li className={item.earned === item.possible ? 'done' : ''} key={item.label}><Icon name={item.earned === item.possible ? 'check' : 'close'} size={14} /><div>{t(item.label)}<small>{t(item.reason)}</small></div><span>{item.earned}/{item.possible}</span></li>)}</ul></div>)}</section>
    <div className="report-details">
      <section><div className="panel-heading"><h2>{t("诊断回顾")}</h2><span>{a.diagnosis === a.caseId ? t("诊断正确") : t("待改进")}</span></div><div className="diagnosis-comparison"><div><span>{t("你的首次诊断")}</span><strong>{a.firstDiagnosis ? t(CASES[a.firstDiagnosis].diagnosis) : t("未提交")}</strong></div><div><span>{t("本情境根因")}</span><strong>{t(c.diagnosis)}</strong></div></div><p>{t(c.explanation)}</p><div className="verification-list">{Object.entries(a.retest.checks).map(([key, checked]) => <span key={key} className={checked ? 'verified' : ''}><Icon name={checked ? 'check' : 'close'} size={15} />{t(VERIFY_LABELS[key as keyof typeof VERIFY_LABELS])}</span>)}</div></section>
      <section><div className="panel-heading"><h2>{t("安全与操作记录")}</h2><span>{a.safetyErrors.length} {locale === 'en' && a.safetyErrors.length === 1 ? 'critical safety error' : t("项关键安全错误")}</span></div>{a.safetyErrors.length ? <ul className="safety-errors">{a.safetyErrors.map(e => <li key={e.code}><Icon name="shield" size={16} />{t(e.text)}</li>)}</ul> : <p className="safe-result"><Icon name="shield" />{t("本次未记录关键安全错误。")}</p>}<details className="report-logs"><summary>{t("查看完整操作日志（")}{a.logs.length} {t("条）")}</summary><ol>{a.logs.map(l => <li key={l.step} className={l.kind}><span>{String(l.step).padStart(2, '0')}</span>{t(l.text)}</li>)}</ol></details></section>
    </div>
    <div className="report-actions"><button className={`button ${score.passed ? 'primary' : ''}`} onClick={() => onStart('assessment', a.caseId, true)}>{t("开始新的测评")}<Icon name="arrow" /></button>{a.mode === 'assessment' && score.passed && <button className="button" onClick={onCertificate}><Icon name="print" />{t("生成示范完成证明")}</button>}<a className="text-link" href="#/history">{t("全部学习记录")}</a></div>
    <p className="report-limit">{t("内部合格条件：总分 ≥80、诊断与修复正确、必要验证完成，且无关键安全错误。该分数不代表真实上岗能力。")}{' '}{t(DISCLAIMER)}{locale === 'zh' ? '。' : ''}</p>
  </main>;
}

function History({ records, sessions, nickname, onNickname, onReset, onStart }: { records: Attempt[]; sessions: Partial<Record<Mode, Attempt>>; nickname: string; onNickname: (v: string) => void; onReset: () => void; onStart: (mode: Mode, id: CaseId) => void }) {
  const { locale, t } = useLocale();
  const [filter, setFilter] = useState<'all' | 'guided' | 'assessment'>('all');
  const shown = records.filter(r => filter === 'all' || r.mode === filter);
  return <main className="history-page"><div className="page-eyebrow"><span>{t("我的学习")}</span><span className="eyebrow-line" />{t("仅保存在当前浏览器")}</div><div className="history-heading"><div><h1>{t("学习记录")}</h1><p>{t("保留每一次尝试，也看见下一次练习的方向。")}</p></div><a className="button primary" href="#/">{t("返回课程")}<Icon name="arrow" /></a></div><div className="history-profile"><label>{t("学习昵称")}<span className="muted">{t("选填")}</span><input maxLength={24} placeholder={t("本地学习者")} value={nickname} onChange={e => onNickname(e.target.value)} /></label><p><Icon name="info" />{t("昵称只用于本地示范证明。无需姓名、电话或其他个人信息。")}</p></div>
    {Object.values(sessions).length > 0 && <section className="resume-sessions"><h2>{t("尚未结束")}</h2>{Object.values(sessions).map(a => a && <button key={a.id} onClick={() => onStart(a.mode, a.caseId)}><Icon name="history" /><span>{t(MODES[a.mode])}<small>{a.mode === 'explore' ? t("正常模型 · 自由观察") : `${t("情境")}${CASES[a.caseId].index} · ${t(CASES[a.caseId].symptom)}`}</small></span><span>{t("继续")}<Icon name="arrow" size={16} /></span></button>)}</section>}
    <div className="history-toolbar"><div className="filter-tabs" role="group" aria-label={t("记录筛选")}>{(['all', 'guided', 'assessment'] as const).map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? t("全部尝试") : t(MODES[f])}</button>)}</div><span className="muted">{shown.length} {t("条记录")}</span></div>
    {shown.length ? <div className="history-table"><table><caption className="sr-only">{t("已完成的本地学习尝试")}</caption><thead><tr><th scope="col">{t("情境与模式")}</th><th scope="col">{t("完成时间")}</th><th scope="col">{t("成绩")}</th><th scope="col">{t("结果")}</th><th scope="col"><span className="sr-only">{t("操作")}</span></th></tr></thead><tbody>{shown.map(a => { const score = scoreAttempt(a); return <tr key={a.id} data-testid="history-row" className={score.passed ? 'history-passed' : 'history-failed'}><td data-label={t("情境与模式")}><strong>{t(CASES[a.caseId].symptom)}</strong><small>{t(MODES[a.mode])} · {shortId(a.id)}</small></td><td data-label={t("完成时间")}>{date(a.endedAt!, locale)}</td><td data-label={t("成绩")}><b>{score.total}</b><span className="muted"> / 100</span></td><td data-label={t("结果")}><span className={`pill ${score.passed ? 'pass' : 'review'}`}>{score.passed ? a.mode === 'assessment' ? t("原型内合格") : t("训练完成") : t("未合格")}</span>{a.safetyErrors.length > 0 && <small className="history-safety-note">{t("含关键安全错误")}</small>}</td><td data-label={t("操作")}><a className="text-link" href={`#/report/${a.id}`}>{t("查看报告")}<Icon name="arrow" size={15} /></a></td></tr>; })}</tbody></table></div> : <div className="empty-records"><span className="empty-icon"><Icon name="book" size={30} /></span><h2>{t("还没有")}{filter === 'all' ? '' : `${t(MODES[filter])} `}{t("记录")}</h2><p>{t("结束一次训练或独立测评后，报告会保存在这里。结构认知只保存探索进度。")}</p><a className="button" href="#/">{t("开始第一课")}</a></div>}
    <footer className="history-footer"><p>{t("数据保存在本设备、当前浏览器及同一访问地址中。清除浏览器数据或更换端口会影响记录读取。")}<br />{t("本地数据可修改，不具备正式认证或防篡改效力。")}</p><button className="danger-link" onClick={onReset}>{t("清空学习记录")}</button></footer></main>;
}
