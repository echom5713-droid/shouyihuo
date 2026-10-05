// Local, presentation-only language preference. The simulation storage is never touched.
const LOCALE_KEY = 'shouyihuo.locale.v1';
const zh = {
  renderEyebrow: '进一步检查工程实现',
  renderTitle: '模拟负责时间推进，<br />渲染响应可见变化。',
  renderDescription: '水流、镜头移动与部件过渡会请求绘制新帧；画面稳定后停止不必要的绘制。精简的视觉状态投影让日志、经过时间等更新不再唤醒静止场景。',
  renderTradeoff: '<strong>设计取舍：</strong>按需渲染减少无用绘制，但必须正确响应每种可见变化。因此测试同时检查两个方向：静止时停止绘制，操作与模拟变化后重新开始绘制。',
  modelDetail: '新版细化固定支点浮球连杆、真实空心管口、实例化链环和由内存生成的细编织软管表面。双击部件可近看；镜头手势不会记录证据或改变成绩。几何决策与真实模型验证详见 <code>docs/MODEL_DETAIL_REFINEMENT.md</code>。',
  renderEvidence: '测量方法、渲染取舍和限制见 <code>docs/RENDERING_REFINEMENT.md</code>。另外，有限的事件序列测试检查模拟的安全与持久化不变量；这并非对所有可能行为的形式化证明。',
  skip: '跳到主要内容', overview: '手艺活项目概览', navigation: '项目审阅导航', language: '界面语言',
  navEngineering: '工程设计', navEvidence: '验证证据', navTry: '体验原型',
  heroEyebrow: '交互系统 · Web3D · 软件验证',
  heroTitle: '可以操作、也可以检验的<br class="desktop-break" />维修实训模拟。',
  heroDescription: '手艺活以简化马桶水箱为载体，把故障诊断变成可操作的练习：观察模型、收集证据、判断故障、模拟处理，再验证结果。',
  openPrototype: '打开可操作原型 <span aria-hidden="true">↗</span>',
  readBrief: '阅读项目简介 <span class="file-type">PDF · 英文</span>',
  languageNote: '<strong>默认英文，也支持中文。</strong>本审阅页与交互原型共用语言偏好。切换语言不会更改学习进度或测评记录。',
  atGlance: '项目一览', scopeEyebrow: '已实现的范围', experience: '体验范围', experienceValue: '一门课程 · 三个案例', interaction: '交互呈现', interactionValue: '实时程序化 3D', logic: '业务逻辑', logicValue: '确定性、事件驱动', data: '数据保存', dataValue: '浏览器本地存储',
  workbenchLink: '打开完整尺寸的实训工作台截图', workbenchAlt: '真实运行且不计分的结构认知：中央是细化的程序化水箱，部件选择与列表和观察操作联动。',
  workbenchCaption: '<b>01 / 可操作的原型</b> · 不计分的结构认知；3D 模型选择与说明面板同步。', captureDate: '运行中的双语应用 · 2026 年 10 月 5 日',
  questionEyebrow: '设计问题', questionTitle: '如何让学习者练习维修背后的推理过程？',
  problemOne: '静态图示能标出部件名称，却不能显示操作的后果。本原型将可见的水位变化与明确的观察、决策和检查步骤联系起来。',
  problemTwo: '范围刻意保持精简：一个无品牌重力式水箱，采用浮球控制进水与翻板式排水结构。三个确定性案例分别呈现持续失水、溢流与无法补水。结构认知、引导训练和独立测评共用同一模型。',
  boundary: '<strong>仅为教学原型。</strong>内容未经维修专业人士审核，也未经真实设备验证。它不是通用维修指导、数字孪生或正式职业技能考核。',
  engineeringEyebrow: '实现取舍', engineeringTitle: '决定系统行为的三个设计选择', engineeringNote: '重点是行为可检查、结果可解释。',
  decisionOneTitle: '一套业务状态，多种呈现方式',
  decisionOne: '带类型的 reducer 管理本次尝试：供水、水位、部件装配、证据、诊断、错误和复测。3D 场景呈现这份状态；镜头、剖视、爆炸图与工作区放大属于独立的显示选择。',
  decisionOneResult: '<strong>为什么这样设计</strong>移动镜头不能悄悄修好故障或改变分数。',
  decisionTwoTitle: '被拒绝的操作仍保留在记录中',
  decisionTwo: '拆卸必须满足模型规定的前置条件。条件不足时，部件仍保持装配状态，并记录被拒绝的操作。关键安全错误会在刷新后保留，也会出现在最终报告中。',
  decisionTwoResult: '<strong>为什么这样设计</strong>即使分数是 100 分，也不能抵消关键安全错误。',
  decisionThreeTitle: '验证是交互流程的一部分',
  decisionThree: '完成修复并不等于完成尝试。受控时间步长驱动模拟工作循环，结果必须满足适用的装配、供水、水位稳定及补水检查。评分根据本次尝试记录计算。',
  decisionThreeResult: '<strong>为什么这样设计</strong>成功取决于可观察的状态和已完成的检查，而不是“下一步”按钮。',
  repoNote: '实现与测试可查看<a href="https://github.com/echom5713-droid/shouyihuo">源码仓库</a>中的 <code>src/domain/engine.ts</code>、<code>src/components/TankModel.tsx</code>、<code>tests/</code> 和 <code>e2e/flows.spec.ts</code>。安装与复现命令见 <code>README.md</code>，中文说明见 <code>README.zh-CN.md</code>。',
  evidenceEyebrow: '已记录的证据', evidenceTitle: '可见的交互，明确的失败结果', evidenceNote: '以下为应用实际运行截图，不是界面设计稿。',
  explodedLink: '打开完整尺寸的爆炸视图截图', explodedAlt: '水箱的爆炸视图将部件在视觉上分离，便于观察内部结构。', explodedCaption: '02 / 显示方式不等于模拟状态', explodedDescription: '爆炸视图帮助理解结构；它不会执行拆卸，也不能绕过拆卸的前置条件。',
  reportLink: '打开完整尺寸的关键安全错误报告截图', reportAlt: '实际报告得分为 100 分，但显示琥珀色未合格结果，并保留关键安全错误。该尝试并未被判为合格。', reportCaption: '03 / 分数不是最终结论', reportDescription: '这次尝试获得了 100 分，但由于保留了关键安全错误，最终结果仍为未合格。',
  validationTitle: '建模精修验收 · 2026 年 10 月 5 日', validationDescription: '本轮重新检查原有课程规则与双语完整流程，验证浮球连杆的真实世界坐标、模型双击聚焦，以及静止时停止绘制、标签更新和真实上下文丢失。可在源码仓库复现命令并查看带日期的实际日志。', unitPassed: '单元测试通过', browserPassed: '浏览器测试通过',
  evidenceLimit: '类型检查与生产构建也已通过。浏览器验证覆盖完整流程、双语报告、记录持久化、非法拆卸拒绝及 390 至 1440 像素布局。这些结果验证已覆盖的软件行为，不代表学习效果、物理准确性或所有设备的兼容性。',
  walkthroughEyebrow: '约五分钟的审阅路径', walkthroughTitle: '体验一个完整的引导案例', launch: '进入应用 <span aria-hidden="true">↗</span>',
  walkthroughIntro: '本路径仅公开<strong>无法补水案例</strong>的答案。请使用引导训练体验完整交互。下面的控件名称对应当前语言；启动自动复测后，请等待它完成。',
  stepOneTitle: '选择案例与模式', stepOne: '在课程页选择 <span class="ui-label">03 排水后没有补水</span>，然后点击 <span class="ui-label">开始引导训练</span>。',
  stepTwoTitle: '收集三项观察', stepTwo: '点击 <span class="ui-label">查看水位</span> 和 <span class="ui-label">检查供水</span>。在部件列表选择 <span class="ui-label">05 进水组件</span>，然后点击 <span class="ui-label">记录部件观察</span>。',
  stepThreeTitle: '提交诊断', stepThree: '在 <span class="ui-label">选择诊断</span> 中选择 <span class="ui-label">供水阀关闭</span>，然后点击 <span class="ui-label">提交诊断</span>。',
  stepFourTitle: '恢复供水并验证', stepFour: '打开 <span class="ui-label">模拟处理</span> 标签页，点击 <span class="ui-label">恢复供水</span>，观察 3D 水位上升。点击 <span class="ui-label">运行复测</span>，等待 <span class="ui-label">复测通过</span>。这个案例无需更换部件。',
  stepFiveTitle: '查看结果与保留的记录', stepFive: '点击 <span class="ui-label">结束并查看报告</span>，并在对话框确认。查看评分明细，再刷新页面或打开 <span class="ui-label">学习记录</span>。引导训练不生成课程完成证明。',
  controlsTitle: '实用 3D 操作 <span>英文 ↔ 中文</span>', controlsInstructions: '拖动旋转，滚轮缩放。双击部件可聚焦，也可选择后使用「聚焦选中部件」。俯视内部不会自动打开箱盖；按 Esc 可退出放大工作区。',
  limitsEyebrow: '范围与贡献', limitsTitle: '可以检查的原型，<br />清楚说明的边界。',
  aiContribution: '<strong>AI 辅助开发。</strong>Codex 根据项目负责人的要求，协助实现、迭代、测试与文档编写。仓库记录了最终系统与验证证据，不代表未经辅助的独立创作。',
  localLimit: '<strong>本地、示范性记录。</strong>记录保存在浏览器中且可被修改。本地示范完成证明不是正式资格认证，也不是职业胜任能力证明。本项目不包含后端、登录、支付、在线 AI 服务或真实维修验证。',
  nextEvaluation: '<strong>下一步评估。</strong>在声称具有教育效果前，需要领域专家审核与经过同意的小规模可用性研究。物理模型校准与设备测试仍是独立、尚待完成的工程工作。',
  footerDate: '双语工程项目审阅 · 2026 年 10 月 5 日', footerBrief: '项目简介（英文 PDF） <span aria-hidden="true">↗</span>',
};

const elements = [...document.querySelectorAll('[data-i18n], [data-i18n-aria], [data-i18n-alt]')];
const original = new Map(elements.map((element) => [element, {
  html: element.innerHTML, aria: element.getAttribute('aria-label'), alt: element.getAttribute('alt'),
}]));
const englishTitle = document.title;
const description = document.querySelector('meta[name="description"]');
const englishDescription = description.content;
const status = document.querySelector('#locale-status');
let currentLocale = 'en';
let storageUnavailable = false;
try {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored === 'zh' || stored === 'en') currentLocale = stored;
} catch {
  storageUnavailable = true;
}

function applyLocale(locale, persist = false) {
  currentLocale = locale === 'zh' ? 'zh' : 'en';
  document.documentElement.lang = currentLocale === 'zh' ? 'zh-Hans' : 'en';
  document.title = currentLocale === 'zh' ? '手艺活 — 工程项目审阅' : englishTitle;
  description.content = currentLocale === 'zh'
    ? '手艺活双语工程项目介绍：本地 Web3D 维修实训原型，采用确定性模拟与可解释测评。'
    : englishDescription;
  for (const element of elements) {
    const saved = original.get(element);
    for (const [datasetKey, attribute, fallback] of [
      ['i18n', null, saved.html], ['i18nAria', 'aria-label', saved.aria], ['i18nAlt', 'alt', saved.alt],
    ]) {
      const key = element.dataset[datasetKey];
      if (!key) continue;
      const value = currentLocale === 'zh' ? (zh[key] ?? fallback) : fallback;
      // All HTML strings are authored in this local file; no user or remote content is interpolated.
      if (attribute) element.setAttribute(attribute, value);
      else element.innerHTML = value;
    }
  }
  document.querySelectorAll('[data-locale]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.locale === currentLocale));
  });
  if (persist) {
    try {
      localStorage.setItem(LOCALE_KEY, currentLocale);
      storageUnavailable = false;
    } catch {
      storageUnavailable = true;
    }
  }
  status.hidden = !storageUnavailable;
  status.textContent = storageUnavailable
    ? currentLocale === 'zh'
      ? '语言已在本页切换，但浏览器无法保存语言偏好。进入应用或刷新后可能恢复为英文。'
      : 'Language is available on this page, but the browser cannot save your preference. Opening the app or refreshing may return to English.'
    : '';
}

document.querySelectorAll('[data-locale]').forEach((button) => {
  button.addEventListener('click', () => applyLocale(button.dataset.locale, true));
});
window.addEventListener('storage', (event) => {
  if (event.key === LOCALE_KEY) applyLocale(event.newValue === 'zh' ? 'zh' : 'en');
});
applyLocale(currentLocale);
