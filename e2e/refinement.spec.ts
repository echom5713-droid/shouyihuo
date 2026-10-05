import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import type { Attempt } from '../src/domain/types';
import type { LocalStore } from '../src/storage/local';
import { scoreAttempt } from '../src/domain/engine';
import { LEVEL } from '../src/domain/course';

const evidenceDir = process.env.E2E_VALIDATION_DIR ?? 'docs/validation-refinement-2026-10-05';
const shotsDir = process.env.E2E_BILINGUAL_SCREENSHOT_DIR ?? 'docs/screenshots/refinement-2026-10-05';
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
async function startSupply(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /03 No refill after draining/ }).click();
  await button(page, 'Independent assessment').click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-moving', 'false');
}
async function stored(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('shouyihuo.local.v1')!) as LocalStore);
}
function protectedState(a: Attempt) {
  const { water: _water, elapsed: _elapsed, drainRemaining: _drainRemaining, ...state } = a;
  return { ...state, score: scoreAttempt(a) };
}
async function drawCount(page: Page) {
  return page.evaluate(() => (window as Window & { __testDrawCalls?: number }).__testDrawCalls || 0);
}
async function idleDraws(page: Page) {
  const before = await drawCount(page);
  await page.waitForTimeout(750);
  return (await drawCount(page)) - before;
}
async function instrumentDrawCalls(page: Page) {
  // Count actual WebGL entry points, including shadow passes. These are not FPS.
  await page.addInitScript(() => {
    const state = window as Window & { __testDrawCalls?: number };
    state.__testDrawCalls = 0;
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      for (const method of ['drawElements', 'drawArrays'] as const) {
        const original = prototype[method];
        Object.defineProperty(prototype, method, { configurable: true, writable: true, value: function (this: WebGLRenderingContext, ...args: unknown[]) {
          state.__testDrawCalls = (state.__testDrawCalls || 0) + 1;
          return Reflect.apply(original, this, args);
        } });
      }
    }
  });
}

test('on-demand WebGL sleeps at rest and wakes for camera and real supply changes', async ({ page }) => {
  const errors: string[] = [], external: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url()); });
  await instrumentDrawCalls(page);
  await startSupply(page);
  await page.mouse.move(5, 5);
  await expect(page.locator('canvas')).toHaveAttribute('data-render-loop', 'demand');
  await expect.poll(() => idleDraws(page), { timeout: 15000 }).toBe(0);
  const sampleStart = await page.evaluate(() => ({ time: performance.now(), draws: (window as Window & { __testDrawCalls?: number }).__testDrawCalls || 0 }));
  const elapsedBefore = (await stored(page)).sessions.assessment!.elapsed;
  await page.waitForTimeout(3000);
  const sampleEnd = await page.evaluate(() => ({ time: performance.now(), draws: (window as Window & { __testDrawCalls?: number }).__testDrawCalls || 0 }));
  const elapsedAfter = (await stored(page)).sessions.assessment!.elapsed;
  expect(sampleEnd.draws - sampleStart.draws).toBe(0);
  expect(elapsedAfter).toBeGreaterThan(elapsedBefore + 1);
  const stateBefore = protectedState((await stored(page)).sessions.assessment!);
  const initialPosition = await page.locator('canvas').getAttribute('data-camera-position');
  const idleCount = await drawCount(page);
  await button(page, 'Top view').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-moving', 'false');
  expect(await page.locator('canvas').getAttribute('data-camera-position')).not.toBe(initialPosition);
  expect(await drawCount(page)).toBeGreaterThan(idleCount);
  expect(protectedState((await stored(page)).sessions.assessment!)).toEqual(stateBefore);
  await expect.poll(() => idleDraws(page), { timeout: 15000 }).toBe(0);
  // Use the same prerequisite observations and first diagnosis as a learner;
  // restoring supply before diagnosis is correctly rejected by the reducer.
  await button(page, 'Check water level').click();
  await button(page, 'Check supply').click();
  await page.getByTestId('part-inlet').click();
  await button(page, 'Record observation').click();
  await page.getByLabel('Choose a diagnosis', { exact: true }).selectOption('supply');
  await button(page, 'Submit diagnosis').click();
  await page.getByRole('tab', { name: 'Simulated repair', exact: true }).click();
  const beforeFlow = await drawCount(page);
  const beforeWater = Number(await page.getByTestId('tank-model').getAttribute('data-water-level'));
  await button(page, 'Restore supply').click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-supply', 'open');
  await expect.poll(async () => Number(await page.getByTestId('tank-model').getAttribute('data-water-level'))).toBeGreaterThan(beforeWater + 0.15);
  expect(await drawCount(page)).toBeGreaterThan(beforeFlow);
  await expect.poll(async () => Number(await page.getByTestId('tank-model').getAttribute('data-water-level'))).toBeCloseTo(LEVEL.normal, 2);
  await expect.poll(() => idleDraws(page), { timeout: 15000 }).toBe(0);
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(`${evidenceDir}/demand-rendering.json`, JSON.stringify({ renderer: 'real WebGL', idleWindowMs: Math.round(sampleEnd.time - sampleStart.time), idleDrawCalls: sampleEnd.draws - sampleStart.draws, simulationElapsedBefore: elapsedBefore, simulationElapsedAfter: elapsedAfter, cameraWake: true, supplyWake: true, settlesAfterRefill: true, externalRequests: external, pageErrors: errors, interpretation: 'Actual drawElements/drawArrays calls, not frame rate or hardware performance.' }, null, 2) + '\n');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test('reduced-motion labels update on explosion and language changes without changing an attempt', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await instrumentDrawCalls(page);
  await startSupply(page);
  const protectedBefore = protectedState((await stored(page)).sessions.assessment!);
  await button(page, 'Labels').click();
  await expect(page.getByTestId('anchor-inlet')).toHaveAttribute('data-visible', 'true');
  await button(page, 'Cutaway').click();
  await expect(page.getByTestId('anchor-inlet')).toHaveAttribute('data-visible', 'false');
  await button(page, 'Cutaway').click();
  await expect(page.getByTestId('anchor-inlet')).toHaveAttribute('data-visible', 'true');
  await button(page, 'Exploded view').click();
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-camera-moving', 'false');
  await expect(page.getByTestId('anchor-inlet')).toHaveAttribute('data-visible', 'true');
  await expect.poll(() => idleDraws(page), { timeout: 15000 }).toBe(0);
  const layouts = Number(await canvas.getAttribute('data-label-layouts'));
  await button(page, '中文').click();
  await expect(page.getByTestId('anchor-inlet')).toContainText('进水');
  await expect.poll(async () => Number(await canvas.getAttribute('data-label-layouts'))).toBeGreaterThan(layouts);
  const modelBox = await page.getByTestId('tank-model').boundingBox();
  const labelBox = await page.getByTestId('anchor-inlet').boundingBox();
  expect(modelBox).not.toBeNull(); expect(labelBox).not.toBeNull();
  expect(labelBox!.x).toBeGreaterThanOrEqual(modelBox!.x);
  expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(modelBox!.x + modelBox!.width);
  await button(page, 'English').click();
  await expect(page.getByTestId('anchor-inlet')).toContainText('Inlet');
  await expect.poll(() => idleDraws(page), { timeout: 15000 }).toBe(0);
  expect(protectedState((await stored(page)).sessions.assessment!)).toEqual(protectedBefore);
  expect((await stored(page)).records).toHaveLength(0);
});

test('a real WebGL context loss preserves the attempt and leaves component checks operable', async ({ page }) => {
  await startSupply(page);
  await button(page, 'Check water level').click();
  await button(page, 'Check supply').click();
  const before = protectedState((await stored(page)).sessions.assessment!);
  const lost = await page.locator('canvas').evaluate(canvas => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext();
    return true;
  });
  expect(lost, 'Software Chromium must expose WEBGL_lose_context for the live failure test').toBe(true);
  await expect(page.getByTestId('webgl-fallback')).toBeVisible();
  await expect(button(page, 'Top view')).toBeDisabled();
  expect(protectedState((await stored(page)).sessions.assessment!)).toEqual(before);
  await page.getByTestId('part-inlet').click();
  await button(page, 'Record observation').click();
  await expect(page.getByTestId('evidence-count')).toHaveText('3');
  const after = (await stored(page)).sessions.assessment!;
  expect(after.id).toBe(before.id);
  expect(after.assembly).toEqual(before.assembly);
  expect(after.safetyErrors).toEqual(before.safetyErrors);
  expect((await stored(page)).records).toHaveLength(0);
  await mkdir(shotsDir, { recursive: true });
  await page.screenshot({ path: `${shotsDir}/23-live-context-loss-en.png`, fullPage: true });
});
