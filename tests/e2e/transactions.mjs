// Local HTTP/Auth adapter only. Real ledger SQL/RLS; no hosted Supabase claim.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { jakartaDate } from '../../src/lib/prototype.ts';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const db = new PGlite();
const users = [randomUUID(), randomUUID()];
const today = jakartaDate(new Date());
const month = today.slice(0, 7);
const appPort = 3142, providerPort = 3143;
const origin = `http://127.0.0.1:${appPort}`;
await db.exec(`create role anon nologin; create role authenticated nologin;
  create schema auth; create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
for (const f of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) await db.exec(await readFile(`supabase/migrations/${f}`, 'utf8'));
for (const u of users) await db.query('insert into auth.users values($1,now())', [u]);
const signatures = new Map((await db.query(`select p.proname,p.proargnames from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef`)).rows.map(r => [r.proname, r.proargnames ?? []]));
let queue = Promise.resolve();
const rpcAs = (actor, name, args = []) => {
  const run = queue.then(async () => {
    await db.exec('reset role; set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [actor]);
    return (await db.query(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) result`, args)).rows[0].result;
  });
  queue = run.catch(() => {}); return run;
};
let loseNextSave = false;
let failNextAccess = false;
const fixtureUser = id => ({ id, email: `${users.indexOf(id)}@fixture.invalid`, email_confirmed_at: '2026-01-01T00:00:00Z',
  aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' });
const provider = createServer(async (req, res) => {
  const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
  try {
    const token = (req.headers.authorization ?? '').replace('Bearer ', '');
    let actor;
    try { actor = JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).sub; } catch { /* anonymous */ }
    if (!users.includes(actor)) return send(401, { code: '42501', message: 'Fixture authentication required' });
    if (req.url === '/auth/v1/user') return send(200, fixtureUser(actor));
    if (req.url.startsWith('/auth/v1/logout')) { res.writeHead(204); return res.end(); }
    const name = req.url.split('/rest/v1/rpc/')[1];
    if (!signatures.has(name)) return send(404, { code: 'PGRST202' });
    if (name === 'read_workspace' && failNextAccess) { failNextAccess = false; return send(500, { code: 'XX000' }); }
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const args = JSON.parse(Buffer.concat(chunks).toString() || '{}');
    const keys = signatures.get(name).filter(key => Object.hasOwn(args, key));
    const run = queue.then(async () => {
      await db.exec('reset role; set role authenticated');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [actor]);
      const result = (await db.query(`select public.${name}(${keys.map((key, i) => `${key} => $${i + 1}`).join(',')}) result`, keys.map(key => typeof args[key] === 'object' && args[key] !== null ? JSON.stringify(args[key]) : args[key]))).rows[0].result;
      return result;
    });
    queue = run.catch(() => {});
    const result = await run;
    if (loseNextSave && name === 'save_transaction') { loseNextSave = false; return send(500, { code: 'XX000', message: 'Fixture lost response after commit' }); }
    send(200, result);
  } catch (error) { send(400, { code: error.code ?? 'XX000', message: 'Fixture request rejected' }); }
});
await new Promise(resolve => provider.listen(providerPort, '127.0.0.1', resolve));
const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(appPort)], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${providerPort}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_fixture', SITE_URL: origin },
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
let appOutput = ''; app.stdout.on('data', d => { appOutput += d; }); app.stderr.on('data', d => { appOutput += d; });
let browser;
try {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${origin}/sign-in`)).ok) break; } catch { /* starting */ }
    if (app.exitCode !== null) throw new Error(appOutput);
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  const errors = [];
  const contexts = [];
  for (const id of users) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }); contexts.push(context);
    const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
    const access_token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.fixture`;
    const session = { access_token, refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: fixtureUser(id) };
    await context.addCookies([{ name: 'sb-127-auth-token', value: `base64-${encode(session)}`, url: origin, sameSite: 'Lax' }]);
  }
  const page = await contexts[0].newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${origin}/workspaces`); await page.bringToFront();
  const sharing = page.locator('summary:visible').filter({ hasText: /^Manage sharing$/ });
  await sharing.focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Create shared workspace', exact: true }).waitFor();
  await sharing.focus(); await page.keyboard.press('Enter');
  assert.equal(await page.getByRole('button', { name: 'Create shared workspace', exact: true }).isVisible(), false);
  await mkdir('test-results', { recursive: true });
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const choice = await page.getByRole('link', { name: /Personal · Private to you/ }).boundingBox();
    assert.ok(choice && choice.y + choice.height < 900, 'Workspace choice precedes sharing administration');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `test-results/ux-workspaces-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('link', { name: /Personal · Private to you/ }).click();
  await page.getByRole('heading', { name: 'Your accounts' }).waitFor();
  const workspaceURL = page.url();
  const w = new URL(workspaceURL).pathname.split('/').at(-1);
  const pick = async (label, option) => {
    if (label === 'Transaction type') {
      await page.getByRole('group', { name: label, exact: true }).getByRole('button', { name: option, exact: false }).click(); return;
    }
    await page.getByRole('dialog').getByRole('combobox', { name: label, exact: true }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
  };
  const save = async () => {
    await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByRole('dialog').getByText('Saved to Supabase. Recorded balances updated.').waitFor();
    if (page.viewportSize().width < 768) {
      const sheet = await page.getByRole('dialog').boundingBox();
      assert.ok(sheet && sheet.x === 0 && sheet.y === 0 && sheet.width === page.viewportSize().width && sheet.height === page.viewportSize().height,
        'Mobile confirmation stays inside its full-screen sheet');
    }
    await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  };
  for (const [name, opening] of [['Fixture Cash', '1.000.000'], ['Fixture Savings', '0']]) {
    await page.getByRole('button', { name: 'Add account', exact: true }).click();
    await page.getByLabel('Account name', { exact: true }).fill(name);
    await page.getByLabel('Opening date · Jakarta', { exact: true }).fill('2026-01-01');
    await page.getByLabel('Opening balance', { exact: false }).fill(opening); await save();
  }
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await pick('Transaction type', 'income');
  await page.getByLabel('Amount · IDR', { exact: true }).pressSequentially('2600000');
  assert.equal(await page.getByLabel('Amount · IDR', { exact: true }).inputValue(), 'Rp 2,600,000');
  await page.getByLabel('Amount · IDR', { exact: true }).evaluate(e => e.setSelectionRange(6, 6));
  await page.keyboard.type('5');
  assert.equal(await page.getByLabel('Amount · IDR', { exact: true }).inputValue(), 'Rp 26,500,000');
  await page.keyboard.press('Backspace');
  assert.equal(await page.getByLabel('Amount · IDR', { exact: true }).inputValue(), 'Rp 2,600,000');
  await page.getByLabel('Notes (optional)').fill('Category setup preserves this draft');
  assert.equal(await page.getByRole('combobox', { name: 'Category', exact: true }).isDisabled(), true);
  await page.getByText('No income categories yet.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Add income category', exact: true }).click();
  await page.getByLabel('Category name', { exact: true }).fill('Fixture Salary'); await save();
  assert.equal(await page.getByLabel('Amount · IDR', { exact: true }).inputValue(), 'Rp 2,600,000');
  assert.equal(await page.getByLabel('Notes (optional)').inputValue(), 'Category setup preserves this draft');
  assert.equal(await page.getByRole('combobox', { name: 'Category', exact: true }).innerText(), 'Fixture Salary');
  await page.getByRole('combobox', { name: 'Category', exact: true }).click();
  await page.getByRole('option', { name: 'Fixture Salary', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  assert.equal(await page.getByRole('group', { name: 'Transaction type', exact: true }).getByRole('button', { name: 'Expense', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByLabel('Amount · IDR', { exact: false }).fill('1.5');
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Enter positive whole IDR', { exact: false }).waitFor();
  assert.equal(await page.getByLabel('Amount · IDR', { exact: false }).inputValue(), '1.5');
  await page.getByLabel('Amount · IDR', { exact: false }).fill('300.000');
  await page.getByLabel('Notes (optional)').fill('Fixture groceries');
  loseNextSave = true;
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Retry exact operation' }).waitFor();
  assert.equal(await page.getByLabel('Amount · IDR', { exact: false }).isDisabled(), true);
  const background = await contexts[0].newPage(); await background.goto('about:blank'); await background.bringToFront();
  await page.bringToFront();
  // Headless focus behavior varies; exercise the same browser lifecycle events explicitly.
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.getByText('Verifying access…', { exact: true }).waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0, 'Financial portals must be concealed during revalidation');
  failNextAccess = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('button', { name: 'Retry access verification' }).waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.getByRole('button', { name: 'Retry access verification' }).focus();
  assert.equal(await page.getByRole('button', { name: 'Retry access verification' }).evaluate(e => document.activeElement === e), true);
  await page.getByRole('button', { name: 'Retry access verification' }).click();
  await page.getByRole('button', { name: 'Retry exact operation' }).waitFor();
  assert.equal(await page.getByLabel('Amount · IDR', { exact: false }).inputValue(), 'Rp 300,000');
  await background.close();
  await page.getByRole('button', { name: 'Retry exact operation' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  assert.equal(await page.locator('.live-transaction-table tbody tr').count(), 1);
  await page.locator('.live-transaction-table tbody tr').getByRole('button', { name: 'Edit transaction', exact: true }).click();
  await page.getByLabel('Amount · IDR', { exact: false }).fill('250.000');
  const current = (await rpcAs(users[0], 'read_transactions', [w, `${month}-01`, `${Number(month.slice(0, 4)) + 1}-01-01`]))[0];
  await rpcAs(users[0], 'save_transaction', [w, randomUUID(), JSON.stringify({ id: current.id, amount: '290000', account_id: current.postings[0].account_id,
    economic_date: today, category_id: current.category_id, description: current.description }), Number(current.version)]);
  await page.getByRole('dialog').getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('link', { name: 'Reload and compare' }).waitFor();
  assert.equal(await page.getByLabel('Amount · IDR', { exact: false }).inputValue(), 'Rp 250,000');
  await page.getByRole('link', { name: 'Reload and compare' }).click();
  await page.getByRole('button', { name: 'Add transaction', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await pick('Transaction type', 'income'); await pick('Category', 'Fixture Salary');
  await page.getByLabel('Amount · IDR', { exact: false }).fill('2.000.000'); await save();
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click(); await pick('Transaction type', 'transfer');
  await pick('Source account', 'Fixture Cash'); await pick('Destination account', 'Fixture Savings');
  await page.getByLabel('Amount · IDR', { exact: false }).fill('200.000'); await save();
  let expense = page.locator('.live-transaction-table tbody tr').filter({ hasText: 'Fixture groceries' });
  await expense.getByRole('button', { name: 'Edit transaction', exact: true }).click();
  await page.getByLabel('Amount · IDR', { exact: false }).fill('250.000');
  await page.getByLabel('Transaction date · Jakarta', { exact: true }).fill(`${month}-01`); await save();
  assert.match(await expense.innerText(), new RegExp(`${month}-01`));
  await expense.getByRole('button', { name: 'Delete / void transaction', exact: true }).click();
  await page.getByLabel('Reason for deletion / void').fill('Fixture duplicate');
  await page.getByRole('button', { name: 'Confirm void', exact: true }).click();
  await expense.getByText('expense · Voided', { exact: true }).waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.getByLabel('Report month · Asia/Jakarta').fill('2020-01');
  await page.getByRole('button', { name: 'View month' }).click();
  await page.getByText('No transactions recorded for this month.').waitFor();
  await page.goto(`${workspaceURL}?month=${month}`);
  await page.keyboard.press('Tab');
  assert.equal(await page.getByRole('link', { name: 'Skip to content', exact: true }).evaluate(e => e === document.activeElement), true);
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  assert.equal(await page.getByLabel('Amount · IDR', { exact: true }).evaluate(e => e === document.activeElement), true, 'Entry starts at the amount');
  await page.getByLabel('Amount · IDR', { exact: true }).fill('25.000');
  await page.getByLabel('Notes (optional)').fill('Fixture coffee'); await save();
  await page.locator('.live-category-table').getByText('Rp25.000', { exact: true }).waitFor();
  await page.getByRole('img', { name: /Spending proportions by category/ }).waitFor();
  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('dialog').evaluate(e => e.contains(document.activeElement)), true, 'Keyboard focus stays in the entry sheet');
  }
  await page.screenshot({ path: 'test-results/ux-entry-320.png', fullPage: false });
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await mkdir('test-results', { recursive: true });
  const ux = [];
  for (const width of [1440, 1024, 820, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `test-results/ux-current-${width}.png`, fullPage: true });
    assert.equal(await page.getByRole('navigation', { name: width >= 1024 ? 'Main navigation' : 'Mobile navigation', exact: true }).isVisible(), true,
      'The live workspace retains the reference app navigation');
    const add = await page.getByRole('button', { name: 'Add transaction', exact: true }).boundingBox();
    assert.ok(add && add.y >= 0 && add.y + add.height <= 900, 'Everyday entry is reachable on the first screen');
    assert.equal(await page.locator('.live-transaction-table tbody tr').evaluateAll(rows => rows.every(row => row.getBoundingClientRect().height <= 220)), true,
      'Ordinary transactions stay compact enough to scan on mobile');
    ux.push({ width, entryTop: add.y, rowHeights: await page.locator('.live-transaction-table tbody tr').evaluateAll(rows => rows.map(row => row.getBoundingClientRect().height)) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Page reflows at ${width}px`);
    assert.equal(await page.locator('.live-transaction-table tbody tr').evaluateAll(rows => rows.every(row => row.getBoundingClientRect().right <= innerWidth)), true,
      `Transaction details and actions fit without horizontal scrolling at ${width}px`);
    await page.screenshot({ path: `test-results/transactions-${width}.png`, fullPage: true });
    if (width === 1440) await page.screenshot({ path: 'test-results/ux-desktop-viewport.png', fullPage: false });
    const navigation = page.getByRole('navigation', { name: width >= 1024 ? 'Main navigation' : 'Mobile navigation', exact: true });
    await navigation.getByRole('link', { name: 'Transactions', exact: true }).click();
    const ledger = await page.getByRole('heading', { name: 'The latest in your ledger', exact: true }).boundingBox();
    assert.ok(ledger && ledger.y >= 0 && ledger.y < 900, 'Navigation reaches the transaction list');
    await navigation.getByRole('link', { name: 'Overview', exact: true }).click();
  }
  await writeFile('test-results/ux-metrics.json', JSON.stringify(ux, null, 2));
  await page.setViewportSize({ width: 320, height: 800 });
  await mkdir('test-results', { recursive: true }); await page.screenshot({ path: 'test-results/transactions-mobile.png', fullPage: true });
  const second = await contexts[1].newPage(); await second.goto(`${origin}/w/${w}`); await second.bringToFront();
  await second.getByRole('heading', { name: 'Financial access unavailable', exact: true }).waitFor();
  assert.doesNotMatch(await second.locator('body').innerText(), /Fixture Cash|Fixture groceries|Fixture Salary/);
  await queue; await db.exec('reset role');
  const rows = (await db.query('select kind,count(*)::int n from ledger.transactions where workspace_id=$1 group by kind', [w])).rows;
  assert.deepEqual(Object.fromEntries(rows.map(r => [r.kind, r.n])), { expense: 2, income: 1, transfer: 1 });
  const shared = await rpcAs(users[0], 'create_shared_workspace');
  const invite = await rpcAs(users[0], 'invite_member', [shared, users[1]]);
  await rpcAs(users[1], 'accept_invite', [invite]);
  await page.bringToFront(); await page.goto(`${origin}/w/${shared}`);
  await page.getByRole('button', { name: 'Add account', exact: true }).click();
  await page.getByLabel('Account name', { exact: true }).fill('Fixture Shared');
  await page.getByLabel('Opening balance', { exact: false }).fill('500.000'); await save();
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await page.getByLabel('Amount · IDR', { exact: false }).fill('10.000'); await save();
  await second.bringToFront(); await second.goto(`${origin}/w/${shared}`);
  await second.locator('.live-transaction-table tbody tr').waitFor(); assert.equal(await second.locator('.live-transaction-table tbody tr').count(), 1);
  assert.doesNotMatch(await second.locator('body').innerText(), /Fixture Cash|Fixture groceries|Fixture Salary/);
  for (const actor of users) {
    const report = await rpcAs(actor, 'monthly_report', [shared, `${month}-01`]);
    assert.equal(report.income, '0'); assert.equal(report.net_spending, '10000'); assert.equal(report.closing_cash, '490000');
  }
  await page.bringToFront(); await page.goto(`${origin}/w/${shared}`);
  await page.getByRole('button', { name: 'Add transaction', exact: true }).click();
  await page.getByLabel('Notes (optional)').fill('Draft belonging to the old identity');
  const otherCookie = (await contexts[1].cookies()).find(c => c.name === 'sb-127-auth-token');
  await contexts[0].addCookies([otherCookie]);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.getByText('Verifying access…', { exact: true }).waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByText('1@fixture.invalid', { exact: true }).waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0);
  assert.doesNotMatch(await page.locator('body').innerText(), /Draft belonging to the old identity/);
  assert.deepEqual(errors, []);
  console.log('PASS local browser: dynamic Rp/comma input and caret editing, empty income category recovery/selection with retained draft, account/category creation, expense default, validation/draft, committed-lost retry across blur/access failure, concealed portals, conflict, income, transfer, edit/date/void, month empty state, 320px reflow, identity-change draft clearing, two isolated identities, private denial and shared single counting. Real SQL/RLS; fixture Auth adapter only.');
} catch (error) {
  console.error(appOutput);
  for (const context of browser?.contexts() ?? []) for (const p of context.pages()) {
    console.error('Fixture browser:', p.url(), await p.locator('body').innerText().catch(() => 'Unavailable'));
    await p.screenshot({ path: 'test-results/ux-failure.png', fullPage: true }).catch(() => {});
    console.error('Dialog geometry:', await p.locator('[role="dialog"]').evaluateAll(dialogs => dialogs.map(dialog => ({ rect: dialog.getBoundingClientRect().toJSON(), scrollTop: dialog.scrollTop,
      buttons: [...dialog.querySelectorAll('button')].map(button => ({ text: button.textContent, rect: button.getBoundingClientRect().toJSON() })) }))).catch(() => []));
  }
  throw error;
}
finally { await browser?.close(); app.kill(); await new Promise(resolve => provider.close(resolve)); await db.close(); }
