import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assessAuthSettings, assessGoogleRedirect } from '../../scripts/staging-checks.mjs';

test('staging probes fail disabled Google and wrong callback instead of trusting HTTP status', () => {
  assert.equal(assessAuthSettings({ ok: true }, { external: { google: false } }).status, 'FAIL');
  assert.equal(assessAuthSettings({ ok: true }, { external: { google: true } }).status, 'PASS');
  const project = 'https://example.supabase.co';
  const response = (callback: string) => new Response(null, { status: 302, headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=${encodeURIComponent(callback)}` } });
  assert.equal(assessGoogleRedirect(response('https://wrong.test/callback'), project).status, 'FAIL');
  assert.equal(assessGoogleRedirect(response(`${project}/auth/v1/callback`), project).status, 'PASS');
});
