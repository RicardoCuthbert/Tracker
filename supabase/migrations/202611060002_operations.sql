begin;

create function ledger.assert_access(w uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- One lock order for all financial and membership operations; small two-person app.
  perform 1 from ledger.workspaces where id=w for update;
  if not ledger.is_member(w) then raise exception 'Access denied' using errcode='42501'; end if;
end $$;

create function ledger.money(v jsonb, signed boolean default false, zero_ok boolean default false) returns bigint
language plpgsql immutable set search_path = '' as $$
declare n bigint;
begin
  if v is null or jsonb_typeof(v)<>'string' or (v#>>'{}') !~ '^-?(0|[1-9][0-9]{0,12})$' then
    raise exception 'Money must be an integer string' using errcode='22023';
  end if;
  n := (v#>>'{}')::bigint;
  if abs(n)>1000000000000 or (not signed and n<0) or (not zero_ok and n=0) then
    raise exception 'Amount out of range' using errcode='22023';
  end if;
  return n;
end $$;

-- Convert every JSON numeric leaf, including numeric aggregates, before crossing HTTP.
create function ledger.exact_json(v jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare r jsonb; k text; x jsonb;
begin
  case jsonb_typeof(v)
    when 'number' then return to_jsonb(v#>>'{}');
    when 'object' then
      r := '{}'::jsonb;
      for k,x in select * from jsonb_each(v) loop r := r || jsonb_build_object(k,ledger.exact_json(x)); end loop;
      return r;
    when 'array' then
      select coalesce(jsonb_agg(ledger.exact_json(value)),'[]') into r from jsonb_array_elements(v); return r;
    else return v;
  end case;
end $$;

create function ledger.begin_operation(w uuid, op uuid, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare previous ledger.mutation_operations;
begin
  perform ledger.assert_access(w);
  if op is null or p is null then raise exception 'Operation and payload required' using errcode='22023'; end if;
  select * into previous from ledger.mutation_operations where workspace_id=w and actor_id=auth.uid() and operation_id=op;
  if found then
    if previous.payload<>p then raise exception 'Operation payload conflict' using errcode='40001'; end if;
    return previous.result;
  end if;
  -- JSONB equality is collision-free canonical payload comparison, no lossy hash.
  insert into ledger.mutation_operations(workspace_id,actor_id,operation_id,payload) values(w,auth.uid(),op,p);
  return null;
end $$;
create function ledger.finish_operation(w uuid, op uuid, entity text, item uuid, before_row jsonb, after_row jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb := ledger.exact_json(after_row);
begin
  insert into ledger.audit_events(workspace_id,actor_id,operation_id,entity,entity_id,before_value,after_value)
    values(w,auth.uid(),op,entity,item,ledger.exact_json(before_row),r);
  update ledger.mutation_operations set result=r where workspace_id=w and actor_id=auth.uid() and operation_id=op;
  return r;
end $$;

create function public.ensure_personal_workspace() returns uuid
language plpgsql security definer set search_path = '' as $$
declare w uuid;
begin
  if not ledger.allowed() then raise exception 'Access denied' using errcode='42501'; end if;
  -- Identity lock serializes provisioning retries before the workspace exists.
  perform 1 from ledger.allowed_users where user_id=auth.uid() for update;
  select id into w from ledger.workspaces where kind='personal' and owner_user_id=auth.uid();
  if w is not null then return w; end if;
  insert into ledger.profiles(user_id,display_name) values(auth.uid(),'Member') on conflict do nothing;
  insert into ledger.workspaces(kind,owner_user_id,name) values('personal',auth.uid(),'Personal') returning id into w;
  insert into ledger.workspace_members(workspace_id,user_id,role) values(w,auth.uid(),'owner');
  insert into ledger.categories(workspace_id,name,kind,is_system) values(w,'Uncategorized','expense',true);
  return w;
end $$;

create function public.create_shared_workspace() returns uuid
language plpgsql security definer set search_path = '' as $$
declare w uuid;
begin
  perform public.ensure_personal_workspace();
  -- Singleton uniqueness also arbitrates two creators. Never reveal the other owner's ID.
  select id into w from ledger.workspaces where kind='shared' and owner_user_id=auth.uid();
  if w is not null then return w; end if;
  insert into ledger.workspaces(kind,owner_user_id,name) values('shared',auth.uid(),'Household') returning id into w;
  insert into ledger.workspace_members(workspace_id,user_id,role) values(w,auth.uid(),'owner');
  insert into ledger.categories(workspace_id,name,kind,is_system) values(w,'Uncategorized','expense',true);
  return w;
end $$;

create function public.invite_member(w uuid, recipient uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare i uuid;
begin
  perform ledger.assert_access(w);
  if not exists(select 1 from ledger.workspaces where id=w and kind='shared' and owner_user_id=auth.uid())
    or recipient=auth.uid() or not exists(select 1 from ledger.allowed_users a join auth.users u on u.id=a.user_id
      where a.user_id=recipient and u.email_confirmed_at is not null)
    or exists(select 1 from ledger.workspace_members where workspace_id=w and user_id=recipient)
    or (select count(*) from ledger.workspace_members where workspace_id=w)>=2 then
    raise exception 'Invitation unavailable' using errcode='42501';
  end if;
  select id into i from ledger.workspace_invites where workspace_id=w and recipient_id=recipient
    and accepted_at is null and revoked_at is null and expires_at>now() order by expires_at desc limit 1;
  if i is not null then return i; end if;
  insert into ledger.workspace_invites(workspace_id,recipient_id,invited_by) values(w,recipient,auth.uid()) returning id into i;
  return i;
end $$;

create function public.accept_invite(invitation uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare i ledger.workspace_invites;
begin
  if not ledger.allowed() then raise exception 'Access denied' using errcode='42501'; end if;
  select * into i from ledger.workspace_invites where id=invitation and recipient_id=auth.uid();
  if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  perform 1 from ledger.workspaces where id=i.workspace_id for update;
  select * into i from ledger.workspace_invites where id=invitation for update;
  if i.accepted_at is not null or i.revoked_at is not null or i.expires_at<=now()
    or (select count(*) from ledger.workspace_members where workspace_id=i.workspace_id)>=2 then
    raise exception 'Invitation unavailable' using errcode='42501';
  end if;
  perform public.ensure_personal_workspace();
  insert into ledger.workspace_members(workspace_id,user_id,role) values(i.workspace_id,auth.uid(),'member');
  update ledger.workspace_invites set accepted_at=now() where id=i.id;
  return i.workspace_id;
end $$;

create function ledger.balance(w uuid, account uuid, d date) returns numeric
language sql stable set search_path = '' as $$
  select coalesce((select opening_balance from ledger.accounts where workspace_id=w and id=account and opening_date<=d),0)::numeric
    + coalesce((select sum(p.amount) from ledger.account_postings p join ledger.transactions t on t.id=p.transaction_id
      where p.workspace_id=w and p.account_id=account and t.voided_at is null and t.economic_date<=d),0)
$$;
create function ledger.reserved(w uuid, account uuid, goal uuid default null) returns numeric
language sql stable set search_path = '' as $$
  select coalesce(sum(case when direction='reserve' then amount else -amount end),0)
    from ledger.goal_contributions where workspace_id=w and account_id=account and (goal is null or goal_id=goal)
$$;

-- Four small master-data shapes share the same operation/version/audit envelope.
create function public.save_financial_record(w uuid, op uuid, entity text, p jsonb, expected_version integer default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; b jsonb; item uuid; a ledger.accounts; c ledger.categories; g ledger.savings_goals; v integer; outstanding numeric;
begin
  r := ledger.begin_operation(w,op,jsonb_build_object('action','save_record','entity',entity,'data',p,'version',expected_version));
  if r is not null then return r; end if;
  item := coalesce((p->>'id')::uuid,gen_random_uuid());
  if entity not in ('account','category','budget','goal') then raise exception 'Unknown entity' using errcode='22023'; end if;
  if expected_version is null or expected_version<0 then raise exception 'Version required' using errcode='22023'; end if;
  if entity='account' then
    select * into a from ledger.accounts where workspace_id=w and id=item;
    if coalesce(a.version,0)<>expected_version then raise exception 'Version conflict' using errcode='40001'; end if;
    b := to_jsonb(a);
    if a.id is not null and exists(select 1 from ledger.account_postings where account_id=item)
      and (a.opening_balance<>ledger.money(p->'opening_balance',true,true) or a.opening_date<>(p->>'opening_date')::date) then
      raise exception 'Used opening is immutable' using errcode='23514'; end if;
    if (p->>'opening_date')::date>(now() at time zone 'Asia/Jakarta')::date then raise exception 'Future opening' using errcode='23514'; end if;
    insert into ledger.accounts(id,workspace_id,name,kind,opening_date,opening_balance,archived_at)
      values(item,w,p->>'name',p->>'kind',(p->>'opening_date')::date,ledger.money(p->'opening_balance',true,true),
        case when (p->>'archived')::boolean then now() end)
      on conflict(id) do update set name=excluded.name,kind=excluded.kind,opening_date=excluded.opening_date,
        opening_balance=excluded.opening_balance,archived_at=excluded.archived_at,version=ledger.accounts.version+1
      where ledger.accounts.workspace_id=w returning to_jsonb(ledger.accounts.*) into r;
  elsif entity='category' then
    select * into c from ledger.categories where workspace_id=w and id=item;
    if coalesce(c.version,0)<>expected_version then raise exception 'Version conflict' using errcode='40001'; end if;
    b := to_jsonb(c);
    if c.id is not null and c.kind<>p->>'kind' then raise exception 'Category kind is immutable' using errcode='23514'; end if;
    insert into ledger.categories(id,workspace_id,name,kind,archived_at) values(item,w,p->>'name',p->>'kind',case when (p->>'archived')::boolean then now() end)
      on conflict(id) do update set name=excluded.name,archived_at=excluded.archived_at,version=ledger.categories.version+1
      where ledger.categories.workspace_id=w returning to_jsonb(ledger.categories.*) into r;
  elsif entity='budget' then
    select to_jsonb(x),x.version into b,v from ledger.monthly_budgets x where workspace_id=w and id=item;
    if coalesce(v,0)<>expected_version then raise exception 'Version conflict' using errcode='40001'; end if;
    if not exists(select 1 from ledger.categories where workspace_id=w and id=(p->>'category_id')::uuid and kind='expense' and archived_at is null) then
      raise exception 'Invalid budget category' using errcode='23514'; end if;
    insert into ledger.monthly_budgets(id,workspace_id,category_id,month,amount)
      values(item,w,(p->>'category_id')::uuid,(p->>'month')::date,ledger.money(p->'amount',false,true))
      on conflict(id) do update set category_id=excluded.category_id,month=excluded.month,amount=excluded.amount,version=ledger.monthly_budgets.version+1
      where ledger.monthly_budgets.workspace_id=w returning to_jsonb(ledger.monthly_budgets.*) into r;
  else
    select * into g from ledger.savings_goals where workspace_id=w and id=item;
    if coalesce(g.version,0)<>expected_version then raise exception 'Version conflict' using errcode='40001'; end if;
    b := to_jsonb(g);
    select coalesce(sum(case when direction='reserve' then amount else -amount end),0) into outstanding
      from ledger.goal_contributions where workspace_id=w and goal_id=item;
    if (p->>'archived')::boolean and outstanding<>0 then
      raise exception 'Release reservations before archive' using errcode='23514'; end if;
    insert into ledger.savings_goals(id,workspace_id,name,target_amount,deadline,archived_at)
      values(item,w,p->>'name',ledger.money(p->'target_amount'),(p->>'deadline')::date,case when (p->>'archived')::boolean then now() end)
      on conflict(id) do update set name=excluded.name,target_amount=excluded.target_amount,deadline=excluded.deadline,
        archived_at=excluded.archived_at,version=ledger.savings_goals.version+1
      where ledger.savings_goals.workspace_id=w returning to_jsonb(ledger.savings_goals.*) into r;
  end if;
  if r is null then raise exception 'Record unavailable' using errcode='42501'; end if;
  return ledger.finish_operation(w,op,entity,item,b,r);
end $$;

create function public.save_transaction(w uuid, op uuid, p jsonb, expected_version integer default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; b jsonb; item uuid := coalesce((p->>'id')::uuid,gen_random_uuid());
  k text := coalesce(p->>'kind','expense'); n bigint; d date := coalesce((p->>'economic_date')::date,(now() at time zone 'Asia/Jakarta')::date);
  a uuid := (p->>'account_id')::uuid; dest uuid := (p->>'destination_account_id')::uuid;
  cat uuid := (p->>'category_id')::uuid; original uuid := (p->>'original_expense_id')::uuid;
  payer uuid := (p->>'paid_by')::uuid; old_row ledger.transactions; expense ledger.transactions; refund_sum numeric;
begin
  r := ledger.begin_operation(w,op,jsonb_build_object('action','save_transaction','data',p,'version',expected_version));
  if r is not null then return r; end if;
  n := ledger.money(p->'amount',k='correction');
  select * into old_row from ledger.transactions where workspace_id=w and id=item;
  if expected_version is null or coalesce(old_row.version,0)<>expected_version then raise exception 'Version conflict' using errcode='40001'; end if;
  if old_row.voided_at is not null or (old_row.id is not null and (old_row.kind<>k or old_row.original_expense_id is distinct from original)) then
    raise exception 'Void and re-enter this event' using errcode='23514'; end if;
  if old_row.id is not null then
    b := to_jsonb(old_row) || jsonb_build_object('postings',
      (select jsonb_agg(to_jsonb(x)) from ledger.account_postings x where workspace_id=w and transaction_id=item));
  end if;
  if d>(now() at time zone 'Asia/Jakarta')::date then raise exception 'Future transaction' using errcode='23514'; end if;
  if not exists(select 1 from ledger.accounts where workspace_id=w and id=a and archived_at is null and opening_date<=d) then
    raise exception 'Account unavailable for date' using errcode='23514'; end if;
  if payer is not null and (k<>'expense' or not exists(select 1 from ledger.workspaces where id=w and kind='shared')
    or not exists(select 1 from ledger.workspace_members where workspace_id=w and user_id=payer and revoked_at is null)) then
    raise exception 'Invalid payer' using errcode='23514'; end if;
  if k in ('income','expense') then
    if cat is null and k='expense' then select id into cat from ledger.categories where workspace_id=w and is_system; end if;
    if not exists(select 1 from ledger.categories where workspace_id=w and id=cat and kind=k and archived_at is null) then
      raise exception 'Category unavailable' using errcode='23514'; end if;
  elsif cat is not null then raise exception 'Category not allowed' using errcode='23514'; end if;
  if k='transfer' then
    if a=dest or not exists(select 1 from ledger.accounts where workspace_id=w and id=dest and archived_at is null and opening_date<=d) then
      raise exception 'Invalid transfer destination' using errcode='23514'; end if;
  elsif dest is not null then raise exception 'Destination not allowed' using errcode='23514'; end if;
  if k='refund' then
    select * into expense from ledger.transactions where workspace_id=w and id=original and kind='expense' and voided_at is null;
    select coalesce(sum(amount),0) into refund_sum from ledger.transactions where workspace_id=w and original_expense_id=original and voided_at is null and id<>item;
    if expense.id is null or d<expense.economic_date or refund_sum+n>expense.amount then
      raise exception 'Invalid refund' using errcode='23514'; end if;
  end if;
  if k='expense' and exists(select 1 from ledger.transactions where original_expense_id=item and voided_at is null
    group by original_expense_id having sum(amount)>n or min(economic_date)<d) then
    raise exception 'Existing refunds conflict' using errcode='23514'; end if;
  insert into ledger.transactions(id,workspace_id,kind,amount,economic_date,category_id,original_expense_id,description,paid_by,created_by)
    values(item,w,k,n,d,cat,original,coalesce(p->>'description',''),payer,auth.uid())
    on conflict(id) do update set amount=excluded.amount,economic_date=excluded.economic_date,category_id=excluded.category_id,
      description=excluded.description,paid_by=excluded.paid_by,version=ledger.transactions.version+1
    where ledger.transactions.workspace_id=w returning to_jsonb(ledger.transactions.*) into r;
  if r is null then raise exception 'Record unavailable' using errcode='42501'; end if;
  delete from ledger.account_postings where workspace_id=w and transaction_id=item;
  insert into ledger.account_postings(workspace_id,transaction_id,account_id,amount)
    values(w,item,a,case when k in ('expense','transfer') then -n else n end);
  if k='transfer' then insert into ledger.account_postings values(w,item,dest,n); end if;
  return ledger.finish_operation(w,op,'transaction',item,b,r || jsonb_build_object('account_id',a,'destination_account_id',dest));
end $$;

create function public.void_transaction(w uuid, op uuid, item uuid, expected_version integer, reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; b jsonb; t ledger.transactions;
begin
  r := ledger.begin_operation(w,op,jsonb_build_object('action','void','id',item,'version',expected_version,'reason',reason));
  if r is not null then return r; end if;
  select * into t from ledger.transactions where workspace_id=w and id=item;
  if t.id is null then raise exception 'Record unavailable' using errcode='42501'; end if;
  if expected_version is null or t.version<>expected_version or t.voided_at is not null then raise exception 'Version conflict' using errcode='40001'; end if;
  if reason is null or length(btrim(reason))=0 or length(reason)>2000 then raise exception 'Reason required' using errcode='22023'; end if;
  if exists(select 1 from ledger.transactions where workspace_id=w and original_expense_id=item and voided_at is null) then
    raise exception 'Void refunds first' using errcode='23514'; end if;
  b := to_jsonb(t) || jsonb_build_object('postings',
    (select jsonb_agg(to_jsonb(x)) from ledger.account_postings x where workspace_id=w and transaction_id=item));
  update ledger.transactions set voided_at=now(),voided_by=auth.uid(),void_reason=reason,version=version+1
    where workspace_id=w and id=item returning to_jsonb(ledger.transactions.*) into r;
  return ledger.finish_operation(w,op,'transaction',item,b,r);
end $$;

create function public.allocate_goal(w uuid, op uuid, goal uuid, account uuid, direction text, amount text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; n bigint; item uuid;
begin
  r := ledger.begin_operation(w,op,jsonb_build_object('action','allocate','goal',goal,'account',account,'direction',direction,'amount',amount));
  if r is not null then return r; end if;
  n := ledger.money(to_jsonb(amount));
  if not exists(select 1 from ledger.accounts where workspace_id=w and id=account)
    or not exists(select 1 from ledger.savings_goals where workspace_id=w and id=goal) then
    raise exception 'Reservation unavailable' using errcode='23514'; end if;
  if direction='reserve' then
    if exists(select 1 from ledger.accounts where id=account and archived_at is not null)
      or exists(select 1 from ledger.savings_goals where id=goal and archived_at is not null)
      or n>greatest(ledger.balance(w,account,(now() at time zone 'Asia/Jakarta')::date)-ledger.reserved(w,account),0) then
      raise exception 'Insufficient unreserved balance' using errcode='23514'; end if;
  elsif direction='release' then
    if n>ledger.reserved(w,account,goal) then raise exception 'Release exceeds reservation' using errcode='23514'; end if;
  else raise exception 'Invalid allocation direction' using errcode='22023'; end if;
  insert into ledger.goal_contributions(workspace_id,goal_id,account_id,direction,amount,created_by)
    values(w,goal,account,direction,n,auth.uid()) returning id,to_jsonb(ledger.goal_contributions.*) into item,r;
  return ledger.finish_operation(w,op,'goal_contribution',item,null,r);
end $$;

create function public.archive_goal(w uuid, op uuid, goal uuid, expected_version integer, release_reservations boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; b jsonb; g ledger.savings_goals; pool record; released jsonb := '[]'; row_value jsonb;
begin
  r := ledger.begin_operation(w,op,jsonb_build_object('action','archive_goal','goal',goal,'version',expected_version,'release_reservations',release_reservations));
  if r is not null then return r; end if;
  select * into g from ledger.savings_goals where workspace_id=w and id=goal;
  if g.id is null then raise exception 'Goal unavailable' using errcode='42501'; end if;
  if expected_version is null or g.version<>expected_version or g.archived_at is not null then raise exception 'Version conflict' using errcode='40001'; end if;
  b := to_jsonb(g);
  for pool in select account_id,sum(case when direction='reserve' then amount else -amount end) amount
    from ledger.goal_contributions where workspace_id=w and goal_id=goal group by account_id
    having sum(case when direction='reserve' then amount else -amount end)>0 loop
    if release_reservations is distinct from true then raise exception 'Explicit release required' using errcode='23514'; end if;
    -- Each pool can exceed the individual amount cap through repeated reserves.
    while pool.amount>0 loop
      insert into ledger.goal_contributions(workspace_id,goal_id,account_id,direction,amount,created_by)
        values(w,goal,pool.account_id,'release',least(pool.amount,1000000000000)::bigint,auth.uid())
        returning to_jsonb(ledger.goal_contributions.*) into row_value;
      released := released || jsonb_build_array(row_value);
      pool.amount := pool.amount-least(pool.amount,1000000000000);
    end loop;
  end loop;
  update ledger.savings_goals set archived_at=now(),version=version+1 where workspace_id=w and id=goal
    returning to_jsonb(ledger.savings_goals.*) into r;
  return ledger.finish_operation(w,op,'goal',goal,b,r || jsonb_build_object('released',released));
end $$;

create function public.read_workspace(w uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not ledger.is_member(w) then raise exception 'Access denied' using errcode='42501'; end if;
  r := jsonb_build_object(
    'workspace',(select to_jsonb(x) from ledger.workspaces x where id=w),
    'members',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from ledger.workspace_members x where workspace_id=w),
    'accounts',(select coalesce(jsonb_agg(to_jsonb(x) || jsonb_build_object(
      'balance',ledger.balance(w,x.id,(now() at time zone 'Asia/Jakarta')::date),
      'reserved',ledger.reserved(w,x.id),
      'shortfall',greatest(ledger.reserved(w,x.id)-greatest(ledger.balance(w,x.id,(now() at time zone 'Asia/Jakarta')::date),0),0))),'[]')
      from ledger.accounts x where workspace_id=w),
    'categories',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from ledger.categories x where workspace_id=w),
    'budgets',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from ledger.monthly_budgets x where workspace_id=w),
    'goals',(select coalesce(jsonb_agg(to_jsonb(x) || jsonb_build_object('reserved',
      (select coalesce(sum(case when direction='reserve' then amount else -amount end),0) from ledger.goal_contributions where workspace_id=w and goal_id=x.id))),'[]')
      from ledger.savings_goals x where workspace_id=w));
  return ledger.exact_json(r);
end $$;

create function public.read_transactions(w uuid, from_date date, until_date date, after_date date default null, after_id uuid default null, page_size integer default 100) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not ledger.is_member(w) then raise exception 'Access denied' using errcode='42501'; end if;
  if from_date is null or until_date is null or from_date>=until_date or page_size is null or page_size not between 1 and 200
    or ((after_date is null)<>(after_id is null)) then raise exception 'Invalid page' using errcode='22023'; end if;
  return ledger.exact_json((select coalesce(jsonb_agg(to_jsonb(x) order by x.economic_date,x.id),'[]') from
    (select t.*,coalesce(t.category_id,e.category_id) effective_category_id,
      (select jsonb_agg(to_jsonb(p)) from ledger.account_postings p where p.workspace_id=w and p.transaction_id=t.id) postings
      from ledger.transactions t left join ledger.transactions e on e.workspace_id=w and e.id=t.original_expense_id
      where t.workspace_id=w and t.economic_date>=from_date and t.economic_date<until_date
        and (after_date is null or (t.economic_date,t.id)>(after_date,after_id))
      order by t.economic_date,t.id limit page_size) x));
end $$;

create function public.monthly_report(w uuid, month_start date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare i numeric; e numeric; r numeric; corrections numeric; cash numeric; reservations numeric; first_cash numeric; openings numeric;
  today date := (now() at time zone 'Asia/Jakarta')::date; until_date date; as_of date; breakdown jsonb;
begin
  if not ledger.is_member(w) then raise exception 'Access denied' using errcode='42501'; end if;
  if month_start is null or extract(day from month_start)<>1 then raise exception 'Month start required' using errcode='22023'; end if;
  until_date := (month_start+interval '1 month')::date; as_of := least(until_date-1,today);
  select coalesce(sum(amount) filter(where kind='income'),0),coalesce(sum(amount) filter(where kind='expense'),0),
    coalesce(sum(amount) filter(where kind='refund'),0),coalesce(sum(amount) filter(where kind='correction'),0)
    into i,e,r,corrections from ledger.transactions where workspace_id=w and voided_at is null and economic_date>=month_start and economic_date<until_date;
  select sum(ledger.balance(w,id,as_of)),sum(ledger.balance(w,id,month_start-1)),
    coalesce(sum(opening_balance) filter(where opening_date>=month_start and opening_date<until_date),0)
    into cash,first_cash,openings from ledger.accounts where workspace_id=w;
  select coalesce(sum(case when direction='reserve' then amount else -amount end),0) into reservations from ledger.goal_contributions where workspace_id=w;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into breakdown from (
    select c.id category_id,c.name,b.amount budget,
      coalesce(sum(case when t.kind='expense' then t.amount else -t.amount end),0) spent,
      b.amount-coalesce(sum(case when t.kind='expense' then t.amount else -t.amount end),0) remaining
    from ledger.categories c left join ledger.monthly_budgets b on b.workspace_id=w and b.category_id=c.id and b.month=month_start
    left join (select t.*,coalesce(t.category_id,original.category_id) effective_category from ledger.transactions t
      left join ledger.transactions original on original.workspace_id=w and original.id=t.original_expense_id
      where t.workspace_id=w and t.voided_at is null and t.kind in ('expense','refund') and t.economic_date>=month_start and t.economic_date<until_date) t
      on t.effective_category=c.id where c.workspace_id=w and c.kind='expense' group by c.id,c.name,b.amount) x;
  return ledger.exact_json(jsonb_build_object('income',i,'gross_expenses',e,'refunds',r,'net_spending',e-r,'operating_net',i-e+r,
    'corrections',corrections,'starting_cash',first_cash,'openings',openings,
    'closing_cash',case when month_start>today then null else cash end,
    'as_of',case when month_start>today then null else as_of end,'current_reservations',reservations,
    'categories',breakdown));
end $$;

create function public.read_audit(w uuid, after_id bigint default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not ledger.is_member(w) then raise exception 'Access denied' using errcode='42501'; end if;
  return ledger.exact_json((select coalesce(jsonb_agg(to_jsonb(x) order by x.id),'[]') from
    (select * from ledger.audit_events where workspace_id=w and id>after_id order by id limit 100) x));
end $$;

revoke all on all functions in schema ledger from public,anon,authenticated;
grant execute on function ledger.allowed(),ledger.is_member(uuid) to authenticated;
-- Explicit signatures: no blanket grants to unrelated public/extension functions.
revoke all on function public.ensure_personal_workspace(),public.create_shared_workspace(),public.invite_member(uuid,uuid),public.accept_invite(uuid),
  public.save_financial_record(uuid,uuid,text,jsonb,integer),public.save_transaction(uuid,uuid,jsonb,integer),public.void_transaction(uuid,uuid,uuid,integer,text),
  public.allocate_goal(uuid,uuid,uuid,uuid,text,text),public.read_workspace(uuid),public.read_transactions(uuid,date,date,date,uuid,integer),
  public.monthly_report(uuid,date),public.read_audit(uuid,bigint),public.archive_goal(uuid,uuid,uuid,integer,boolean) from public,anon;
grant execute on function public.ensure_personal_workspace(),public.create_shared_workspace(),public.invite_member(uuid,uuid),public.accept_invite(uuid),
  public.save_financial_record(uuid,uuid,text,jsonb,integer),public.save_transaction(uuid,uuid,jsonb,integer),public.void_transaction(uuid,uuid,uuid,integer,text),
  public.allocate_goal(uuid,uuid,uuid,uuid,text,text),public.read_workspace(uuid),public.read_transactions(uuid,date,date,date,uuid,integer),
  public.monthly_report(uuid,date),public.read_audit(uuid,bigint),public.archive_goal(uuid,uuid,uuid,integer,boolean) to authenticated;

commit;
