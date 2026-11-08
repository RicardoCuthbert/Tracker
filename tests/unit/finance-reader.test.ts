import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase/database.types.ts';
import { financeReader } from '../../src/lib/supabase/finance.ts';

const w = '11111111-1111-4111-8111-111111111111';
function reader(response: unknown, status = 200) {
  const calls: { name: string; args: unknown }[] = [];
  const client = createClient<Database>('https://example.supabase.co', 'sb_publishable_test', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => {
      calls.push({ name: new URL(String(url)).pathname, args: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify(response), { status, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  return { api: financeReader(client), calls };
}

test('real SDK transport mapping uses the public RPC contract; mock responses are not cloud evidence', async () => {
  const { api, calls } = reader([]);
  assert.deepEqual(await api.transactions(w, '2026-01-01', '2026-02-01'), { ok: true, data: [] });
  assert.deepEqual(calls, [{ name: '/rest/v1/rpc/read_transactions', args: { w, from_date: '2026-01-01', until_date: '2026-02-01', page_size: 50 } }]);
  const list = reader([{ id: w, name: 'Fixture', kind: 'personal', role: 'owner' }]);
  assert.equal((await list.api.listWorkspaces()).ok, true);
  assert.deepEqual(list.calls[0], { name: '/rest/v1/rpc/list_workspaces', args: {} });
});

test('invitation inbox verifies IDs and exposes only its narrow contract', async () => {
  const row = { id: w, workspace_id: w, name: 'Fixture household', recipient_id: w, expires_at: '2026-11-14T00:00:00Z' };
  const valid = reader([row]);
  assert.deepEqual(await valid.api.invitations(), { ok: true, data: [row] });
  assert.deepEqual(valid.calls[0], { name: '/rest/v1/rpc/list_workspace_invitations', args: {} });
  assert.equal((await reader([{ ...row, recipient_id: 'invalid' }]).api.invitations()).ok, false);
});

test('exact aggregate strings survive SDK and decoder; JSON numbers fail closed', async () => {
  const report = { income: '9010000000999999', gross_expenses: '0', refunds: '0', net_spending: '0', closing_cash: null, as_of: null, categories: [] };
  const good = await reader(report).api.report(w, '2026-01-01');
  assert.ok(good.ok); assert.equal(good.data.income, '9010000000999999');
  const invalid = await reader({ ...report, income: 9010000000999999 }).api.report(w, '2026-01-01');
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.error.kind, 'invalid_response');
});

test('financial overview uses one RPC snapshot rather than mixing requests', async () => {
  const { api, calls } = reader({ workspace: { workspace: { id: w, kind: 'personal', name: 'Fixture' }, accounts: [], categories: [] },
    transactions: [], report: { income: '0', gross_expenses: '0', refunds: '0', net_spending: '0', closing_cash: null, as_of: null, categories: [] } });
  const result = await api.overview(w, '2026-01-01');
  assert.ok(result.ok);
  assert.deepEqual(calls, [{ name: '/rest/v1/rpc/read_workspace_overview', args: { w, month_start: '2026-01-01' } }]);
});

test('full-month category amounts stay exact, include negative refunds and reconcile before charting', async () => {
  const categories = [{ category_id: w, name: 'Groceries', spent: '9007199254741003' },
    { category_id: '22222222-2222-4222-8222-222222222222', name: 'Refunds', spent: '-10' }];
  const report = { income: '0', gross_expenses: '9007199254741003', refunds: '10', net_spending: '9007199254740993',
    closing_cash: null, as_of: null, categories };
  const result = await reader(report).api.report(w, '2026-01-01');
  assert.ok(result.ok);
  assert.deepEqual(result.data.categories, categories.map(c => ({ id: c.category_id, name: c.name, spent: c.spent })));
  for (const spent of ['1', 9007199254741003]) {
    assert.equal((await reader({ ...report, categories: [{ ...categories[0], spent }] }).api.report(w, '2026-01-01')).ok, false);
  }
});

test('transaction editor receives exact revision, category and account postings; pagination stays scoped', async () => {
  const row = { id: w, workspace_id: w, kind: 'expense', amount: '10000', economic_date: '2026-01-10',
    description: '', voided_at: null, version: '2', category_id: w, effective_category_id: w, paid_by: w,
    postings: [{ workspace_id: w, transaction_id: w, account_id: w, amount: '-10000' }] };
  const { api, calls } = reader([row]);
  const result = await api.transactions(w, '2026-01-01', '2026-02-01', { date: '2026-01-09', id: w });
  assert.ok(result.ok);
  assert.equal(result.data[0].version, 2);
  assert.equal(result.data[0].accountId, w);
  assert.equal(result.data[0].categoryId, w);
  assert.equal(result.data[0].paidBy, w);
  assert.deepEqual(calls[0].args, { w, from_date: '2026-01-01', until_date: '2026-02-01', page_size: 50, after_date: '2026-01-09', after_id: w });
  for (const invalid of [{ version: 'bad' }, { postings: [{ ...row.postings[0], workspace_id: 'other' }] }]) {
    assert.equal((await reader([{ ...row, ...invalid }]).api.transactions(w, '2026-01-01', '2026-02-01')).ok, false);
  }
});

test('denials, missing RPCs and wrong-workspace responses never become empty or successful data', async () => {
  for (const [code, expected] of [['42501', 'denied'], ['PGRST202', 'database_unavailable'], ['40001', 'conflict']]) {
    const result = await reader({ code, message: 'secret fixture error', details: 'private' }, 403).api.listWorkspaces();
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.kind, expected);
    assert.doesNotMatch(JSON.stringify(result), /secret fixture|private/);
  }
  const result = await reader({ workspace: { id: w, kind: 'personal', name: 'Fixture' }, accounts: [{ id: w, workspace_id: 'other', name: 'No', balance: '1', reserved: '0', shortfall: '0' }] }).api.workspace(w);
  assert.equal(result.ok, false);
});
