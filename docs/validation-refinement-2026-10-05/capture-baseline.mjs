import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
const evidence = resolve('docs/validation-refinement-2026-10-05');
const shots = resolve('docs/screenshots/refinement-2026-10-05');
await mkdir(shots, { recursive: true });
const server=spawn('npm',['run','dev','--','--port','5174','--strictPort'],{cwd:resolve(process.env.BASELINE_SOURCE_DIR || '../refinement-baseline-2026-10-05'),stdio:'ignore',detached:true});
process.on('exit',()=>{try{process.kill(-server.pid,'SIGTERM')}catch{}});
for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5174/')).ok)break;}catch{} await new Promise(r=>setTimeout(r,200));}
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
const page = await browser.newPage({viewport:{ width:1440,height:900 }, locale:'en-GB'});
const errors=[], external=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if (/^https?:/.test(r.url()) && new URL(r.url()).hostname!=='127.0.0.1') external.push(r.url());});
await page.addInitScript(()=>{
  window.__drawCalls=0;
  for(const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    for(const method of ['drawElements','drawArrays']) {
      const original=proto[method];
      proto[method]=function(...args){window.__drawCalls++; return original.apply(this,args);};
    }
  }
});
await page.goto('http://127.0.0.1:5174/');
await page.getByTestId('tank-model').filter({has:page.locator('canvas')}).waitFor();
await page.waitForFunction(()=>document.querySelector('[data-testid="tank-model"]')?.getAttribute('data-renderer')==='webgl');
await page.waitForTimeout(1800);
await page.screenshot({path:resolve(shots,'00-before-home-en-1440.png'),fullPage:true});
await page.getByRole('button',{name:/03 No refill after draining/}).click();
await page.getByRole('button',{name:'Independent assessment',exact:true}).click();
await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.cameraMoving==='false');
await page.waitForTimeout(1000);
await page.screenshot({path:resolve(shots,'01-before-workbench-en-1440.png'),fullPage:false});
const initial=await page.evaluate(()=>({drawCalls:window.__drawCalls,time:performance.now()}));
await page.waitForTimeout(3000);
const after=await page.evaluate(()=>({drawCalls:window.__drawCalls,time:performance.now()}));
const result={scope:'Pre-refinement runtime baseline, unchanged English-first v0.2 source copy',date:new Date().toISOString(),url:page.url(),viewport:page.viewportSize(),renderer:await page.getByTestId('tank-model').getAttribute('data-renderer'),idleWindowMs:Math.round(after.time-initial.time),idleDrawCalls:after.drawCalls-initial.drawCalls,externalRequests:external,pageErrors:errors,browserVersion:browser.version(),screenshots:['00-before-home-en-1440.png','01-before-workbench-en-1440.png'],note:'WebGL draw call count instrumented at drawArrays/drawElements; observational software-renderer comparison, not a hardware performance benchmark.'};
await writeFile(resolve(evidence,'baseline-runtime.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
await browser.close();
try{process.kill(-server.pid,'SIGTERM')}catch{}
