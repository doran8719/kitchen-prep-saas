-- 001_businesses.sql
-- Multi-business support: each kitchen is a business with members, invites and
-- one store connection. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again.

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Which settings file the calculator uses (src/lib/prep/presets.ts).
  preset text not null default 'standard',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);
-- One business per login for now.
create unique index if not exists business_members_one_per_user on public.business_members(user_id);

create table if not exists public.business_invites (
  business_id uuid not null references public.businesses(id) on delete cascade,
  email text not null,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (business_id, email)
);

-- The API key and secret are encrypted by the server (STORE_KEY_SECRET) before
-- they're saved, so the database never holds them in plain text.
create table if not exists public.store_connections (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  platform text not null default 'woocommerce',
  store_url text not null,
  key_enc text not null,
  secret_enc text not null,
  menu_category text,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now()
);

-- ---------- helpers (run as the table owner, so policies don't loop) ----------

create or replace function public.my_business_ids() returns setof uuid
language sql security definer stable set search_path = public as $$
  select business_id from business_members where user_id = auth.uid()
$$;

create or replace function public.my_owned_business_ids() returns setof uuid
language sql security definer stable set search_path = public as $$
  select business_id from business_members where user_id = auth.uid() and role = 'owner'
$$;

-- Creates a business with the caller as owner (or returns the one they're already in).
create or replace function public.create_business(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare bid uuid;
begin
  if auth.uid() is null then raise exception 'Not logged in'; end if;
  select business_id into bid from business_members where user_id = auth.uid() limit 1;
  if bid is not null then return bid; end if;
  insert into businesses (name, created_by) values (left(trim(p_name), 120), auth.uid()) returning id into bid;
  insert into business_members (business_id, user_id, role) values (bid, auth.uid(), 'owner');
  return bid;
end $$;

-- Joins the business that invited the caller's (confirmed) email, if any.
create or replace function public.accept_invites() returns uuid
language plpgsql security definer set search_path = public as $$
declare bid uuid; em text;
begin
  if auth.uid() is null then return null; end if;
  select business_id into bid from business_members where user_id = auth.uid() limit 1;
  if bid is not null then return bid; end if;
  select email into em from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if em is null then return null; end if;
  select business_id into bid from business_invites where lower(email) = lower(em) order by created_at limit 1;
  if bid is null then return null; end if;
  insert into business_members (business_id, user_id, role) values (bid, auth.uid(), 'staff');
  delete from business_invites where business_id = bid and lower(email) = lower(em);
  return bid;
end $$;

revoke execute on function public.create_business(text) from public, anon;
revoke execute on function public.accept_invites() from public, anon;
revoke execute on function public.my_business_ids() from public, anon;
revoke execute on function public.my_owned_business_ids() from public, anon;
grant execute on function public.create_business(text) to authenticated;
grant execute on function public.accept_invites() to authenticated;
grant execute on function public.my_business_ids() to authenticated;
grant execute on function public.my_owned_business_ids() to authenticated;

-- ---------- row level security ----------

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_invites enable row level security;
alter table public.store_connections enable row level security;

drop policy if exists "members read their business" on public.businesses;
create policy "members read their business" on public.businesses
  for select to authenticated using (id in (select public.my_business_ids()));

drop policy if exists "owners update their business" on public.businesses;
create policy "owners update their business" on public.businesses
  for update to authenticated using (id in (select public.my_owned_business_ids()))
  with check (id in (select public.my_owned_business_ids()));

drop policy if exists "members read their team" on public.business_members;
create policy "members read their team" on public.business_members
  for select to authenticated using (business_id in (select public.my_business_ids()));

drop policy if exists "owners remove staff" on public.business_members;
create policy "owners remove staff" on public.business_members
  for delete to authenticated using (business_id in (select public.my_owned_business_ids()) and role = 'staff');

drop policy if exists "owners manage invites" on public.business_invites;
create policy "owners manage invites" on public.business_invites
  for all to authenticated using (business_id in (select public.my_owned_business_ids()))
  with check (business_id in (select public.my_owned_business_ids()));

drop policy if exists "members read the connection" on public.store_connections;
create policy "members read the connection" on public.store_connections
  for select to authenticated using (business_id in (select public.my_business_ids()));

drop policy if exists "owners add the connection" on public.store_connections;
create policy "owners add the connection" on public.store_connections
  for insert to authenticated with check (business_id in (select public.my_owned_business_ids()));

drop policy if exists "owners change the connection" on public.store_connections;
create policy "owners change the connection" on public.store_connections
  for update to authenticated using (business_id in (select public.my_owned_business_ids()))
  with check (business_id in (select public.my_owned_business_ids()));
