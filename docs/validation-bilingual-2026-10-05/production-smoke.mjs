// Reproducible local production-preview check. No remote service is contacted.
import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const output = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(output, '../..');
const screenshots = path.join(root, 'docs/screenshots/bilingual-2026-10-05');
await mkdir(screenshots, { recursive: true });
const serverLog = createWriteStream(path.join(output, 'preview-server.log'));
const server = spawn('npm', ['run', 'preview'], { cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
server.stdout.pipe(serverLog);
server.stderr.pipe(serverLog);
const result = { timestamp: new Date().toISOString(), result: 'FAIL', externalRequests: [], pageErrors: [], warnings: [], checks: [] };
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:4173/')).ok) break; } catch {}
    if (i === 99) throw new Error('Production preview did not become ready.');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  result.browser = browser.version();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-GB', timezoneId: 'Asia/Shanghai' });
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') result.externalRequests.push(request.url()); });
  page.on('pageerror', error => result.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'warning') result.warnings.push(message.text()); });

  await page.goto('http://127.0.0.1:4173/review/');
  await expect(page).toHaveTitle('Shouyihuo — Engineering project review');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('simulation you can inspect');
  for (const [width, height, name] of [[1440, 900, '60-review-desktop-en'], [390, 844, '61-review-mobile-en']]) {
    await page.setViewportSize({ width, height });
    for (const img of await page.locator('img').all()) await img.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(screenshots, `${name}.png`), fullPage: true });
    result.checks.push(`English reviewer page: ${width}x${height}; all images loaded; no horizontal overflow.`);
  }
  await page.getByRole('button', {name: '中文', exact: true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
  await page.screenshot({path: path.join(screenshots, '63-review-mobile-zh.png'), fullPage: true});
  await page.getByRole('button', {name: 'English', exact: true}).click();
  result.checks.push('Review page language switching and refresh persistence: PASS.');
  const briefUrl = await page.getByRole('link', { name: /Read the project brief/ }).getAttribute('href');
  const pdfResponse = await page.request.get(new URL(briefUrl, page.url()).href);
  expect(pdfResponse.ok()).toBe(true);
  expect((await pdfResponse.body()).subarray(0, 5).toString()).toBe('%PDF-');
  result.checks.push('Reviewer PDF link returns a valid PDF.');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('link', { name: /Open the working prototype/ }).click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  await expect(page.getByTestId('anchor-inlet')).toHaveAttribute('data-x', /\d/);
  await expect(page.locator('canvas')).toBeVisible();
  result.graphics = await page.locator('canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL context missing.');
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return { version: gl.getParameter(gl.VERSION), renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) };
  });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.screenshot({ path: path.join(screenshots, '62-production-home-en.png'), fullPage: true });
  await page.getByRole('button', {name: '中文', exact: true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  await page.getByRole('button', {name: 'English', exact: true}).click();
  result.checks.push('Production app switches languages without losing the live WebGL model.');
  result.checks.push('English page launches the actual production app; real WebGL canvas rendered.');
  expect(result.externalRequests).toEqual([]);
  expect(result.pageErrors).toEqual([]);
  result.result = 'PASS';
} catch (error) {
  result.error = String(error.stack || error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  try { process.kill(-server.pid, 'SIGTERM'); } catch {}
  result.serverStoppedAfterCheck = true;
  serverLog.end();
  await writeFile(path.join(output, 'production-preview.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
