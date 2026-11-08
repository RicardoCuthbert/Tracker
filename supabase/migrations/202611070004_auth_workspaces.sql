begin;

-- Verified signup now grants personal access. The legacy allowlist stays private.
create or replace function ledger.allowed() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
$$;

drop index ledger.single_household;
create unique index shared_owner on ledger.workspaces(owner_user_id) where kind='shared';
alter table ledger.workspaces add column member_limit integer not null default 2 check(member_limit>=1);
alter table ledger.workspaces add constraint personal_capacity check(kind<>'personal' or member_limit=1) not valid;
update ledger.workspaces set member_limit=1 where kind='personal';
alter table ledger.workspaces validate constraint personal_capacity;

create or replace function ledger.check_membership() returns trigger
language plpgsql set search_path = '' as $$
declare w ledger.workspaces;
begin
  select * into w from ledger.workspaces where id=new.workspace_id for update;
  -- Serialize different-household acceptance for the same identity too.
  perform 1 from auth.users where id=new.user_id for update;
  if (w.kind='personal' and (new.user_id<>w.owner_user_id or new.role<>'owner'))
    or ((new.role='owner')<>(new.user_id=w.owner_user_id))
    or (new.revoked_at is null and not exists(select 1 from auth.users where id=new.user_id and email_confirmed_at is not null))
    or (new.revoked_at is null and (select count(*) from ledger.workspace_members
      where workspace_id=w.id and revoked_at is null and user_id<>new.user_id)>=w.member_limit)
    or (new.revoked_at is null and w.kind='shared' and exists(
      select 1 from ledger.workspace_members m join ledger.workspaces s on s.id=m.workspace_id
      where m.user_id=new.user_id and m.revoked_at is null and s.kind='shared' and s.id<>w.id)) then
    raise exception 'Invalid workspace membership' using errcode='23514';
  end if;
  return new;
end $$;

create function ledger.provision_personal(person uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare w uuid;
begin
  perform 1 from auth.users where id=person and email_confirmed_at is not null for update;
  if not found then raise exception 'Access denied' using errcode='42501'; end if;
  select id into w from ledger.workspaces where kind='personal' and owner_user_id=person;
  if w is not null then return w; end if;
  insert into ledger.profiles(user_id,display_name) values(person,'Member') on conflict do nothing;
  insert into ledger.workspaces(kind,owner_user_id,name,member_limit) values('personal',person,'Personal',1) returning id into w;
  insert into ledger.workspace_members(workspace_id,user_id,role) values(w,person,'owner');
  insert into ledger.categories(workspace_id,name,kind,is_system) values(w,'Uncategorized','expense',true);
  return w;
end $$;
create or replace function public.ensure_personal_workspace() returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not ledger.allowed() then raise exception 'Access denied' using errcode='42501'; end if;
  return ledger.provision_personal(auth.uid());
end $$;
create function ledger.on_verified_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is not null then perform ledger.provision_personal(new.id); end if;
  return new;
end $$;
create trigger provision_verified_user after insert or update of email_confirmed_at on auth.users
  for each row execute function ledger.on_verified_user();
do $$ declare person uuid; begin
  for person in select id from auth.users where email_confirmed_at is not null loop
    perform ledger.provision_personal(person);
  end loop;
end $$;

create or replace function public.create_shared_workspace() returns uuid
language plpgsql security definer set search_path = '' as $$
declare w uuid;
begin
  perform public.ensure_personal_workspace();
  select s.id into w from ledger.workspaces s join ledger.workspace_members m on m.workspace_id=s.id
    where s.kind='shared' and m.user_id=auth.uid() and m.revoked_at is null;
  if w is not null then
    if exists(select 1 from ledger.workspaces where id=w and owner_user_id=auth.uid()) then return w; end if;
    raise exception 'Shared workspace unavailable' using errcode='42501';
  end if;
  -- A revoked owner cannot create a replacement before lifecycle policy is approved.
  if exists(select 1 from ledger.workspaces where kind='shared' and owner_user_id=auth.uid()) then
    raise exception 'Shared workspace unavailable' using errcode='42501';
  end if;
  insert into ledger.workspaces(kind,owner_user_id,name) values('shared',auth.uid(),'Household') returning id into w;
  insert into ledger.workspace_members(workspace_id,user_id,role) values(w,auth.uid(),'owner');
  insert into ledger.categories(workspace_id,name,kind,is_system) values(w,'Uncategorized','expense',true);
  return w;
end $$;

create or replace function public.invite_member(w uuid, recipient uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare i uuid; capacity integer;
begin
  perform ledger.assert_access(w);
  select member_limit into capacity from ledger.workspaces where id=w and kind='shared' and owner_user_id=auth.uid();
  if capacity is null or recipient is null or recipient=auth.uid()
    or not exists(select 1 from auth.users where id=recipient and email_confirmed_at is not null)
    or exists(select 1 from ledger.workspace_members where workspace_id=w and user_id=recipient)
    or exists(select 1 from ledger.workspace_members m join ledger.workspaces s on s.id=m.workspace_id
      where m.user_id=recipient and m.revoked_at is null and s.kind='shared') then
    raise exception 'Invitation unavailable' using errcode='42501';
  end if;
  select id into i from ledger.workspace_invites where workspace_id=w and recipient_id=recipient
    and accepted_at is null and revoked_at is null and expires_at>now() order by expires_at desc limit 1;
  if i is not null then return i; end if;
  if (select count(*) from ledger.workspace_members where workspace_id=w and revoked_at is null)
    +(select count(*) from ledger.workspace_invites where workspace_id=w and accepted_at is null
      and revoked_at is null and expires_at>now())>=capacity then
    raise exception 'Invitation unavailable' using errcode='42501';
  end if;
  insert into ledger.workspace_invites(workspace_id,recipient_id,invited_by) values(w,recipient,auth.uid()) returning id into i;
  return i;
end $$;

create or replace function public.accept_invite(invitation uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare i ledger.workspace_invites; capacity integer;
begin
  if not ledger.allowed() then raise exception 'Access denied' using errcode='42501'; end if;
  select * into i from ledger.workspace_invites where id=invitation and recipient_id=auth.uid();
  if not found then raise exception 'Invitation unavailable' using errcode='42501'; end if;
  select member_limit into capacity from ledger.workspaces where id=i.workspace_id and kind='shared' for update;
  select * into i from ledger.workspace_invites where id=invitation for update;
  perform public.ensure_personal_workspace();
  if capacity is null or i.accepted_at is not null or i.revoked_at is not null or i.expires_at<=now()
    or not exists(select 1 from ledger.workspace_members where workspace_id=i.workspace_id
      and user_id=i.invited_by and role='owner' and revoked_at is null)
    or not exists(select 1 from auth.users where id=i.invited_by and email_confirmed_at is not null)
    or exists(select 1 from ledger.workspace_members m join ledger.workspaces s on s.id=m.workspace_id
      where m.user_id=auth.uid() and m.revoked_at is null and s.kind='shared')
    or (select count(*) from ledger.workspace_members where workspace_id=i.workspace_id and revoked_at is null)>=capacity then
    raise exception 'Invitation unavailable' using errcode='42501';
  end if;
  insert into ledger.workspace_members(workspace_id,user_id,role) values(i.workspace_id,auth.uid(),'member');
  update ledger.workspace_invites set accepted_at=now() where id=i.id;
  return i.workspace_id;
end $$;

create function public.list_workspace_invitations() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not ledger.allowed() then raise exception 'Access denied' using errcode='42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'workspace_id',w.id,
    'name',w.name,'recipient_id',i.recipient_id,'expires_at',i.expires_at) order by i.expires_at),'[]'::jsonb)
    from ledger.workspace_invites i join ledger.workspaces w on w.id=i.workspace_id
    where i.accepted_at is null and i.revoked_at is null and i.expires_at>now()
      and (i.recipient_id=auth.uid() or (w.owner_user_id=auth.uid() and ledger.is_member(w.id)))
      and exists(select 1 from ledger.workspace_members m join auth.users u on u.id=m.user_id
        where m.workspace_id=w.id and m.user_id=i.invited_by and m.role='owner'
          and m.revoked_at is null and u.email_confirmed_at is not null));
end $$;
revoke all on function public.list_workspace_invitations() from public,anon;
grant execute on function public.list_workspace_invitations() to authenticated;
revoke all on function ledger.provision_personal(uuid),ledger.on_verified_user() from public,anon,authenticated;

commit;
