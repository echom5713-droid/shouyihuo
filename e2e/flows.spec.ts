import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { scoreAttempt } from '../src/domain/engine';
import type { Attempt } from '../src/domain/types';
import type { LocalStore } from '../src/storage/local';

const oldStore = JSON.parse(readFileSync(new URL('./fixtures/v0.1-store.json', import.meta.url), 'utf8')) as LocalStore;
const shots = process.env.E2E_SCREENSHOT_DIR || 'docs/screenshots/v0.2';
const validationOutput = process.env.E2E_VALIDATION_DIR || 'docs/validation-v0.2';
// The learner interface now defaults to English, irrespective of browser locale.
// Keep the original Chinese regression journeys explicit without touching v1 data.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('shouyihuo.locale.v1', 'zh'));
});
async function screenshot(page: Page, name: string, fullPage = true) { await mkdir(shots, { recursive: true }); await page.screenshot({ path: `${shots}/${name}.png`, fullPage }); }
async function collect(page: Page, part: 'drain' | 'inlet' = 'drain') {
  await page.getByRole('button', { name: '查看水位', exact: true }).click();
  await page.getByRole('button', { name: '检查供水', exact: true }).click();
  await page.getByTestId(`part-${part}`).click();
  await page.getByRole('button', { name: '记录部件观察', exact: true }).click();
}
async function diagnose(page: Page, id: string) {
  await page.getByLabel('选择诊断', { exact: true }).selectOption(id);
  await page.getByRole('button', { name: '提交诊断', exact: true }).click();
  await page.getByRole('tab', { name: '模拟处理', exact: true }).click();
}
async function completeComponent(page: Page, id: 'seal' | 'inlet' = 'seal') {
  const part = id === 'seal' ? 'drain' : 'inlet';
  await collect(page, part);
  if (id === 'inlet') {
    await page.getByTestId('part-overflow').click();
    await page.getByRole('button', { name: '记录部件观察', exact: true }).click();
  }
  await diagnose(page, id);
  await page.getByLabel('操作组件', { exact: true }).selectOption(part);
  await page.getByRole('button', { name: '关闭供水', exact: true }).click();
  await page.getByRole('button', { name: '检查供水', exact: true }).click();
  await page.getByRole('button', { name: '模拟排水', exact: true }).click();
  await expect(page.getByTestId('water-reading')).toHaveText('已排空');
  await page.locator('.stage-bottom').getByRole('button', { name: '打开箱盖' }).click();
  await page.getByRole('button', { name: part === 'drain' ? '拆卸排水组件' : '拆卸进水组件', exact: true }).click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute(`data-${part}-installed`, 'false');
  await page.getByRole('button', { name: '模拟更换', exact: true }).click();
  await page.getByRole('button', { name: '重新装配', exact: true }).click();
  await page.getByRole('button', { name: '恢复供水', exact: true }).click();
  await page.getByRole('button', { name: '运行复测', exact: true }).click();
  await expect(page.getByTestId('retest-message')).toContainText('复测通过', { timeout: 20000 });
}
async function finish(page: Page) {
  await page.getByRole('button', { name: '结束并查看报告', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '结束并查看报告', exact: true }).click();
  await expect(page.getByTestId('total-score')).toBeVisible();
}

test('真实 WebGL、模型点击、完整密封案例、持久化、证明与本地请求', async ({ page }) => {
  const external: string[] = [], errors: string[] = [];
  page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== '127.0.0.1') external.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.locator('canvas')).toBeVisible();
  // A rendered scene must have painted before screenshots and raycast interaction.
  await expect(page.getByTestId('anchor-inlet')).toHaveAttribute('data-x', /\d/);
  await screenshot(page, '01-course-1440');
  await page.setViewportSize({ width: 1280, height: 800 });
  await screenshot(page, '01b-course-1280');
  await page.setViewportSize({ width: 1366, height: 768 });
  await screenshot(page, '01c-course-1366');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: '开始独立测评', exact: true }).click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.locator('.learning-hint')).toHaveCount(0);
  await expect(page.locator('.diagnosis-answer')).toHaveCount(0);
  await expect(page.locator('.lab-titlebar h1')).toHaveText('持续有水流声');
  await page.locator('.stage-bottom').getByRole('button', { name: '打开箱盖' }).click();
  // Use the model's projected mesh anchor, then click the canvas itself (not the label).
  await page.getByTestId('part-tank').click();
  const canvas = page.locator('canvas');
  await expect(page.getByTestId('anchor-inlet')).toHaveAttribute('data-x', /\d/);
  const x = Number(await page.getByTestId('anchor-inlet').getAttribute('data-x'));
  const y = Number(await page.getByTestId('anchor-inlet').getAttribute('data-y'));
  await canvas.click({ position: { x, y } });
  await expect(page.getByTestId('part-detail')).toHaveAttribute('data-selection-source', 'model');
  await expect(page.getByTestId('part-detail').getByRole('heading')).toHaveText('进水组件');
  await expect(page.getByTestId('part-inlet')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-selected', 'inlet');
  await page.getByRole('tab', { name: '模拟处理', exact: true }).click();
  await expect(page.getByLabel('操作组件', { exact: true })).toHaveValue('inlet');
  await page.getByLabel('操作组件', { exact: true }).selectOption('drain');
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-selected', 'drain');
  await expect(page.getByTestId('part-drain')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('part-detail').getByRole('heading')).toHaveText('排水组件与密封件');
  await page.getByRole('tab', { name: '观察与诊断', exact: true }).click();
  await page.getByTestId('part-inlet').click();
  // Put the lid back so the complete path must deliberately open it after isolation.
  await page.locator('.stage-bottom').getByRole('button', { name: '放回箱盖' }).click();
  await screenshot(page, '02-workbench-1440');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole('button', { name: '查看水位', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: '运行复测', exact: true })).not.toHaveClass(/primary/);
  await expect(page.getByRole('button', { name: '结束并查看报告', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot(page, '03-workbench-1280', false);
  await completeComponent(page);
  await finish(page);
  await expect(page.getByTestId('total-score')).toHaveText('100');
  await expect(page.getByText('本原型测评合格', { exact: true })).toBeVisible();
  await screenshot(page, '04-report-1280');
  await page.setViewportSize({ width: 1440, height: 900 });
  await screenshot(page, '05-report-1440');
  await page.setViewportSize({ width: 1366, height: 768 });
  await screenshot(page, '05b-report-1366');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: '生成示范完成证明' }).click();
  await expect(page.locator('.certificate')).toContainText('不属于职业资格');
  await page.getByLabel('证明昵称（可选）').pressSequentially('本地体验者');
  await expect(page.locator('.certificate-name')).toHaveText('本地体验者');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.certificate')).toBeVisible();
  await screenshot(page, '06-certificate-print');
  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('button', { name: '关闭弹窗' }).click();
  await page.reload();
  await expect(page.getByTestId('total-score')).toHaveText('100');
  await page.getByRole('link', { name: '全部学习记录', exact: true }).click();
  await expect(page.getByTestId('history-row')).toHaveCount(1);
  await page.reload();
  await expect(page.getByTestId('history-row')).toHaveCount(1);
  await screenshot(page, '07-history-1440');
  await page.setViewportSize({ width: 1366, height: 768 });
  await screenshot(page, '07b-history-1366');
  expect(external, '本地页面不得请求外部课程、字体、模型或接口').toEqual([]);
  expect(errors).toEqual([]);
});

test('非法拆卸被阻止，刷新与复位不能消除关键错误，报告保留原因', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始独立测评', exact: true }).click();
  await page.getByRole('tab', { name: '模拟处理', exact: true }).click();
  await page.getByLabel('操作组件', { exact: true }).selectOption('drain');
  await page.getByRole('button', { name: '拆卸排水组件', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('拆卸被阻止');
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-drain-installed', 'true');
  await page.getByRole('button', { name: '整体视角', exact: true }).click();
  await page.reload();
  await expect(page.getByText('1 项安全错误', { exact: false })).toBeVisible();
  await expect(page.getByTestId('persistent-safety-error')).toBeVisible();
  await screenshot(page, '20-safety-error-workbench');
  await completeComponent(page);
  await finish(page);
  await expect(page.getByTestId('total-score')).toHaveText('100');
  await expect(page.locator('.report-verdict')).toContainText('未合格');
  await expect(page.locator('.report-page')).toHaveClass(/report-failed/);
  await expect(page.locator('.report-page')).not.toHaveClass(/report-passed/);
  await expect(page.locator('.safety-errors')).toContainText('拆卸被阻止');
  await expect(page.getByRole('button', { name: '生成示范完成证明' })).toHaveCount(0);
  await screenshot(page, '08-safety-report');
});

test('进水控制情境：观察真实溢流、处理进水组件并通过完整复测', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '02 水位持续升高' }).click();
  await page.getByRole('button', { name: '开始独立测评', exact: true }).click();
  await expect(page.getByTestId('water-reading')).toHaveText('到达溢流位置');
  await expect(page.locator('.diagnosis-answer')).toHaveCount(0);
  await screenshot(page, '12-overflow-model');
  await completeComponent(page, 'inlet');
  await finish(page);
  await expect(page.getByTestId('total-score')).toHaveText('100');
  await expect(page.getByText('本原型测评合格', { exact: true })).toBeVisible();
});

test('供水情境无需更换零件；引导与结构认知不生成合格证明', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '03 排水后没有补水' }).click();
  await page.getByRole('button', { name: '开始引导训练', exact: true }).click();
  await screenshot(page, '19-guided-workbench-1440', false);
  await page.setViewportSize({ width: 1366, height: 768 });
  await screenshot(page, '19b-guided-workbench-1366', false);
  await page.setViewportSize({ width: 1440, height: 900 });
  await collect(page, 'inlet');
  await diagnose(page, 'supply');
  const before = Number(await page.getByTestId('tank-model').getAttribute('data-water-level'));
  await page.getByRole('button', { name: '恢复供水', exact: true }).click();
  await expect(page.getByTestId('supply-reading')).toHaveText('供水打开');
  await expect.poll(async () => Number(await page.getByTestId('tank-model').getAttribute('data-water-level'))).toBeGreaterThan(before + 0.1);
  await page.getByRole('button', { name: '运行复测', exact: true }).click();
  await expect(page.getByTestId('retest-message')).toContainText('复测通过', { timeout: 20000 });
  await finish(page);
  await expect(page.getByTestId('total-score')).toHaveText('100');
  await expect(page.getByRole('button', { name: '生成示范完成证明' })).toHaveCount(0);
  await page.getByRole('link', { name: '课程学习', exact: true }).click();
  await page.getByRole('button', { name: '认识结构', exact: true }).click();
  await expect(page.getByRole('button', { name: '结束并查看报告' })).toHaveCount(0);
  await page.getByRole('link', { name: /学习记录/ }).click();
  await expect(page.getByTestId('history-row')).toHaveCount(1);
});

test('视图、正常排水、模型状态变化和窄屏折叠', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '认识结构', exact: true }).click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  await page.getByRole('button', { name: '爆炸视图', exact: true }).click();
  await expect(page.getByRole('button', { name: '爆炸视图', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-drain-installed', 'true');
  await page.getByRole('button', { name: '部件标签', exact: true }).click();
  await expect(page.getByTestId('anchor-inlet')).toBeVisible();
  await screenshot(page, '09-exploded-model');
  await page.getByRole('button', { name: '爆炸视图', exact: true }).click();
  await page.getByRole('button', { name: '部件标签', exact: true }).click();
  await page.getByRole('tab', { name: '模拟处理', exact: true }).click();
  await page.waitForTimeout(700); // Allow the purely visual assembly tween to settle.
  const fullWaterImage = await page.locator('canvas').screenshot();
  await screenshot(page, '10a-full-model');
  await page.getByRole('button', { name: '关闭供水', exact: true }).click();
  await page.getByRole('button', { name: '模拟排水', exact: true }).click();
  await expect(page.getByTestId('water-reading')).toHaveText('已排空');
  await page.waitForTimeout(400); // Water mesh presentation follows the deterministic state smoothly.
  expect((await page.locator('canvas').screenshot()).equals(fullWaterImage)).toBe(false);
  await screenshot(page, '10-drained-model');
  await page.setViewportSize({ width: 900, height: 800 });
  await expect(page.locator('.lab-sidebar')).toBeHidden();
  await page.getByRole('button', { name: '学习目标与部件列表' }).click();
  await expect(page.locator('.lab-sidebar')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await screenshot(page, '11-mobile-390');
});

test('损坏存储不白屏、确认后只清本项目数据', async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('shouyihuo.local.v1', '{bad'); localStorage.setItem('another-project', 'keep'); sessionStorage.setItem('seeded', 'yes'); } });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('本地数据损坏');
  await expect(page.getByRole('button', { name: '认识结构', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '重置本地数据', exact: true }).click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('本地数据损坏');
  await page.getByRole('button', { name: '重置本地数据', exact: true }).click();
  await page.getByRole('button', { name: '确认清空', exact: true }).click();
  await expect(page.getByRole('heading', { name: '学习记录', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('another-project'))).toBe('keep');
});

test('WebGL 不可用时二维界面可操作', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) { if (/webgl/.test(type)) return null; return original.call(this, type as '2d', ...args); } as typeof original;
  });
  await page.goto('/');
  await page.getByRole('button', { name: '认识结构', exact: true }).click();
  await expect(page.getByTestId('webgl-fallback')).toBeVisible();
  await expect(page.getByRole('button', { name: '整体视角', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '俯视内部', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '聚焦选中部件', exact: true })).toBeDisabled();
  await page.getByTestId('part-float').click();
  await expect(page.getByTestId('part-detail').getByRole('heading')).toHaveText('浮球与连杆');
  await page.getByRole('button', { name: '记录部件观察', exact: true }).click();
  await expect(page.getByTestId('evidence-count')).toHaveText('1');
});

async function persisted(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('shouyihuo.local.v1')!) as LocalStore);
}
function protectedState(a: Attempt) {
  // The deterministic simulation clock keeps running. Presentation controls must
  // preserve all evidence, scoring, safety, assembly and operation history.
  return {
    id: a.id, mode: a.mode, caseId: a.caseId, status: a.status,
    supplyOpen: a.supplyOpen, isolatedConfirmed: a.isolatedConfirmed, lidOpen: a.lidOpen,
    defects: a.defects, assembly: a.assembly, evidence: a.evidence,
    diagnosis: a.diagnosis, firstDiagnosis: a.firstDiagnosis, diagnosisTries: a.diagnosisTries,
    process: a.process, logs: a.logs, safetyErrors: a.safetyErrors,
    retest: a.retest, score: scoreAttempt(a)
  };
}

test('v0.1 数据兼容：旧记录、昵称、进行中尝试和安全错误原样保留', async ({ page }) => {
  await page.addInitScript(data => {
    if (!sessionStorage.getItem('v01-seeded')) {
      localStorage.setItem('shouyihuo.local.v1', JSON.stringify(data));
      sessionStorage.setItem('v01-seeded', 'yes');
    }
  }, oldStore);
  await page.goto('/');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '继续引导训练', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '继续引导训练', exact: true }).click();
  await expect(page.getByText('1 项安全错误', { exact: false })).toBeVisible();
  await expect(page.getByTestId('evidence-count')).toHaveText('1/3');
  const before = protectedState((await persisted(page)).sessions.guided!);
  await page.getByRole('button', { name: '聚焦选中部件', exact: true }).click();
  await page.getByRole('button', { name: '俯视内部', exact: true }).click();
  await page.getByRole('button', { name: '整体视角', exact: true }).click();
  await page.getByRole('button', { name: '放大工作区', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.reload();
  expect(protectedState((await persisted(page)).sessions.guided!)).toEqual(before);
  await page.getByRole('link', { name: /学习记录/ }).click();
  await expect(page.getByTestId('history-row')).toHaveCount(1);
  await expect(page.getByLabel('学习昵称')).toHaveValue('旧版学习者');
  await page.getByRole('link', { name: '查看报告', exact: true }).click();
  await expect(page.getByTestId('total-score')).toHaveText('100');
  await expect(page.getByRole('button', { name: '生成示范完成证明' })).toBeVisible();
  await page.reload();
  const after = await persisted(page);
  expect(after.schemaVersion).toBe(1);
  expect(after.records).toEqual(oldStore.records);
  expect(after.nickname).toBe(oldStore.nickname);
  expect(after.records).toHaveLength(1);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('shouyihuo.')).sort())).toEqual(['shouyihuo.local.v1', 'shouyihuo.locale.v1']);
});

test('阶段提示、镜头与放大保持状态，键盘可操作并恢复焦点', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始独立测评', exact: true }).click();
  await expect(page.getByTestId('phase-indicator')).toHaveAttribute('data-phase', 'observe');
  await expect(page.locator('.learning-hint')).toHaveCount(0);
  await expect(page.locator('.diagnosis-answer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '运行复测', exact: true })).not.toHaveClass(/primary/);
  await page.getByRole('button', { name: '查看水位', exact: true }).click();
  await page.getByRole('button', { name: '检查供水', exact: true }).click();
  await expect(page.getByTestId('phase-indicator')).toHaveAttribute('data-phase', 'diagnose');
  await page.locator('.stage-bottom').getByRole('button', { name: '打开箱盖' }).click();
  const before = protectedState((await persisted(page)).sessions.assessment!);
  await page.getByRole('tab', { name: '观察与诊断', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '模拟处理', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: '观察与诊断', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByLabel('选择诊断', { exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel('选择诊断', { exact: true })).toHaveValue('seal');
  await expect(page.getByTestId('phase-indicator')).toHaveAttribute('data-phase', 'diagnose');
  const canvas = page.locator('canvas');
  const initialCanvas = await canvas.elementHandle();
  const overviewPosition = await canvas.getAttribute('data-camera-position');
  await page.getByTestId('part-overflow').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('part-overflow')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '聚焦选中部件', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(canvas).toHaveAttribute('data-camera-view', 'focus');
  await expect(canvas).toHaveAttribute('data-focus-part', 'overflow');
  await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  expect(await canvas.getAttribute('data-camera-position')).not.toBe(overviewPosition);
  await screenshot(page, '14-focused-component', false);
  await page.getByRole('button', { name: '俯视内部', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera-view', 'top');
  await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  await screenshot(page, '15-top-view', false);
  await page.getByRole('button', { name: '结构剖视', exact: true }).click();
  await page.getByRole('button', { name: '爆炸视图', exact: true }).click();
  await page.getByRole('button', { name: '部件标签', exact: true }).click();
  await page.getByRole('button', { name: '放大工作区', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: '退出放大', exact: true })).toBeVisible();
  expect(await canvas.evaluate((node, original) => node === original, initialCanvas)).toBe(true);
  await screenshot(page, '16-expanded-workspace', false);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '放大工作区', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '整体视角', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera-view', 'overview');
  const simulationBefore = (await persisted(page)).sessions.assessment!.elapsed;
  const wallBefore = Date.now();
  for (let count = 0; count < 3; count++) {
    await page.getByRole('button', { name: '放大工作区', exact: true }).click();
    await page.getByRole('button', { name: '退出放大', exact: true }).click();
  }
  await page.locator('.feedback').evaluate(el => {
    el.setAttribute('data-test-mutations', '0');
    const observer = new MutationObserver(() => el.setAttribute('data-test-mutations', String(Number(el.getAttribute('data-test-mutations')) + 1)));
    observer.observe(el, { subtree: true, childList: true, characterData: true });
    setTimeout(() => observer.disconnect(), 1500);
  });
  await page.waitForTimeout(1000); // Detect duplicate simulation intervals after repeated layout toggles.
  await expect(page.locator('.feedback')).toHaveAttribute('data-test-mutations', '0');
  const simulationDelta = (await persisted(page)).sessions.assessment!.elapsed - simulationBefore;
  expect(simulationDelta).toBeLessThanOrEqual((Date.now() - wallBefore) / 1000 + 0.5);
  expect(simulationDelta).toBeGreaterThanOrEqual(0.5);
  expect(protectedState((await persisted(page)).sessions.assessment!)).toEqual(before);
  await page.getByRole('link', { name: '返回课程', exact: true }).click();
  await page.getByRole('button', { name: '继续独立测评', exact: true }).click();
  expect(protectedState((await persisted(page)).sessions.assessment!)).toEqual(before);
  await page.getByRole('button', { name: '重新开始', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '重新开始', exact: true })).toBeFocused();
  expect(protectedState((await persisted(page)).sessions.assessment!)).toEqual(before);
});

test('1440、1366、1280、1024 与 390px 响应式可操作，窄屏不泄露答案', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始独立测评', exact: true }).click();
  for (const [width, height] of [[1440, 900], [1366, 768], [1280, 800], [1024, 768]] as const) {
    await page.setViewportSize({ width, height });
    await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
    await expect(page.locator('canvas')).toBeInViewport();
    await expect(page.getByRole('button', { name: '查看水位', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: '检查供水', exact: true })).toBeInViewport();
    await expect(page.locator('.persistent-safety')).toBeInViewport();
    expect(await page.locator('.persistent-safety span').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width === 1440) {
      const contrast = await page.evaluate(() => {
        const rgb = (text: string) => (text.match(/[\d.]+/g) ?? []).map(Number);
        const luminance = (channels: number[]) => channels.slice(0, 3).map(n => n / 255).map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
        return ['.persistent-safety span', '.selected-part-description', '.current-task span'].map(selector => {
          const el = document.querySelector(selector)!;
          const style = getComputedStyle(el);
          let ancestor: Element | null = el, background = 'rgb(255, 255, 255)';
          while (ancestor) { const bg = getComputedStyle(ancestor).backgroundColor; const values = rgb(bg); if (values.length === 3 || values[3] === 1) { background = bg; break; } ancestor = ancestor.parentElement; }
          const front = luminance(rgb(style.color)), back = luminance(rgb(background));
          return { selector, color: style.color, background, fontSize: style.fontSize, ratio: (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05) };
        });
      });
      for (const sample of contrast) expect(sample.ratio, `${sample.selector} 实际文字对比度`).toBeGreaterThanOrEqual(4.5);
      await mkdir(validationOutput, { recursive: true });
      await writeFile(`${validationOutput}/contrast.json`, JSON.stringify(contrast, null, 2) + '\n');
    }
    await screenshot(page, `17-workbench-${width}x${height}`, false);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator('.lab-sidebar')).toBeHidden();
  await page.getByRole('button', { name: '学习目标与部件列表' }).click();
  await expect(page.locator('.lab-sidebar')).toBeVisible();
  await page.getByTestId('part-drain').click();
  await expect(page.getByTestId('part-detail').getByRole('heading')).toHaveText('排水组件与密封件');
  await expect(page.locator('.learning-hint')).toHaveCount(0);
  await expect(page.locator('.diagnosis-answer')).toHaveCount(0);
  await screenshot(page, '18-mobile-390', true);
  await page.getByRole('button', { name: '查看水位', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('水位');
  expect((await persisted(page)).records).toHaveLength(0);
});

test('减少动态效果设置保留真实3D与即时镜头操作', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: '认识结构', exact: true }).click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-reduced-motion', 'true');
  await page.getByTestId('part-inlet').click();
  await page.getByRole('button', { name: '聚焦选中部件', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-view', 'focus');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-moving', 'false');
  await page.getByRole('button', { name: '整体视角', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-view', 'overview');
  expect((await persisted(page)).records).toHaveLength(0);
});

test('独立测评首次错误诊断保持锁定，所有情境开始时没有定向提示', async ({ page }) => {
  const labels = ['01 持续有水流声', '02 水位持续升高', '03 排水后没有补水'];
  for (const label of labels) {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('shouyihuo.local.v1'));
    await page.reload();
    await page.getByRole('button', { name: label }).click();
    await page.getByRole('button', { name: '开始独立测评', exact: true }).click();
    await expect(page.getByTestId('phase-indicator')).toHaveAttribute('data-phase', 'observe');
    await expect(page.getByTestId('tank-model')).toHaveAttribute('data-selected', 'inlet');
    await expect(page.locator('.learning-hint')).toHaveCount(0);
    await expect(page.locator('.diagnosis-answer')).toHaveCount(0);
    await expect(page.getByTestId('evidence-count')).toHaveText('0');
    await expect(page.locator('.current-task')).not.toContainText(/密封失效|进水控制失效|供水阀关闭|更换排水|更换进水/);
  }
  await page.getByRole('button', { name: '查看水位', exact: true }).click();
  await page.getByRole('button', { name: '检查供水', exact: true }).click();
  await page.getByLabel('选择诊断', { exact: true }).selectOption('seal');
  await page.getByRole('button', { name: '提交诊断', exact: true }).click();
  await expect(page.locator('.diagnosis-answer')).toContainText('诊断不正确');
  await expect(page.getByLabel('选择诊断', { exact: true })).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('选择诊断', { exact: true })).toHaveValue('seal');
  await expect(page.getByLabel('选择诊断', { exact: true })).toBeDisabled();
  const a = (await persisted(page)).sessions.assessment!;
  expect(a.firstDiagnosis).toBe('seal');
  expect(a.diagnosisTries).toBe(1);
  expect(scoreAttempt(a).sections[1].earned).toBe(0);
});
