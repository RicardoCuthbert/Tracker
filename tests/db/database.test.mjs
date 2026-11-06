import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { nativeDatabase } from './native-database.mjs';

test('database schema and real authenticated-role security', async (t) => {
  const db = process.env.TEST_DATABASE_URL ? await nativeDatabase(process.env.TEST_DATABASE_URL) : new PGlite();
  t.after(() => db.close());
  // Supabase-owned Auth objects only; finance/RLS/functions come from real migrations.
  await db.exec(`do $$ begin
    if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
    if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
    end $$;
    create schema auth; create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;`);
  const folder = new URL('../../supabase/migrations/', import.meta.url);
  let files = [];
  try { files = (await readdir(folder)).filter(f => f.endsWith('.sql')).sort(); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  for (const file of files) await db.exec(await readFile(new URL(file, folder), 'utf8'));
  assert.ok(files.length >= 2, 'versioned schema and operation migrations must exist');
  assert.equal((await db.query("select count(*)::int n from pg_tables where schemaname='ledger'")).rows[0].n, 14);

  const ids = Array.from({ length: 4 }, () => randomUUID());
  const [alice, bob, stranger, unverified] = ids;
  const q = async (sql, args = []) => (await db.query(sql, args)).rows;
  const rpc = async (name, args = []) => (await q(`select public.${name}(${args.map((_, i) => `$${i + 1}`).join(',')}) result`, args))[0].result;
  const as = async (id, role = 'authenticated') => {
    await db.exec(`reset role; set role ${role}`);
    await q("select set_config('request.jwt.claim.sub',$1,false)", [id ?? '']);
  };
  const admin = () => db.exec('reset role');
  const denied = (fn, code = '42501') => assert.rejects(fn, e => e.code === code);
  const session = async (user) => {
    const s = await db.connect();
    await s.exec('set role authenticated');
    await s.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
    return s;
  };
  const record = (w, entity, data, version = 0, op = randomUUID()) => rpc('save_financial_record', [w, op, entity, JSON.stringify(data), version]);
  const transaction = (w, data, version = 0, op = randomUUID()) => rpc('save_transaction', [w, op, JSON.stringify(data), version]);
  const date = '2026-01-10';
  const account = (name, opening = '0') => ({ name, kind: 'cash', opening_date: date, opening_balance: opening });
  await q('insert into auth.users values ($1,now()),($2,now()),($3,now()),($4,null)', ids);
  await q('insert into ledger.allowed_users values ($1),($2),($3)', [alice, bob, unverified]);

  await t.test('anonymous, unlisted and unverified identities fail closed', async () => {
    await as(null, 'anon');
    await denied(() => rpc('ensure_personal_workspace'));
    await denied(() => q('select * from ledger.accounts'));
    await as(stranger); await denied(() => rpc('ensure_personal_workspace'));
    await as(unverified); await denied(() => rpc('ensure_personal_workspace'));
  });

  await as(alice);
  const wa = await rpc('ensure_personal_workspace');
  assert.equal(await rpc('ensure_personal_workspace'), wa);
  const cash = await record(wa, 'account', account('Cash', '1000000'));
  const savings = await record(wa, 'account', { ...account('Savings'), kind: 'savings' });
  const groceries = await record(wa, 'category', { name: 'Groceries', kind: 'expense' });
  const salary = await record(wa, 'category', { name: 'Salary', kind: 'income' });
  const goal = await record(wa, 'goal', { name: 'Emergency', target_amount: '500000', deadline: null });
  const shared = await rpc('create_shared_workspace');
  const scash = await record(shared, 'account', account('Shared', '500000'));
  const invite = await rpc('invite_member', [shared, bob]);
  await as(bob);
  const wb = await rpc('ensure_personal_workspace');
  const bcash = await record(wb, 'account', account('Private B', '999999'));
  const bcat = await record(wb, 'category', { name: 'Private category', kind: 'expense' });
  const bgoal = await record(wb, 'goal', { name: 'Private goal', target_amount: '100000' });

  await t.test('workspace discovery returns only active authorized memberships', async () => {
    await as(alice);
    assert.deepEqual((await rpc('list_workspaces')).map(w => w.id).sort(), [wa, shared].sort());
    await as(bob);
    assert.deepEqual((await rpc('list_workspaces')).map(w => w.id), [wb]);
    await as(stranger); await denied(() => rpc('list_workspaces'));
    await as(null, 'anon'); await denied(() => rpc('list_workspaces'));
    await as(alice);
  });

  await t.test('all tables enforce SELECT and deny arbitrary INSERT/UPDATE/DELETE', async () => {
    await as(alice);
    const tables = (await q("select tablename,rowsecurity from pg_tables where schemaname='ledger'"));
    for (const { tablename, rowsecurity } of tables) {
      assert.equal(rowsecurity, true, `${tablename}: RLS`);
      if (tablename === 'allowed_users') {
        await denied(() => q('select * from ledger.allowed_users'));
        await denied(() => q('insert into ledger.allowed_users default values'));
        await denied(() => q('update ledger.allowed_users set user_id=user_id'));
        await denied(() => q('delete from ledger.allowed_users')); continue;
      }
      const rows = await q(`select * from ledger.${tablename}`);
      assert.ok(rows.every(r => !r.workspace_id || r.workspace_id === wa || r.workspace_id === shared), tablename);
      if (tablename === 'profiles') assert.deepEqual(rows.map(r => r.user_id), [alice]);
      if (tablename === 'workspaces') assert.ok(rows.every(r => r.id === wa || r.id === shared));
      const column = (await q("select column_name from information_schema.columns where table_schema='ledger' and table_name=$1 and is_identity='NO' order by ordinal_position limit 1", [tablename]))[0].column_name;
      await denied(() => q(`insert into ledger.${tablename} default values`));
      await denied(() => q(`update ledger.${tablename} set ${column}=${column}`));
      await denied(() => q(`delete from ledger.${tablename}`));
    }
    assert.equal((await q('select count(*)::int n from ledger.accounts where workspace_id=$1', [wb]))[0].n, 0);
    assert.equal((await q('select count(*)::int n from ledger.account_postings p join ledger.accounts a on a.id=p.account_id where a.workspace_id=$1', [wb]))[0].n, 0);
    for (const [fn, args] of [['read_workspace', [wb]], ['monthly_report', [wb, '2026-01-01']], ['read_audit', [wb, '0']], ['read_transactions', [wb, '2026-01-01', '2026-02-01']]]) {
      await denied(() => rpc(fn, args));
    }
    await denied(() => record(wb, 'account', account('Injected')));
    await denied(() => record(wa, 'account', { ...account('Stolen id'), id: bcash.id }));
    await denied(() => q('select ledger.balance($1,$2,$3)', [wb, bcash.id, date]));
  });

  await t.test('invites bind verified identity; shared membership never grants private access', async () => {
    await admin(); await q('update ledger.workspace_invites set expires_at=now()-interval \'1 second\' where id=$1', [invite]);
    await as(bob); await denied(() => rpc('accept_invite', [invite]));
    await admin(); await q('update ledger.workspace_invites set expires_at=now()+interval \'1 day\',revoked_at=now() where id=$1', [invite]);
    await as(bob); await denied(() => rpc('accept_invite', [invite]));
    await admin(); await q('update ledger.workspace_invites set revoked_at=null where id=$1', [invite]);
    await as(alice); await denied(() => rpc('accept_invite', [invite]));
    await denied(() => rpc('invite_member', [wa, bob]));
    await as(bob);
    await denied(() => rpc('read_workspace', [shared]));
    if (db.connect) {
      const sessions = await Promise.all([session(bob), session(bob)]);
      const results = await Promise.allSettled(sessions.map(s => s.query('select public.accept_invite($1)', [invite])));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(results.find(r => r.status === 'rejected').reason.code, '42501');
    } else assert.equal(await rpc('accept_invite', [invite]), shared);
    await denied(() => rpc('accept_invite', [invite]));
    await denied(() => rpc('read_workspace', [wa]));
    await denied(() => rpc('invite_member', [shared, stranger]));
    assert.equal((await rpc('read_workspace', [shared])).accounts[0].id, scash.id);
  });

  let expense;
  await t.test('opening, income, expense, atomic transfer, refund, correction and goal reconcile', async () => {
    await as(alice);
    await denied(() => rpc('read_workspace_overview', [wb, '2026-01-01']));
    const before = await rpc('monthly_report', [wa, '2026-01-01']);
    assert.equal(before.closing_cash, '1000000'); assert.equal(before.income, '0');
    await transaction(wa, { kind: 'income', amount: '2000000', economic_date: date, account_id: cash.id, category_id: salary.id });
    expense = await transaction(wa, { amount: '300000', economic_date: date, account_id: cash.id, category_id: groceries.id });
    await transaction(wa, { kind: 'transfer', amount: '200000', economic_date: date, account_id: cash.id, destination_account_id: savings.id });
    await transaction(wa, { kind: 'refund', amount: '50000', economic_date: date, account_id: cash.id, original_expense_id: expense.id });
    await transaction(wa, { kind: 'correction', amount: '10000', economic_date: date, account_id: cash.id, description: 'Fixture reconciliation' });
    await rpc('allocate_goal', [wa, randomUUID(), goal.id, savings.id, 'reserve', '100000']);
    const report = await rpc('monthly_report', [wa, '2026-01-01']);
    assert.deepEqual([report.closing_cash, report.income, report.gross_expenses, report.refunds, report.net_spending, report.operating_net, report.current_reservations],
      ['2760000', '2000000', '300000', '50000', '250000', '1750000', '100000']);
    assert.equal(BigInt(report.starting_cash) + BigInt(report.income) - BigInt(report.gross_expenses) + BigInt(report.refunds) + BigInt(report.corrections) + BigInt(report.openings), BigInt(report.closing_cash));
    const state = await rpc('read_workspace', [wa]);
    assert.equal(state.accounts.find(a => a.id === cash.id).balance, '2560000');
    assert.equal(state.accounts.find(a => a.id === savings.id).balance, '200000');
    const combined = await rpc('read_workspace_overview', [wa, '2026-01-01']);
    assert.equal(combined.report.closing_cash, '2760000');
    assert.equal(combined.workspace.accounts.reduce((n,a) => n+BigInt(a.balance),0n), 2760000n);
    assert.equal(combined.transactions.length, 5);
    assert.equal(state.accounts.reduce((n, a) => n + BigInt(a.balance) - BigInt(a.reserved), 0n), 2660000n);
    assert.equal((await rpc('read_transactions', [wa, '2026-01-01', '2026-02-01'])).length, 5);
  });

  await t.test('foreign workspace/type/date/amount attacks fail and leave no partial writes', async () => {
    const base = { amount: '100', economic_date: date, account_id: cash.id, category_id: groceries.id };
    for (const invalid of [{ account_id: bcash.id }, { category_id: bcat.id }, { category_id: salary.id },
      { amount: '0' }, { amount: '-1' }, { amount: '1.1' }, { amount: '1e3' }, { amount: 100 },
      { amount: '1000000000001' }, { economic_date: '2026-01-09' }, { economic_date: '2999-01-01' },
      { kind: 'transfer', category_id: null, destination_account_id: bcash.id },
      { kind: 'transfer', category_id: null, destination_account_id: cash.id },
      { kind: 'refund', category_id: null, original_expense_id: expense.id, amount: '250001' },
      { kind: 'refund', category_id: null, original_expense_id: randomUUID() }, { paid_by: bob }]) {
      await assert.rejects(() => transaction(wa, { ...base, ...invalid }));
    }
    await assert.rejects(() => record(wa, 'budget', { category_id: bcat.id, month: '2026-01-01', amount: '1' }));
    await assert.rejects(() => rpc('allocate_goal', [wa, randomUUID(), bgoal.id, savings.id, 'reserve', '1']));
    assert.equal((await rpc('read_transactions', [wa, '2026-01-01', '2026-02-01'])).length, 5);
    const counts = await q('select (select count(*) from ledger.mutation_operations where result is null)::int incomplete');
    assert.equal(counts[0].incomplete, 0);
  });

  await t.test('transactional retries, changed payloads, stale revisions and audit', async () => {
    const op = randomUUID();
    const payload = { amount: '100', economic_date: date, account_id: cash.id };
    const one = await transaction(wa, payload, 0, op);
    assert.deepEqual(await transaction(wa, payload, 0, op), one);
    await denied(() => transaction(wa, { ...payload, amount: '101' }, 0, op), '40001');
    const updated = await transaction(wa, { ...payload, id: one.id, amount: '200' }, 1);
    assert.equal(updated.version, '2');
    await denied(() => transaction(wa, { ...payload, id: one.id }, 1), '40001');
    const audit = await rpc('read_audit', [wa, '0']);
    assert.equal(audit.filter(a => a.operation_id === op).length, 1);
    assert.equal(audit.find(a => a.entity_id === one.id && a.before_value?.version === '1').after_value.amount, '200');
    assert.equal(audit.find(a => a.entity_id === one.id && a.before_value?.version === '1').before_value.postings[0].account_id, cash.id);
    await denied(() => record(wa, 'account', { ...account('Cash', '1'), id: cash.id }, 1), '23514');
    const voided = await rpc('void_transaction', [wa, randomUUID(), one.id, 2, 'Fixture mistake']);
    assert.equal(voided.version, '3');
    await denied(() => rpc('void_transaction', [wa, randomUUID(), expense.id, 1, 'Has refund']), '23514');
  });

  await t.test('budgets distinguish zero/unset; refund month and recategorization stay exact', async () => {
    const budget = await record(wa, 'budget', { category_id: groceries.id, month: '2026-01-01', amount: '0' });
    const report = await rpc('monthly_report', [wa, '2026-01-01']);
    assert.equal(report.categories.find(c => c.category_id === groceries.id).remaining, '-250000');
    assert.equal(report.categories.find(c => c.name === 'Uncategorized').budget, null);
    await denied(() => record(wa, 'budget', { id: budget.id, category_id: groceries.id, month: '2026-01-01', amount: '1' }, 0), '40001');
    await denied(() => record(wa, 'budget', { category_id: groceries.id, month: '2026-01-02', amount: '1' }), '23514');
    const other = await record(wa, 'category', { name: 'Other', kind: 'expense' });
    const newer = await transaction(wa, { id: expense.id, amount: '300000', economic_date: date, account_id: cash.id, category_id: other.id }, 1);
    await transaction(wa, { kind: 'refund', amount: '10000', economic_date: '2026-02-01', account_id: cash.id, original_expense_id: expense.id });
    const feb = await rpc('monthly_report', [wa, '2026-02-01']);
    assert.equal(feb.income, '0'); assert.equal(feb.net_spending, '-10000');
    assert.equal(feb.categories.find(c => c.category_id === other.id).spent, '-10000');
    await denied(() => transaction(wa, { id: expense.id, amount: '50000', economic_date: date, account_id: cash.id, category_id: other.id }, Number(newer.version)), '23514');
  });

  await t.test('reservations cannot overbook or over-release; spending can underfund goals', async () => {
    await denied(() => rpc('allocate_goal', [wa, randomUUID(), goal.id, savings.id, 'reserve', '100001']), '23514');
    await denied(() => rpc('allocate_goal', [wa, randomUUID(), goal.id, savings.id, 'release', '100001']), '23514');
    await transaction(wa, { kind: 'transfer', amount: '150000', economic_date: date, account_id: savings.id, destination_account_id: cash.id });
    assert.equal((await rpc('read_workspace', [wa])).accounts.find(a => a.id === savings.id).shortfall, '50000');
    const archived = await record(wa, 'account', { ...account('Savings'), id: savings.id, kind: 'savings', archived: true }, 1);
    await denied(() => rpc('allocate_goal', [wa, randomUUID(), goal.id, savings.id, 'reserve', '1']), '23514');
    await rpc('allocate_goal', [wa, randomUUID(), goal.id, savings.id, 'release', '100000']);
    assert.equal((await rpc('read_workspace', [wa])).accounts.find(a => a.id === archived.id).reserved, '0');
    const archiveGoal = await record(wa, 'goal', { name: 'Archive fixture', target_amount: '1000' });
    await rpc('allocate_goal', [wa, randomUUID(), archiveGoal.id, cash.id, 'reserve', '100']);
    await denied(() => rpc('archive_goal', [wa, randomUUID(), archiveGoal.id, 1, false]), '23514');
    const result = await rpc('archive_goal', [wa, randomUUID(), archiveGoal.id, 1, true]);
    assert.equal(result.released[0].amount, '100');
    assert.ok(result.archived_at);
    assert.equal((await rpc('read_workspace', [wa])).goals.find(g => g.id === archiveGoal.id).reserved, '0');
  });

  let sharedOp; let sharedPayload;
  await t.test('shared expense counted once; creator differs from payer; private account forbidden', async () => {
    await as(bob);
    sharedOp = randomUUID(); sharedPayload = { amount: '10000', account_id: scash.id, paid_by: alice, economic_date: date };
    const entry = await transaction(shared, sharedPayload, 0, sharedOp);
    assert.equal(entry.created_by, bob); assert.equal(entry.paid_by, alice);
    assert.equal((await rpc('monthly_report', [shared, '2026-01-01'])).net_spending, '10000');
    await denied(() => transaction(shared, { ...sharedPayload, account_id: bcash.id }), '23514');
    await as(alice);
    assert.equal((await rpc('monthly_report', [shared, '2026-01-01'])).net_spending, '10000');
  });

  await t.test('revocation reauthorizes retries, reads and audit; preserves history and private workspace', async () => {
    await admin();
    await q('update ledger.workspace_members set revoked_at=now() where workspace_id=$1 and user_id=$2', [shared, bob]);
    await as(bob);
    await denied(() => transaction(shared, sharedPayload, 0, sharedOp));
    await denied(() => rpc('read_workspace', [shared]));
    await denied(() => rpc('read_audit', [shared, '0']));
    assert.deepEqual((await rpc('list_workspaces')).map(w => w.id), [wb]);
    assert.equal((await q('select * from ledger.accounts where workspace_id=$1', [shared])).length, 0);
    assert.equal((await rpc('read_workspace', [wb])).accounts[0].id, bcash.id);
    await as(alice);
    assert.equal((await rpc('read_transactions', [shared, '2026-01-01', '2026-02-01'])).length, 1);
  });

  await t.test('deferred integrity rejects missing transfer leg even for migration role', async () => {
    await admin();
    await assert.rejects(() => db.exec(`begin;
      insert into ledger.transactions(id,workspace_id,kind,amount,economic_date,created_by)
      values ('${randomUUID()}','${wa}','transfer',100,'${date}','${alice}'); commit;`), e => e.code === '23514');
    await db.exec('rollback');
    const invalid = randomUUID();
    await assert.rejects(() => db.exec(`begin;
      insert into ledger.transactions(id,workspace_id,kind,amount,economic_date,category_id,created_by)
      values ('${invalid}','${wa}','income',100,'${date}','${groceries.id}','${alice}');
      insert into ledger.account_postings values ('${wa}','${invalid}','${cash.id}',100); commit;`), e => e.code === '23514');
    await db.exec('rollback');
    await assert.rejects(() => q('delete from auth.users where id=$1', [alice]), e => ['23503', '23001'].includes(e.code));
  });

  await t.test('second posting failure rolls back event, first posting, operation and audit', async () => {
    await as(alice);
    const destination = await record(wa, 'account', account('Failing destination'));
    const op = randomUUID();
    const before = (await rpc('read_workspace', [wa])).accounts.find(a => a.id === cash.id).balance;
    await admin();
    await db.exec(`alter table ledger.account_postings add constraint fixture_second_leg check(account_id<>'${destination.id}') not valid`);
    await as(alice);
    await denied(() => transaction(wa, { kind: 'transfer', amount: '100', economic_date: date, account_id: cash.id, destination_account_id: destination.id }, 0, op), '23514');
    assert.equal((await rpc('read_workspace', [wa])).accounts.find(a => a.id === cash.id).balance, before);
    assert.equal((await q('select * from ledger.mutation_operations where operation_id=$1', [op])).length, 0);
    assert.equal((await q('select * from ledger.audit_events where operation_id=$1', [op])).length, 0);
    assert.equal((await q('select * from ledger.account_postings where account_id=$1', [destination.id])).length, 0);
    await admin(); await db.exec('alter table ledger.account_postings drop constraint fixture_second_leg');
  });

  await t.test('exact aggregate survives JSON above Number.MAX_SAFE_INTEGER', async () => {
    await admin();
    await q(`insert into ledger.accounts(workspace_id,name,kind,opening_date,opening_balance)
      select $1,'Exact fixture '||n,'bank','2026-01-10',1000000000000 from generate_series(1,9010) n`, [wb]);
    await as(bob);
    const report = await rpc('monthly_report', [wb, '2026-01-01']);
    assert.equal(report.closing_cash, '9010000000999999');
    assert.ok(BigInt(report.closing_cash) > BigInt(Number.MAX_SAFE_INTEGER));
    assert.equal(JSON.parse(JSON.stringify(report)).closing_cash, report.closing_cash);
    await as(alice);
    assert.equal((await q('select count(*)::int n from ledger.accounts where workspace_id=$1', [wb]))[0].n, 0);
  });

  await t.test('all entry points have fixed search_path and no anonymous EXECUTE', async () => {
    const functions = await q(`select p.oid::regprocedure::text name,p.proconfig,
      has_function_privilege('anon',p.oid,'execute') anonymous from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.prosecdef`);
    assert.ok(functions.length >= 12);
    for (const f of functions) { assert.equal(f.anonymous, false, f.name); assert.ok(f.proconfig.includes('search_path=""'), f.name); }
  });

  await t.test('concurrent retries, refunds, reservations, revisions and expense locking', { skip: !db.connect && 'Run TEST_DATABASE_URL against dedicated local PostgreSQL for multiple connections' }, async () => {
    await as(alice);
    const [s1, s2] = await Promise.all([session(alice), session(alice)]);
    const sql = 'select public.save_transaction($1,$2,$3::jsonb,$4) result';
    const a = await record(wa, 'account', account('Concurrent', '1000'));
    const payload = { amount: '100', account_id: a.id, economic_date: date };
    const op = randomUUID();
    const retry = await Promise.all([s1, s2].map(s => s.query(sql, [wa, op, JSON.stringify(payload), 0])));
    assert.equal(retry[0].rows[0].result.id, retry[1].rows[0].result.id);
    const original = retry[0].rows[0].result.id;
    const refunds = await Promise.allSettled([s1, s2].map(s => s.query(sql, [wa, randomUUID(), JSON.stringify({ kind: 'refund', amount: '70', account_id: a.id, economic_date: date, original_expense_id: original }), 0])));
    assert.equal(refunds.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(refunds.find(r => r.status === 'rejected').reason.code, '23514');
    const allocationAccount = await record(wa, 'account', account('Reservation race', '1000'));
    const reservations = await Promise.allSettled([s1, s2].map(s => s.query('select public.allocate_goal($1,$2,$3,$4,$5,$6)', [wa, randomUUID(), goal.id, allocationAccount.id, 'reserve', '700'])));
    assert.equal(reservations.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(reservations.find(r => r.status === 'rejected').reason.code, '23514');
    const changed = await Promise.allSettled([s1, s2].map(s => s.query(sql, [wa, randomUUID(), JSON.stringify({ ...payload, id: original, amount: '90' }), 1])));
    assert.equal(changed.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(changed.find(r => r.status === 'rejected').reason.code, '40001');

    const locked = await record(wa, 'account', account('Expense lock', '1000'));
    await s1.exec('begin');
    await s1.query(sql, [wa, randomUUID(), JSON.stringify({ amount: '500', account_id: locked.id, economic_date: date }), 0]);
    const pending = Promise.allSettled([s2.query('select public.allocate_goal($1,$2,$3,$4,$5,$6)', [wa, randomUUID(), goal.id, locked.id, 'reserve', '700'])]);
    await admin(); // pg_stat_activity hides other backends' wait details from authenticated.
    let waiting = false;
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        const state = await q("select exists(select 1 from pg_stat_activity where application_name=$1 and wait_event_type='Lock') waiting", [s2.label]);
        if (state[0].waiting) { waiting = true; break; }
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      assert.equal(waiting, true, 'Reservation must wait for uncommitted expense');
    } finally { await s1.exec('commit'); }
    const [outcome] = await pending;
    assert.equal(outcome.status, 'rejected'); assert.equal(outcome.reason.code, '23514');

    await as(alice);
    const today = (await q("select to_char(now() at time zone 'Asia/Jakarta','YYYY-MM-DD') as financial_date"))[0].financial_date;
    const marker = await transaction(wa, { amount: '100', account_id: locked.id, economic_date: today });
    await Promise.all([
      (async () => {
        for (let i=0;i<12;i++) await s2.query(sql, [wa, randomUUID(), JSON.stringify({ id: marker.id, amount: String(101+i), account_id: locked.id, economic_date: today }), i+1]);
      })(),
      (async () => {
        for (let i=0;i<12;i++) {
          const overview = (await s1.query('select public.read_workspace_overview($1,$2) value', [wa, today.slice(0,7)+'-01'])).rows[0].value;
          assert.equal(overview.workspace.accounts.reduce((sum,a)=>sum+BigInt(a.balance),0n).toString(), overview.report.closing_cash,
            'Concurrent edits must not mix account/report snapshots');
        }
      })(),
    ]);
  });
});
