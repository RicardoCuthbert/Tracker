// Read-only/anonymous probes. Never print keys, tokens, headers or raw responses.
import nextEnv from '@next/env';
import { mkdir, writeFile } from 'node:fs/promises';
import { authConfig } from '../src/lib/supabase/config.ts';
import { assessAuthSettings, assessGoogleRedirect } from './staging-checks.mjs';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const config = authConfig();
const result = { checkedAt: new Date().toISOString(), configuration: config ? 'PASS' : 'FAIL', checks: [] };
if (config) {
  async function check(name, path, options = {}, assess = () => ({})) {
    try {
      const response = await fetch(`${config.url}${path}`, {
        ...options, redirect: 'manual', signal: AbortSignal.timeout(15000),
        headers: { apikey: config.key, ...options.headers },
      });
      let data = null;
      if (response.headers.get('content-type')?.includes('json')) data = await response.json();
      const details = assess(response, data);
      result.checks.push({ name, httpStatus: response.status, ...details });
    } catch {
      result.checks.push({ name, status: 'BLOCKED', reason: 'Network/response failure; secrets and response omitted' });
    }
  }
  await check('auth_settings', '/auth/v1/settings', {}, assessAuthSettings);
  await check('public_postgrest_openapi', '/rest/v1/', { headers: { Accept: 'application/openapi+json' } }, (r,d) => ({ status: r.ok ? 'PASS' : 'BLOCKED', code: d?.code ?? null }));
  await check('private_ledger_not_exposed', '/rest/v1/accounts?select=id&limit=0', { headers: { 'Accept-Profile': 'ledger' } }, (r, d) => ({ status: d?.code === 'PGRST106' ? 'PASS' : 'FAIL', code: d?.code ?? null }));
  const w = '00000000-0000-4000-8000-000000000000';
  const args = {
    ensure_personal_workspace: {}, create_shared_workspace: {}, list_workspaces: {}, invite_member: { w, recipient: w }, accept_invite: { invitation: w },
    read_workspace: { w }, read_workspace_overview: { w, month_start: '2026-01-01' }, read_transactions: { w, from_date: '2026-01-01', until_date: '2026-02-01' }, monthly_report: { w, month_start: '2026-01-01' },
    save_financial_record: { w, op: w, entity: 'account', p: {}, expected_version: 0 }, save_transaction: { w, op: w, p: {}, expected_version: 0 },
    void_transaction: { w, op: w, item: w, expected_version: 0, reason: 'Synthetic anonymous authorization probe' },
    allocate_goal: { w, op: w, goal: w, account: w, direction: 'reserve', amount: '1' },
    archive_goal: { w, op: w, goal: w, expected_version: 0, release_reservations: false }, read_audit: { w },
  };
  for (const [name, payload] of Object.entries(args)) {
    // No authenticated JWT: correctly deployed RPCs deny EXECUTE before their body.
    await check(`anonymous_rpc:${name}`, `/rest/v1/rpc/${name}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    }, (r, d) => ({ status: d?.code === '42501' ? 'PASS' : 'FAIL', code: d?.code ?? null,
      missingOrStaleSignature: d?.code === 'PGRST202' }));
  }
  const challenge = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ';
  await check('google_authorize_redirect', `/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${config.site}/auth/callback`)}&code_challenge=${challenge}&code_challenge_method=s256`, {}, r => assessGoogleRedirect(r, config.url));
}
await mkdir('test-results', { recursive: true });
await writeFile('test-results/staging-audit.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (!config || result.checks.some(c => c.status !== 'PASS')) process.exitCode = 1;
