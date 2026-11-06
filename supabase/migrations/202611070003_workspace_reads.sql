begin;

-- Read-only discovery is required because ledger remains outside exposed schemas.
create function public.list_workspaces() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not ledger.allowed() then raise exception 'Access denied' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'kind',w.kind,'role',m.role)
      order by w.kind,w.id),'[]'::jsonb)
    from ledger.workspaces w join ledger.workspace_members m on m.workspace_id=w.id
    where m.user_id=auth.uid() and m.revoked_at is null and ledger.is_member(w.id));
end $$;
revoke all on function public.list_workspaces() from public,anon;
grant execute on function public.list_workspaces() to authenticated;

-- STABLE nested reads share the calling SQL statement's MVCC snapshot.
create function public.read_workspace_overview(w uuid, month_start date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not ledger.is_member(w) then raise exception 'Access denied' using errcode='42501'; end if;
  if month_start is null or extract(day from month_start)<>1 then raise exception 'Month start required' using errcode='22023'; end if;
  return jsonb_build_object(
    'workspace',public.read_workspace(w),
    'report',public.monthly_report(w,month_start),
    'transactions',public.read_transactions(w,month_start,(month_start+interval '1 month')::date,null,null,50));
end $$;
revoke all on function public.read_workspace_overview(uuid,date) from public,anon;
grant execute on function public.read_workspace_overview(uuid,date) to authenticated;

commit;
