import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase/database.types.ts';
import { writeFinancialCommand } from '../../src/features/transactions/write.ts';

const id = '11111111-1111-4111-8111-111111111111';
const command = { name: 'save_transaction', args: { w: id, op: id, p: { id, amount: '10000' }, expected_version: 0 } } as const;
function transport(response: unknown, status = 200) {
  const calls: unknown[] = [];
  const client = createClient<Database>('https://example.supabase.co', 'sb_publishable_test', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify(response), { status, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  return { client, calls };
}
test('writes use exact command and verify confirmed workspace/record/revision', async () => {
  const { client, calls } = transport({ id, workspace_id: id, version: '1' });
  assert.equal((await writeFinancialCommand(client, command)).status, 'saved');
  assert.deepEqual(calls, [{ url: 'https://example.supabase.co/rest/v1/rpc/save_transaction', body: command.args }]);
  assert.equal((await writeFinancialCommand(transport(null).client, command)).status, 'uncertain');
  assert.equal((await writeFinancialCommand(transport({ id, workspace_id: 'other', version: '1' }).client, command)).status, 'uncertain');
});
test('conflicts require reload; uncertain saves require identical retry; raw errors stay private', async () => {
  for (const [code, expected] of [['40001', 'conflict'], ['42501', 'denied'], ['23514', 'invalid'], ['PGRST202', 'invalid'], ['XX000', 'uncertain']]) {
    const result = await writeFinancialCommand(transport({ code, message: 'secret raw record' }, 400).client, command);
    assert.equal(result.status, expected);
    assert.doesNotMatch(JSON.stringify(result), /secret raw record/);
  }
});
