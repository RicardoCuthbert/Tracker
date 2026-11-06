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

test('exact aggregate strings survive SDK and decoder; JSON numbers fail closed', async () => {
  const report = { income: '9010000000999999', gross_expenses: '0', refunds: '0', net_spending: '0', closing_cash: null, as_of: null };
  const good = await reader(report).api.report(w, '2026-01-01');
  assert.ok(good.ok); assert.equal(good.data.income, '9010000000999999');
  const invalid = await reader({ ...report, income: 9010000000999999 }).api.report(w, '2026-01-01');
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.error.kind, 'invalid_response');
});

test('financial overview uses one RPC snapshot rather than mixing requests', async () => {
  const { api, calls } = reader({ workspace: { workspace: { id: w, kind: 'personal', name: 'Fixture' }, accounts: [] },
    transactions: [], report: { income: '0', gross_expenses: '0', refunds: '0', net_spending: '0', closing_cash: null, as_of: null } });
  const result = await api.overview(w, '2026-01-01');
  assert.ok(result.ok);
  assert.deepEqual(calls, [{ name: '/rest/v1/rpc/read_workspace_overview', args: { w, month_start: '2026-01-01' } }]);
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
