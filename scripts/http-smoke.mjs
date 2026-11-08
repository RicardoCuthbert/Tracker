import assert from 'node:assert/strict';
import nextEnv from '@next/env';
import { readFile } from 'node:fs/promises';
import { authConfig } from '../src/lib/supabase/config.ts';

nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = new URL(process.argv[2] ?? 'http://127.0.0.1:3131');
assert.ok(['127.0.0.1','localhost','[::1]'].includes(base.hostname), 'Smoke target must be loopback');
const config = authConfig();
const request = path => fetch(new URL(path,base), { redirect:'manual', signal:AbortSignal.timeout(15000) });
for (const path of ['/', '/accounts', '/transactions']) {
  const response = await request(path);
  assert.equal(response.status,307); assert.equal(response.headers.get('location'),'/workspaces');
}
const login = await request('/sign-in');
assert.equal(login.status,200); assert.match(login.headers.get('cache-control'),/no-store/);
const body = await login.text(); assert.match(body,/Continue with Google/);
assert.match(body,/name="email"/); assert.match(body,/name="password"/);
const signup = await request('/sign-up');
assert.equal(signup.status,200); assert.match(signup.headers.get('cache-control'),/no-store/);
const signupBody = await signup.text();
assert.match(signupBody,/Create your account/); assert.match(signupBody,/autocomplete="new-password"/i);
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
// Invoke the built action endpoint directly, bypassing all rendered UI guards.
const manifest = JSON.parse(await readFile('.next/server/server-reference-manifest.json','utf8'));
const actionId = Object.entries(manifest.node).find(([,entry]) => entry.exportedName === 'manageWorkspace')?.[0];
assert.ok(actionId, 'Workspace server action must exist in the production build');
for (const operation of ['create','invite','accept']) {
  const form = new FormData();
  form.set(`$ACTION_ID_${actionId}`,''); form.set('operation',operation);
  form.set('workspace','00000000-0000-4000-8000-000000000000');
  form.set('recipient','00000000-0000-4000-8000-000000000000');
  form.set('invitation','00000000-0000-4000-8000-000000000000');
  const response = await fetch(new URL('/workspaces',base), {
    method:'POST',body:form,headers:{Origin:base.origin},redirect:'manual',signal:AbortSignal.timeout(15000),
  });
  assert.equal(response.status,303); assert.match(response.headers.get('location'),/^\/sign-in/);
}
const financialActionId = Object.entries(manifest.node).find(([,entry]) => entry.exportedName === 'saveFinancial')?.[0];
assert.ok(financialActionId, 'Financial server action must exist in the production build');
for (const operation of ['account','category','transaction','void']) {
  const form = new FormData(); form.set(`$ACTION_ID_${financialActionId}`,''); form.set('operation',operation);
  form.set('workspace','00000000-0000-4000-8000-000000000000');
  const response = await fetch(new URL('/w/00000000-0000-4000-8000-000000000000',base), {
    method:'POST',body:form,headers:{Origin:base.origin},redirect:'manual',signal:AbortSignal.timeout(15000),
  });
  assert.equal(response.status,303); assert.match(response.headers.get('location'),/^\/sign-in/);
}
const callback = await request('/auth/callback?next=https://untrusted.example');
assert.match(callback.headers.get('cache-control'),/no-store/);
if (config) {
  assert.equal(callback.status,307);
  assert.equal(callback.headers.get('location'),`${config.site}/sign-in?status=failed`);
} else assert.equal(callback.status,503);
console.log('PASS local production HTTP: live entry redirects, sign-in/signup forms, signed-out routes and direct workspace/financial action POSTs, no-store headers and fixed callback destination. No hosted authenticated or OAuth-consent claim.');
