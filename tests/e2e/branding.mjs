// Local production rendering only; no hosted writes or real identities.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const origin = 'http://127.0.0.1:3144';
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3144'], { stdio: 'pipe' });
let output = ''; app.stdout.on('data', b => output += b); app.stderr.on('data', b => output += b);
let browser;
try {
  for (let attempt = 0; ; attempt++) {
    try { if ((await fetch(`${origin}/sign-in`)).ok) break; } catch { /* wait for server */ }
    assert.ok(attempt < 120 && app.exitCode === null, output);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  await mkdir('test-results/branding', { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${origin}/sign-in`);
  assert.equal(await page.title(), 'Finance Planner — A little clarity');
  assert.match(await page.locator('meta[name="description"]').getAttribute('content'), /personal and shared workspaces/);
  const icons = await page.locator('link[rel="icon"], link[rel="apple-touch-icon"]').evaluateAll(links => links.map(link => link.href));
  assert.ok(icons.some(url => url.includes('favicon.ico'))); assert.ok(icons.some(url => url.includes('apple-icon.png')));
  for (const url of icons) assert.equal((await fetch(url)).status, 200);
  for (const width of [1440,1024,768,390,320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${origin}/sign-in`);
    await page.locator('.brand-icon').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    assert.equal(await page.getByRole('link', { name: 'Finance Planner', exact: true }).isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `test-results/branding/sign-in-${width}.png`, fullPage: true });
    await page.goto(`${origin}/sign-up`);
    await page.locator('.brand-icon').evaluate(image => image.decode());
    assert.equal(await page.getByRole('link', { name: 'Finance Planner', exact: true }).isVisible(), true);
    assert.equal(await page.getByRole('heading', { name: 'Create your account', exact: true }).isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.goto(`${origin}/goals`);
    await page.locator('#preview-state').selectOption('empty');
    await page.getByRole('heading', { name: 'No sample savings goals' }).waitFor();
    await page.locator('.empty-illustration').evaluate(image => image.decode());
    assert.equal(await page.locator('.empty-illustration').getAttribute('alt'), '');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `test-results/branding/goals-empty-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'View sample goals' }).click();
    assert.equal(await page.getByRole('heading', { name: 'No sample savings goals' }).count(), 0);
    await page.locator('#preview-state').selectOption('loading');
    await page.getByRole('button', { name: 'Finish preview' }).click();
    await page.locator('#preview-state').selectOption('error');
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    assert.equal(await page.locator('#preview-state').inputValue(), 'ready');
    await page.goto(`${origin}/budgets`);
    await page.locator('#preview-state').selectOption('empty');
    await page.getByRole('button', { name: 'View sample month' }).click();
    assert.equal(await page.getByRole('heading', { name: 'No sample activity for this month' }).count(), 0);
  }
  const assets = JSON.parse(await readFile('public/illustrations/inventory.json', 'utf8'));
  await page.setViewportSize({ width: 1200, height: 900 });
  for (const bg of ['#f0f9ff','#082f49']) {
    const rows = [];
    for (const asset of assets) {
      const original = (await readFile(`Asset lucu lucu/svg/${asset.source}`)).toString('base64');
      rows.push(`<section><p>${asset.source} → ${asset.file}</p><img class="source" src="data:image/svg+xml;base64,${original}"><img class="optimized" src="${origin}/illustrations/${asset.file}"></section>`);
    }
    await page.setContent(`<style>body{margin:0;padding:24px;background:${bg};color:${bg==='#082f49'?'white':'#082f49'};font:14px system-ui;display:grid;grid-template-columns:1fr 1fr;gap:24px}section{height:210px}p{height:24px}img{width:240px;height:160px;object-fit:contain}</style>${rows.join('')}`);
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    const sections = page.locator('section');
    for (let i=0; i<assets.length; i++) if (assets[i].kind === 'vector') {
      const equal = await sections.nth(i).evaluate(section => {
        const pixels = image => {
          const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 160;
          const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, 240, 160);
          return ctx.getImageData(0, 0, 240, 160).data;
        };
        const before = pixels(section.querySelector('.source')), after = pixels(section.querySelector('.optimized'));
        return before.every((value, index) => value === after[index]);
      });
      assert.ok(equal, `${assets[i].file} must match its source in Chrome canvas`);
    }
    await page.screenshot({ path: `test-results/branding/asset-audit-${bg==='#082f49'?'dark':'light'}.png`, fullPage: true });
  }
  await page.setContent(`<style>body{background:#f0f9ff;font:16px system-ui;display:flex;gap:32px;padding:32px}img{image-rendering:auto}</style><div>16px <img src="${origin}/favicon.ico" width="16" height="16"></div><div>32px <img src="${origin}/favicon.ico" width="32" height="32"></div><div>192px <img src="${origin}/icon.png" width="192" height="192"></div>`);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.screenshot({ path: 'test-results/branding/icons-chrome.png' });
  assert.deepEqual(errors, []);
  console.log(`PASS Chrome ${browser.version()}: 12 SVG sources and optimized assets render on light/dark; 8 vector pairs pixel-identical; Next metadata and 16/32px favicon decode; 1440/1024/768/390/320 layouts and empty/loading/error actions.`);
} finally { await browser?.close(); app.kill(); }
