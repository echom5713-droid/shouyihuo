import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { scoreAttempt } from '../src/domain/engine';
import type { Attempt } from '../src/domain/types';
import type { LocalStore } from '../src/storage/local';
import { translate } from '../src/i18n';

const oldStore = JSON.parse(readFileSync(new URL('./fixtures/v0.1-store.json', import.meta.url), 'utf8')) as LocalStore;
const shots = process.env.E2E_BILINGUAL_SCREENSHOT_DIR || 'docs/screenshots/bilingual-2026-10-05';
const en = (text: string) => translate(text, 'en');
const button = (page: Page, text: string) => page.getByRole('button', { name: en(text), exact: true });
async function shot(page: Page, name: string, fullPage = true) {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage });
}
async function store(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('shouyihuo.local.v1')!) as LocalStore);
}
function protectedState(a: Attempt) {
  // Water and elapsed simulation time can advance while a person switches language.
  // None of the assessment, operation, evidence or safety state may change.
  const { water: _water, elapsed: _elapsed, drainRemaining: _drainRemaining, ...rest } = a;
  return { ...rest, score: scoreAttempt(a) };
}
async function noUntranslatedChinese(page: Page, allowed: string[] = []) {
  let text = await page.locator('body').innerText();
  for (const word of ['中文', ...allowed]) text = text.replaceAll(word, '');
  expect(text.match(/[^\n]*[\u3400-\u9fff][^\n]*/g), 'English view must translate visible labels, logs, evidence and notices').toBeNull();
}
async function language(page: Page, locale: 'en' | 'zh') {
  await page.getByRole('button', { name: locale === 'en' ? 'English' : '中文', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale === 'en' ? 'en' : 'zh-CN');
  expect(await page.evaluate(() => localStorage.getItem('shouyihuo.locale.v1'))).toBe(locale);
}
async function collectSupply(page: Page) {
  await button(page, '查看水位').click();
  await button(page, '检查供水').click();
  await page.getByTestId('part-inlet').click();
  await button(page, '记录部件观察').click();
}
async function diagnoseSupply(page: Page) {
  await page.getByLabel(en('选择诊断'), { exact: true }).selectOption('supply');
  await button(page, '提交诊断').click();
  await expect(page.locator('.diagnosis-answer')).toContainText(en('诊断正确'));
  await page.getByRole('tab', { name: en('模拟处理'), exact: true }).click();
}
async function retestSupply(page: Page) {
  const before = Number(await page.getByTestId('tank-model').getAttribute('data-water-level'));
  await button(page, '恢复供水').click();
  await expect(page.getByTestId('supply-reading')).toHaveText(en('供水打开'));
  await expect.poll(async () => Number(await page.getByTestId('tank-model').getAttribute('data-water-level'))).toBeGreaterThan(before + 0.1);
  await button(page, '运行复测').click();
  await expect(page.getByTestId('retest-message')).toContainText(en('复测通过'), { timeout: 20000 });
}
async function finish(page: Page) {
  await button(page, '结束并查看报告').click();
  await noUntranslatedChinese(page);
  await page.getByRole('dialog').getByRole('button', { name: en('结束并查看报告'), exact: true }).click();
  await expect(page.getByTestId('total-score')).toBeVisible();
}

test('English defaults in a Chinese browser; full assessment, bilingual report and certificate preserve one record', async ({ page }) => {
  test.setTimeout(90000); // Includes four sizes and two printable language variants.
  const external: string[] = [], errors: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(button(page, '开始独立测评')).toContainText(/assessment/i);
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.getByTestId('anchor-inlet')).toHaveAttribute('data-x', /\d/);
  await noUntranslatedChinese(page);
  for (const [width, height] of [[1440, 900], [1366, 768], [1280, 800], [390, 844]] as const) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await shot(page, `40-home-en-${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: `03 ${en('排水后没有补水')}` }).click();
  await button(page, '开始独立测评').click();
  await expect(page.locator('.learning-hint')).toHaveCount(0);
  await expect(page.locator('.diagnosis-answer')).toHaveCount(0);
  await expect(page.getByTestId('phase-indicator')).toHaveAttribute('data-phase', 'observe');
  await expect(button(page, '运行复测')).not.toHaveClass(/primary/);
  await expect(page.locator('.current-task')).not.toContainText(en('供水阀关闭'));
  for (const [width, height] of [[1440, 900], [1366, 768], [1280, 800], [390, 844]] as const) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width >= 1280) {
      await expect(button(page, '查看水位')).toBeInViewport();
      await expect(button(page, '检查供水')).toBeInViewport();
      await expect(page.locator('.persistent-safety')).toBeInViewport();
    }
    await noUntranslatedChinese(page);
    await shot(page, `41-workbench-en-${width}`, width === 390);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await collectSupply(page);
  await expect(page.getByTestId('evidence-count')).toHaveText('3');
  const observed = protectedState((await store(page)).sessions.assessment!);
  await language(page, 'zh');
  await expect(page.getByRole('button', { name: '查看水位', exact: true })).toBeVisible();
  expect(protectedState((await store(page)).sessions.assessment!)).toEqual(observed);
  await language(page, 'en');
  expect(protectedState((await store(page)).sessions.assessment!)).toEqual(observed);
  await diagnoseSupply(page);
  const diagnosed = protectedState((await store(page)).sessions.assessment!);
  await language(page, 'zh');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  expect(protectedState((await store(page)).sessions.assessment!)).toEqual(diagnosed);
  await language(page, 'en');
  await page.getByRole('tab', { name: en('模拟处理'), exact: true }).click();
  await retestSupply(page);
  await noUntranslatedChinese(page);
  await finish(page);
  await expect(page.getByTestId('total-score')).toHaveText('100');
  await expect(page.locator('.report-page')).toHaveClass(/report-passed/);
  await noUntranslatedChinese(page);
  const completed = (await store(page)).records;
  expect(completed).toHaveLength(1);
  for (const [width, height] of [[1440, 900], [1366, 768], [1280, 800], [390, 844]] as const) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await shot(page, `42-report-en-${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await button(page, '生成示范完成证明').click();
  await expect(page.locator('.certificate-notice')).toContainText(/qualification|licence|license/i);
  await noUntranslatedChinese(page);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.certificate')).toBeVisible();
  await shot(page, '43-certificate-en-print');
  await page.emulateMedia({ media: 'screen' });
  await button(page, '关闭弹窗').click();
  await language(page, 'zh');
  await expect(page.getByText('本原型测评合格', { exact: true })).toBeVisible();
  await shot(page, '44-report-zh');
  await page.getByRole('button', { name: '生成示范完成证明', exact: true }).click();
  await expect(page.locator('.certificate')).toContainText('不属于职业资格');
  await shot(page, '45-certificate-zh');
  await page.getByRole('button', { name: '关闭弹窗', exact: true }).click();
  await language(page, 'en');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect((await store(page)).records).toEqual(completed);
  await page.getByRole('link', { name: en('全部学习记录'), exact: true }).click();
  await expect(page.getByTestId('history-row')).toHaveCount(1);
  await noUntranslatedChinese(page);
  await shot(page, '46-history-en');
  await page.reload();
  expect((await store(page)).records).toEqual(completed);
  expect((await store(page)).schemaVersion).toBe(1);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('English critical safety failure survives language switches and remains failed at 100 points', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: `03 ${en('排水后没有补水')}` }).click();
  await button(page, '开始独立测评').click();
  await page.getByRole('tab', { name: en('模拟处理'), exact: true }).click();
  await button(page, '拆卸进水组件').click();
  await expect(page.getByRole('status')).toContainText(/blocked/i);
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-inlet-installed', 'true');
  const rejected = protectedState((await store(page)).sessions.assessment!);
  expect(rejected.safetyErrors).toHaveLength(1);
  await language(page, 'zh');
  await page.reload();
  expect(protectedState((await store(page)).sessions.assessment!)).toEqual(rejected);
  await language(page, 'en');
  await expect(page.getByTestId('persistent-safety-error')).toContainText(/safety/i);
  await page.getByTestId('persistent-safety-error').locator('summary').click();
  await page.locator('.operation-log summary').click();
  await noUntranslatedChinese(page);
  await shot(page, '47-safety-error-en');
  await collectSupply(page);
  await diagnoseSupply(page);
  await retestSupply(page);
  await finish(page);
  await expect(page.getByTestId('total-score')).toHaveText('100');
  await expect(page.locator('.report-page')).toHaveClass(/report-failed/);
  await expect(page.locator('.report-verdict')).toContainText(/safety/i);
  await expect(button(page, '生成示范完成证明')).toHaveCount(0);
  await noUntranslatedChinese(page);
  await shot(page, '48-safety-report-en');
  const completed = (await store(page)).records;
  await language(page, 'zh');
  await expect(page.locator('.report-verdict')).toContainText('关键安全错误');
  expect((await store(page)).records).toEqual(completed);
});

test('v0.1 Chinese logs, evidence and nickname remain intact while the English view translates their presentation', async ({ page }) => {
  await page.addInitScript(data => {
    if (!sessionStorage.getItem('legacy-bilingual-seeded')) {
      localStorage.setItem('shouyihuo.local.v1', JSON.stringify(data));
      sessionStorage.setItem('legacy-bilingual-seeded', 'yes');
    }
  }, oldStore);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await noUntranslatedChinese(page, [oldStore.nickname]);
  await page.getByRole('button', { name: `${en('继续')}${en('引导训练')}`, exact: true }).click();
  await page.locator('.operation-log summary').click();
  await page.getByTestId('persistent-safety-error').locator('summary').click();
  await noUntranslatedChinese(page, [oldStore.nickname]);
  const state = await store(page);
  expect(state.records).toEqual(oldStore.records);
  expect(state.nickname).toBe(oldStore.nickname);
  expect(state.sessions.guided!.logs).toEqual(oldStore.sessions.guided!.logs);
  expect(state.sessions.guided!.evidence).toEqual(oldStore.sessions.guided!.evidence);
  expect(state.sessions.guided!.safetyErrors).toEqual(oldStore.sessions.guided!.safetyErrors);
  await language(page, 'zh');
  await page.reload();
  await expect(page.getByTestId('evidence-count')).toHaveText('1/3');
  expect((await store(page)).records).toEqual(oldStore.records);
  await language(page, 'en');
  await page.getByRole('link', { name: new RegExp(en('学习记录')) }).click();
  await expect(page.getByLabel(en('学习昵称'))).toHaveValue(oldStore.nickname);
  await page.getByRole('link', { name: en('查看报告'), exact: true }).click();
  await noUntranslatedChinese(page, [oldStore.nickname]);
  await button(page, '生成示范完成证明').click();
  await expect(page.locator('.certificate-name')).toHaveText(oldStore.nickname);
  await noUntranslatedChinese(page, [oldStore.nickname]);
  expect((await store(page)).records).toEqual(oldStore.records);
});

test('English first diagnosis stays locked across language and refresh; exploration remains unscored', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: `03 ${en('排水后没有补水')}` }).click();
  await button(page, '开始独立测评').click();
  await collectSupply(page);
  await page.getByLabel(en('选择诊断'), { exact: true }).selectOption('seal');
  await button(page, '提交诊断').click();
  const wrong = protectedState((await store(page)).sessions.assessment!);
  expect(wrong.firstDiagnosis).toBe('seal');
  expect(wrong.score.sections[1].earned).toBe(0);
  await language(page, 'zh');
  await expect(page.getByLabel('选择诊断', { exact: true })).toBeDisabled();
  await language(page, 'en');
  await page.reload();
  await expect(page.getByLabel(en('选择诊断'), { exact: true })).toBeDisabled();
  expect(protectedState((await store(page)).sessions.assessment!)).toEqual(wrong);
  await noUntranslatedChinese(page);
  await page.getByRole('link', { name: en('返回课程'), exact: true }).click();
  await button(page, '认识结构').click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  await expect(button(page, '结束并查看报告')).toHaveCount(0);
  await expect(button(page, '生成示范完成证明')).toHaveCount(0);
  await noUntranslatedChinese(page);
  expect((await store(page)).records).toHaveLength(0);
});

test('English storage warning and confirmation are usable without overwriting corrupt v1 data', async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('corrupt-bilingual-seeded')) {
      localStorage.setItem('shouyihuo.local.v1', '{bad');
      localStorage.setItem('another-project', 'keep');
      sessionStorage.setItem('corrupt-bilingual-seeded', 'yes');
    }
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText(/damaged|corrupt/i);
  await noUntranslatedChinese(page);
  await button(page, '重置本地数据').click();
  await noUntranslatedChinese(page);
  await button(page, '取消').click();
  expect(await page.evaluate(() => localStorage.getItem('shouyihuo.local.v1'))).toBe('{bad');
  await button(page, '重置本地数据').click();
  await button(page, '确认清空').click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await noUntranslatedChinese(page);
  expect(await page.evaluate(() => localStorage.getItem('another-project'))).toBe('keep');
});

test('Bilingual reviewer page shares language preference, loads local evidence and opens the working app', async ({ page }) => {
  const external: string[] = [];
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url()); });
  await page.goto('/review/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/simulation/i);
  for (const [width, height] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width, height });
    for (const image of await page.locator('img').all()) await image.scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await shot(page, `49-review-en-${width}`);
  }
  const brief = await page.getByRole('link', { name: /Read the project brief/ }).getAttribute('href');
  const response = await page.request.get(new URL(brief!, page.url()).href);
  expect(response.ok()).toBe(true);
  expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
  await page.getByRole('button', { name: '中文', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', /^zh/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/[\u3400-\u9fff]/);
  await shot(page, '50-review-zh-390');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', /^zh/);
  await page.locator('[data-i18n="openPrototype"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await expect(page.getByRole('button', { name: '开始独立测评', exact: true })).toBeVisible();
  await language(page, 'en');
  await page.goto('/review/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect((await store(page)).records).toHaveLength(0);
  expect(external).toEqual([]);
});
