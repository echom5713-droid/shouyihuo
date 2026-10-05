import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { scoreAttempt } from '../src/domain/engine';
import type { Attempt } from '../src/domain/types';
import type { LocalStore } from '../src/storage/local';

const shots = process.env.E2E_BILINGUAL_SCREENSHOT_DIR ?? 'docs/screenshots/model-detail-2026-10-05';
const evidence = process.env.E2E_VALIDATION_DIR ?? 'docs/validation-model-detail-2026-10-05';
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('shouyihuo.local.v1')!) as LocalStore);
function protectedState(a: Attempt) {
  const { water: _water, elapsed: _elapsed, drainRemaining: _drainRemaining, ...rest } = a;
  return { ...rest, score: scoreAttempt(a) };
}
async function shot(page: Page, name: string) {
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: false });
}
async function endpoints(page: Page) {
  return page.locator('canvas').evaluate(canvas => {
    const data = (canvas as HTMLCanvasElement).dataset;
    const point = (value: string | undefined) => value!.split(',').map(Number);
    return { pivot: point(data.floatPivot), tip: point(data.floatTip), center: point(data.floatCenter) };
  });
}
function separation(a: number[], b: number[]) { return Math.hypot(...a.map((n, i) => n - b[i])); }

test('double-clicking a real mesh focuses the same action target without changing assessment state', async ({ page }) => {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== '127.0.0.1') external.push(r.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: /03 No refill after draining/ }).click();
  await button(page, 'Independent assessment').click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  await button(page, 'Open lid').click();
  const before = protectedState((await stored(page)).sessions.assessment!);
  await page.getByTestId('part-tank').click();
  const anchor = page.getByTestId('anchor-inlet');
  await expect(anchor).toHaveAttribute('data-x', /\d/);
  const x = Number(await anchor.getAttribute('data-x')), y = Number(await anchor.getAttribute('data-y'));
  await page.locator('canvas').dblclick({ position: { x, y }, delay: 80 });
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-view', 'focus');
  await expect(page.locator('canvas')).toHaveAttribute('data-focus-part', 'inlet');
  await expect(page.getByTestId('part-inlet')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('part-detail')).toHaveAttribute('data-selection-source', 'model');
  await expect(page.getByTestId('part-detail').getByRole('heading')).toHaveText('Inlet assembly');
  await page.getByRole('tab', { name: 'Simulated repair', exact: true }).click();
  await expect(page.getByLabel('Action target', { exact: true })).toHaveValue('inlet');
  expect(protectedState((await stored(page)).sessions.assessment!)).toEqual(before);
  await shot(page, '61-inlet-focus-en-1440');
  await button(page, 'Overview').click();
  await button(page, 'Exploded view').click();
  await button(page, 'Labels').click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-inlet-installed', 'true');
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-drain-installed', 'true');
  await shot(page, '62-mechanical-exploded-en-1440');
  await button(page, 'Expand workspace').click();
  await expect(page.locator('.lab-page')).toHaveClass(/workspace-expanded/);
  await page.getByTestId('anchor-pipe').dblclick({ delay: 80 });
  await expect(page.locator('canvas')).toHaveAttribute('data-focus-part', 'pipe');
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-selected', 'pipe');
  await shot(page, '63-braided-hose-focus-en-1440');
  await page.keyboard.press('Escape');
  await button(page, '中文').click();
  await expect(page.locator('.mouse-help')).toHaveText('拖动旋转 · 滚轮缩放 · 双击聚焦');
  expect(protectedState((await stored(page)).sessions.assessment!)).toEqual(before);
  expect((await stored(page)).records).toHaveLength(0);
  expect(errors).toEqual([]); expect(external).toEqual([]);
});

test('the rendered float follows water while its rigid arm stays attached to a fixed pivot', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await button(page, 'Explore the model').click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  await button(page, 'Open lid').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-float-center', /\d/);
  await shot(page, '60-detailed-interior-en-1440');
  const full = await endpoints(page);
  expect(separation(full.tip, full.center)).toBeLessThan(0.001);
  expect(separation(full.pivot, full.tip)).toBeCloseTo(1.62, 3);
  await page.getByRole('tab', { name: 'Simulated repair', exact: true }).click();
  await button(page, 'Turn supply off').click();
  await button(page, 'Simulate flush').click();
  await expect(page.getByTestId('water-reading')).toHaveText('Empty');
  await expect.poll(async () => (await endpoints(page)).center[1]).toBeLessThan(full.center[1] - 0.8);
  const empty = await endpoints(page);
  expect(separation(full.pivot, empty.pivot)).toBeLessThan(0.001);
  expect(separation(empty.tip, empty.center)).toBeLessThan(0.001);
  expect(separation(empty.pivot, empty.tip)).toBeCloseTo(1.62, 3);
  await shot(page, '64-empty-tank-rigid-arm-en-1440');
  await button(page, 'Restore supply').click();
  await expect.poll(async () => (await endpoints(page)).center[1]).toBeGreaterThan(empty.center[1] + 0.8);
  const refilled = await endpoints(page);
  expect(separation(refilled.pivot, full.pivot)).toBeLessThan(0.001);
  expect(separation(refilled.tip, refilled.center)).toBeLessThan(0.001);
  expect(separation(refilled.pivot, refilled.tip)).toBeCloseTo(1.62, 3);
  expect((await stored(page)).records).toHaveLength(0);
  await mkdir(evidence, { recursive: true });
  await writeFile(`${evidence}/float-linkage.json`, JSON.stringify({ full, empty, refilled, armLengthModelUnits: 1.62, source: 'Rendered mesh world matrices after real supply-off, flush and refill actions. Teaching geometry, not calibrated physical units.', passed: true }, null, 2) + '\n');
});
