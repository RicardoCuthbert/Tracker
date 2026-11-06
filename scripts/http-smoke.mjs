import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import { authConfig } from '../src/lib/supabase/config.ts';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3131');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname), 'Smoke target must be loopback');
const config = authConfig();
const request = path => fetch(new URL(path,base), { redirect:'manual', signal:AbortSignal.timeout(15000) });
const login = await request('/sign-in');
assert.equal(login.status,200); assert.match(login.headers.get('cache-control'),/no-store/);
const body = await login.text(); assert.match(body,/Continue with Google/);
assert.equal(/<button\b[^>]*\sdisabled(?:[=\s>])[^>]*>Continue with Google/.test(body),!config);
for (const path of ['/auth/ready','/workspaces','/w/00000000-0000-4000-8000-000000000000']) {
  const response = await request(path);
  if (response.status === 307) assert.match(response.headers.get('location'),/^\/sign-in/);
  else {
    // App Router loading boundaries stream a meta redirect after sending 200.
    assert.equal(response.status,200);
    const html = await response.text();
    const streamed = /<meta\b[^>]*http-equiv="refresh"[^>]*content="[^\"]*\/sign-in[^\"]*"[^>]*>/i.test(html)
      || /NEXT_REDIRECT;replace;\/sign-in(?:\?[^;]*)?;307;/.test(html);
    assert.ok(streamed, 'Protected streamed response must contain a sign-in redirect');
    assert.ok(!/<h1[^>]*>Your workspaces|<h1[^>]*>Authentication confirmed/.test(html), 'Signed-out response must contain no authenticated view');
  }
  assert.match(response.headers.get('cache-control'),/no-store/);
}
const callback = await request('/auth/callback?next=https://untrusted.example');
assert.match(callback.headers.get('cache-control'),/no-store/);
if (config) {
  assert.equal(callback.status,307);
  assert.equal(callback.headers.get('location'),`${config.site}/sign-in?status=failed`);
} else assert.equal(callback.status,503);
console.log('PASS local production HTTP: sign-in, signed-out route guards, no-store headers and fixed callback destination. No authenticated or OAuth-consent claim.');
