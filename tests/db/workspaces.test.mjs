import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

test('verified signup, independent households and invitation privacy under real roles', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon;
    grant execute on function auth.uid() to authenticated,anon;`);
  const folder = new URL('../../supabase/migrations/', import.meta.url);
  const existing = randomUUID();
  for (const file of (await readdir(folder)).filter(f => f.endsWith('.sql')).sort()) {
    if (file === '202611070004_auth_workspaces.sql')
      await db.query('insert into auth.users values ($1,now())',[existing]);
    await db.exec(await readFile(new URL(file, folder), 'utf8'));
  }
  const q = async (sql, args = []) => (await db.query(sql, args)).rows;
  const rpc = async (name, args = []) => (await q(`select public.${name}(${args.map((_,i) => `$${i+1}`).join(',')}) result`,args))[0].result;
  const as = async (id, role = 'authenticated') => {
    await db.exec(`reset role; set role ${role}`);
    await q("select set_config('request.jwt.claim.sub',$1,false)",[id ?? '']);
  };
  const denied = fn => assert.rejects(fn, e => e.code === '42501');
  const [a,b,c,d,unverified] = Array.from({length:5}, () => randomUUID());
  await q('insert into auth.users values ($1,now()),($2,now()),($3,now()),($4,now()),($5,null)',[a,b,c,d,unverified]);
  assert.equal((await q("select count(*)::int n from ledger.workspaces where kind='personal'"))[0].n,5,
    'existing verified users and every verified signup receive one personal workspace');
  assert.equal((await q("select count(*)::int n from ledger.workspaces where kind='personal' and owner_user_id=$1",[existing]))[0].n,1);
  await as(unverified); await denied(() => rpc('ensure_personal_workspace'));
  await as(null,'anon'); await denied(() => rpc('list_workspace_invitations'));
  await db.exec('reset role');
  await q('update auth.users set email_confirmed_at=now() where id=$1',[unverified]);
  await as(unverified); const personal = await rpc('ensure_personal_workspace');
  assert.equal(await rpc('ensure_personal_workspace'),personal);
  await as(a); const wa = await rpc('ensure_personal_workspace'); const shared = await rpc('create_shared_workspace');
  assert.equal(await rpc('create_shared_workspace'),shared);
  const invite = await rpc('invite_member',[shared,b]);
  assert.equal(await rpc('invite_member',[shared,b]),invite,'retry reuses pending invitation');
  await denied(() => rpc('invite_member',[shared,c])); // one reserved seat
  await as(c); const other = await rpc('create_shared_workspace');
  assert.notEqual(other,shared);
  assert.deepEqual(await rpc('list_workspace_invitations'),[]);
  await denied(() => rpc('accept_invite',[invite]));
  await denied(() => rpc('read_workspace',[wa]));
  await denied(() => rpc('read_workspace',[shared]));
  await as(b);
  const inbox = await rpc('list_workspace_invitations');
  assert.equal(inbox.length,1); assert.equal(inbox[0].id,invite);
  await denied(() => rpc('read_workspace',[shared]));
  assert.equal(await rpc('accept_invite',[invite]),shared);
  await denied(() => rpc('accept_invite',[invite]));
  await denied(() => rpc('create_shared_workspace'));
  await denied(() => rpc('invite_member',[shared,d]));
  await denied(() => rpc('read_workspace',[wa]));
  assert.equal((await rpc('read_workspace',[shared])).workspace.id,shared);
  assert.deepEqual(await rpc('list_workspace_invitations'),[]);
  await denied(() => q('update ledger.workspaces set member_limit=3 where id=$1',[shared]));
  await as(a); await denied(() => rpc('invite_member',[shared,d]));
  await db.exec('reset role');
  await q('update ledger.workspaces set member_limit=3 where id=$1',[shared]);
  await as(a); const third = await rpc('invite_member',[shared,d]);
  await as(d); assert.equal(await rpc('accept_invite',[third]),shared,'capacity can grow through protected policy');
  await db.exec('reset role');
  await q('update ledger.workspace_members set revoked_at=now() where workspace_id=$1 and user_id=$2',[shared,a]);
  await as(a); await denied(() => rpc('invite_member',[shared,c]));
  await as(c); const stale = await rpc('invite_member',[other,unverified]);
  await db.exec('reset role');
  await q('update ledger.workspace_members set revoked_at=now() where workspace_id=$1 and user_id=$2',[other,c]);
  await as(unverified); assert.deepEqual(await rpc('list_workspace_invitations'),[]);
  await denied(() => rpc('accept_invite',[stale]));
});
