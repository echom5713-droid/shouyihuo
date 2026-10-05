// Capture the live refined English model through ordinary UI actions.
import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const output = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(output, '../..');
const screenshots = path.join(root, 'docs/screenshots/refinement-2026-10-05');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'], { cwd: root, detached: true, stdio: 'ignore' });
const result = { result: 'FAIL', externalRequests: [], pageErrors: [] };
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:5175/')).ok) break; } catch {}
    if (i === 99) throw new Error('Capture server did not become ready.');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).hostname !== '127.0.0.1') result.externalRequests.push(request.url()); });
  page.on('pageerror', error => result.pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:5175/');
  await page.getByRole('button', { name: '03 No refill after draining', exact: true }).click();
  await page.getByRole('button', { name: 'Independent assessment', exact: true }).click();
  await expect(page.getByTestId('tank-model')).toHaveAttribute('data-renderer', 'webgl');
  const protectedState = () => page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem('shouyihuo.local.v1'));
    const attempt = stored.sessions.assessment;
    return { id: attempt.id, water: attempt.water, supplyOpen: attempt.supplyOpen, assembly: attempt.assembly, diagnosis: attempt.diagnosis, evidence: attempt.evidence, safetyErrors: attempt.safetyErrors, logs: attempt.logs };
  });
  const before = await protectedState();
  await page.getByRole('button', { name: 'Labels', exact: true }).click();
  await page.getByRole('button', { name: 'Exploded view', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-moving', 'false');
  await expect.poll(() => page.getByTestId('anchor-inlet').getAttribute('data-visible')).toBe('true');
  await page.waitForTimeout(900); // Allow the normal part interpolation to settle for the capture.
  expect(await protectedState()).toEqual(before);
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, '55-exploded-en.png') });
  expect(result.externalRequests).toEqual([]);
  expect(result.pageErrors).toEqual([]);
  result.result = 'PASS';
  result.browser = browser.version();
  result.businessStatePreserved = true;
} catch (error) {
  result.error = String(error.stack || error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  try { process.kill(-server.pid, 'SIGTERM'); } catch {}
  result.serverStoppedAfterCheck = true;
  await writeFile(path.join(output, 'exploded-capture.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
