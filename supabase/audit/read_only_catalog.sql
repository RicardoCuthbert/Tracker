-- Owner runs these SELECTs in staging SQL Editor. No schema/data/config mutations.
select nspname as schema_name from pg_namespace where nspname in ('ledger','public');

select expected.signature, to_regprocedure(expected.signature) is not null as present
from unnest(array[
  'public.ensure_personal_workspace()', 'public.create_shared_workspace()',
  'public.invite_member(uuid,uuid)', 'public.accept_invite(uuid)', 'public.list_workspaces()',
  'public.read_workspace(uuid)', 'public.read_workspace_overview(uuid,date)', 'public.read_transactions(uuid,date,date,date,uuid,integer)',
  'public.monthly_report(uuid,date)', 'public.save_financial_record(uuid,uuid,text,jsonb,integer)',
  'public.save_transaction(uuid,uuid,jsonb,integer)', 'public.void_transaction(uuid,uuid,uuid,integer,text)',
  'public.allocate_goal(uuid,uuid,uuid,uuid,text,text)', 'public.archive_goal(uuid,uuid,uuid,integer,boolean)',
  'public.read_audit(uuid,bigint)'
]) expected(signature);

select p.proname,p.proargnames,pg_get_function_identity_arguments(p.oid) as argument_types,
  p.prosecdef as security_definer,p.proconfig,
  has_function_privilege('anon',p.oid,'EXECUTE') as anonymous_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
  'ensure_personal_workspace','create_shared_workspace','invite_member','accept_invite','list_workspaces',
  'read_workspace','read_workspace_overview','read_transactions','monthly_report','save_financial_record','save_transaction',
  'void_transaction','allocate_goal','archive_goal','read_audit') order by p.proname;

select tablename,rowsecurity from pg_tables where schemaname='ledger' order by tablename;
select tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='ledger' order by tablename,policyname;
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='ledger' and grantee in ('anon','authenticated') order by table_name,grantee,privilege_type;

-- These catalog settings may be NULL even when managed project settings exist.
-- Confirm exposed schemas in dashboard as well; ledger must never be included.
select current_setting('pgrst.db_schemas',true) as configured_api_schemas;
select to_regclass('supabase_migrations.schema_migrations') is not null as has_migration_history;
