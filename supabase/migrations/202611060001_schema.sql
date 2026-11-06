begin;

-- Keep ledger off the Data API's exposed-schema list. Public contains RPCs only.
create schema ledger;
revoke all on schema ledger from public;
grant usage on schema ledger to authenticated;

create table ledger.allowed_users (
  user_id uuid primary key references auth.users(id) on delete restrict
);
create table ledger.profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (length(btrim(display_name)) between 1 and 100)
);
create table ledger.workspaces (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('personal','shared')),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 100),
  currency text not null default 'IDR' check (currency = 'IDR'),
  timezone text not null default 'Asia/Jakarta' check (timezone = 'Asia/Jakarta'),
  created_at timestamptz not null default now()
);
create unique index personal_owner on ledger.workspaces(owner_user_id) where kind = 'personal';
create unique index single_household on ledger.workspaces(kind) where kind = 'shared';
create table ledger.workspace_members (
  workspace_id uuid not null references ledger.workspaces(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (workspace_id, user_id)
);
create index active_memberships on ledger.workspace_members(user_id, workspace_id) where revoked_at is null;
create table ledger.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references ledger.workspaces(id) on delete restrict,
  recipient_id uuid not null references auth.users(id) on delete restrict,
  invited_by uuid not null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  foreign key (workspace_id, invited_by) references ledger.workspace_members(workspace_id,user_id)
);
create index invite_recipient on ledger.workspace_invites(recipient_id,workspace_id);

create table ledger.accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references ledger.workspaces(id),
  name text not null check (length(btrim(name)) between 1 and 100),
  kind text not null check (kind in ('cash','bank','e-wallet','savings')),
  opening_date date not null,
  opening_balance bigint not null check (opening_balance between -1000000000000 and 1000000000000),
  archived_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (workspace_id,id)
);
create table ledger.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references ledger.workspaces(id),
  name text not null check (length(btrim(name)) between 1 and 100),
  kind text not null check (kind in ('income','expense')),
  is_system boolean not null default false,
  archived_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (workspace_id,id),
  check (not is_system or (kind = 'expense' and name = 'Uncategorized' and archived_at is null))
);
create unique index uncategorized on ledger.categories(workspace_id) where is_system;
create table ledger.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references ledger.workspaces(id),
  kind text not null default 'expense' check (kind in ('income','expense','transfer','refund','correction')),
  amount bigint not null,
  economic_date date not null default (now() at time zone 'Asia/Jakarta')::date,
  category_id uuid,
  original_expense_id uuid,
  description text not null default '' check (length(description) <= 2000),
  paid_by uuid,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  unique (workspace_id,id),
  foreign key (workspace_id,category_id) references ledger.categories(workspace_id,id),
  foreign key (workspace_id,original_expense_id) references ledger.transactions(workspace_id,id),
  foreign key (workspace_id,created_by) references ledger.workspace_members(workspace_id,user_id),
  foreign key (workspace_id,paid_by) references ledger.workspace_members(workspace_id,user_id),
  foreign key (workspace_id,voided_by) references ledger.workspace_members(workspace_id,user_id),
  check ((kind = 'correction' and amount <> 0 and amount between -1000000000000 and 1000000000000 and length(btrim(description)) > 0)
    or (kind <> 'correction' and amount between 1 and 1000000000000)),
  check ((kind in ('income','expense') and category_id is not null) or (kind not in ('income','expense') and category_id is null)),
  check ((kind = 'refund') = (original_expense_id is not null)),
  check (original_expense_id is distinct from id),
  check ((voided_at is null and voided_by is null and void_reason is null)
    or (voided_at is not null and voided_by is not null and length(btrim(void_reason)) > 0))
);
create index transaction_period on ledger.transactions(workspace_id,economic_date,id);
create index transaction_refunds on ledger.transactions(workspace_id,original_expense_id);
create index transaction_category on ledger.transactions(workspace_id,category_id);
create table ledger.account_postings (
  workspace_id uuid not null,
  transaction_id uuid not null,
  account_id uuid not null,
  amount bigint not null check (amount <> 0 and amount between -1000000000000 and 1000000000000),
  primary key (transaction_id,account_id),
  foreign key (workspace_id,transaction_id) references ledger.transactions(workspace_id,id),
  foreign key (workspace_id,account_id) references ledger.accounts(workspace_id,id)
);
create index account_history on ledger.account_postings(workspace_id,account_id,transaction_id);
create table ledger.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  category_id uuid not null,
  month date not null check (extract(day from month) = 1),
  amount bigint not null check (amount between 0 and 1000000000000),
  version integer not null default 1 check (version > 0),
  unique (workspace_id,category_id,month),
  foreign key (workspace_id,category_id) references ledger.categories(workspace_id,id)
);
create table ledger.savings_goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references ledger.workspaces(id),
  name text not null check (length(btrim(name)) between 1 and 100),
  target_amount bigint not null check (target_amount between 1 and 1000000000000),
  deadline date,
  archived_at timestamptz,
  version integer not null default 1 check (version > 0),
  unique (workspace_id,id)
);
create table ledger.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  goal_id uuid not null,
  account_id uuid not null,
  direction text not null check (direction in ('reserve','release')),
  amount bigint not null check (amount between 1 and 1000000000000),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key (workspace_id,goal_id) references ledger.savings_goals(workspace_id,id),
  foreign key (workspace_id,account_id) references ledger.accounts(workspace_id,id),
  foreign key (workspace_id,created_by) references ledger.workspace_members(workspace_id,user_id)
);
create index reservation_pool on ledger.goal_contributions(workspace_id,account_id,goal_id);
create table ledger.mutation_operations (
  workspace_id uuid not null references ledger.workspaces(id),
  actor_id uuid not null,
  operation_id uuid not null,
  payload jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (workspace_id,actor_id,operation_id),
  foreign key (workspace_id,actor_id) references ledger.workspace_members(workspace_id,user_id)
);
create table ledger.audit_events (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  actor_id uuid not null,
  operation_id uuid not null,
  entity text not null,
  entity_id uuid not null,
  before_value jsonb,
  after_value jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (workspace_id,actor_id,operation_id) references ledger.mutation_operations(workspace_id,actor_id,operation_id)
);
create index audit_history on ledger.audit_events(workspace_id,entity,entity_id,created_at);

create function ledger.allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from ledger.allowed_users a join auth.users u on u.id=a.user_id
    where a.user_id=auth.uid() and u.email_confirmed_at is not null)
$$;
create function ledger.is_member(w uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select ledger.allowed() and exists (
    select 1 from ledger.workspace_members m join ledger.workspaces s on s.id=m.workspace_id
    where m.workspace_id=w and m.user_id=auth.uid() and m.revoked_at is null
    and (s.kind='shared' or s.owner_user_id=auth.uid()))
$$;

alter table ledger.allowed_users enable row level security;
alter table ledger.profiles enable row level security;
create policy own_profile on ledger.profiles for select to authenticated
  using (user_id=auth.uid() and ledger.allowed());
alter table ledger.workspaces enable row level security;
create policy member_read on ledger.workspaces for select to authenticated using (ledger.is_member(id));
alter table ledger.workspace_invites enable row level security;
create policy invite_read on ledger.workspace_invites for select to authenticated
  using (ledger.allowed() and (recipient_id=auth.uid() or exists
    (select 1 from ledger.workspaces w where w.id=workspace_id and w.owner_user_id=auth.uid())));

do $$ declare n text; begin
  foreach n in array array['workspace_members','accounts','categories','transactions','account_postings',
    'monthly_budgets','savings_goals','goal_contributions','mutation_operations','audit_events'] loop
    execute format('alter table ledger.%I enable row level security',n);
    execute format('create policy member_read on ledger.%I for select to authenticated using (ledger.is_member(workspace_id))',n);
  end loop;
end $$;
-- No direct INSERT/UPDATE/DELETE grants or policies. RPCs are the only write path.
revoke all on all tables in schema ledger from public,anon,authenticated;
grant select on all tables in schema ledger to authenticated;
revoke all on ledger.allowed_users from authenticated;
revoke all on all functions in schema ledger from public,anon,authenticated;
grant execute on function ledger.allowed(),ledger.is_member(uuid) to authenticated;
alter default privileges in schema ledger revoke execute on functions from public;

-- Administrative/migration errors must not commit malformed event postings either.
create function ledger.check_event() returns trigger
language plpgsql set search_path = '' as $$
declare t ledger.transactions; e ledger.transactions; n integer; s numeric; lo bigint; hi bigint; event_id uuid;
begin
  if tg_table_name='transactions' then event_id := coalesce(new.id,old.id);
  else event_id := coalesce(new.transaction_id,old.transaction_id); end if;
  select * into t from ledger.transactions where id=event_id;
  if not found then return null; end if;
  if t.economic_date>(now() at time zone 'Asia/Jakarta')::date
    or exists(select 1 from ledger.account_postings p join ledger.accounts a on a.id=p.account_id
      where p.transaction_id=t.id and a.opening_date>t.economic_date)
    or (t.kind in ('income','expense') and not exists(select 1 from ledger.categories c
      where c.id=t.category_id and c.workspace_id=t.workspace_id and c.kind=t.kind)) then
    raise exception 'Invalid event date or category' using errcode='23514';
  end if;
  if t.kind='refund' and t.voided_at is null then
    select * into e from ledger.transactions where id=t.original_expense_id and workspace_id=t.workspace_id;
    if e.kind<>'expense' or e.voided_at is not null or t.economic_date<e.economic_date
      or (select sum(amount) from ledger.transactions where original_expense_id=e.id and voided_at is null)>e.amount then
      raise exception 'Invalid refund relationship' using errcode='23514';
    end if;
  end if;
  if t.kind='expense' and exists(select 1 from ledger.transactions where original_expense_id=t.id and voided_at is null
    group by original_expense_id having sum(amount)>t.amount or min(economic_date)<t.economic_date or t.voided_at is not null) then
    raise exception 'Refunds conflict with expense' using errcode='23514';
  end if;
  select count(*),sum(amount),min(amount),max(amount) into n,s,lo,hi
    from ledger.account_postings where transaction_id=t.id;
  if (t.kind='transfer' and (n<>2 or s<>0 or lo<>-t.amount or hi<>t.amount))
    or (t.kind<>'transfer' and (n<>1 or s<>case when t.kind='expense' then -t.amount else t.amount end)) then
    raise exception 'Invalid account postings' using errcode='23514';
  end if;
  return null;
end $$;
create constraint trigger event_postings after insert or update on ledger.transactions
  deferrable initially deferred for each row execute function ledger.check_event();
create constraint trigger posting_event after insert or update or delete on ledger.account_postings
  deferrable initially deferred for each row execute function ledger.check_event();

create function ledger.check_membership() returns trigger
language plpgsql set search_path = '' as $$
declare w ledger.workspaces;
begin
  select * into w from ledger.workspaces where id=new.workspace_id for update;
  if (w.kind='personal' and (new.user_id<>w.owner_user_id or new.role<>'owner'))
    or ((new.role='owner') <> (new.user_id=w.owner_user_id))
    or (new.revoked_at is null and not exists(select 1 from ledger.allowed_users where user_id=new.user_id))
    or (new.revoked_at is null and (select count(*) from ledger.workspace_members where workspace_id=w.id
        and revoked_at is null and user_id<>new.user_id)>=case when w.kind='personal' then 1 else 2 end) then
    raise exception 'Invalid workspace membership' using errcode='23514';
  end if;
  return new;
end $$;
create trigger membership_integrity before insert or update on ledger.workspace_members
  for each row execute function ledger.check_membership();

revoke all on all functions in schema ledger from public,anon;
commit;
