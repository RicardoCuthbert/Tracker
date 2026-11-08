import assert from 'node:assert/strict';
import { test } from 'node:test';
import { credentials } from '../../src/lib/supabase/credentials.ts';

test('credentials validate untrusted forms without trimming passwords or accepting files', () => {
  for (const value of [null, undefined, {}, 'invalid']) assert.equal(credentials(value),null);
  const form = new FormData();
  form.set('email',' member@example.test '); form.set('password',' secret password ');
  assert.deepEqual(credentials(form),{email:'member@example.test',password:' secret password '});
  for (const email of ['', 'invalid', 'a@b\n.test', 'a'.repeat(321)+'@example.test']) {
    form.set('email',email); assert.equal(credentials(form),null);
  }
  form.set('email','member@example.test'); form.set('password','');
  assert.equal(credentials(form),null);
  form.set('password',new Blob(['secret']),'secret.txt'); assert.equal(credentials(form),null);
});
