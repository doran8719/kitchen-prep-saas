-- 002_billing.sql
-- Paywall: who has paid. Stripe tells the app about payments (app/api/stripe/webhook),
-- which records them here. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again.

-- Kitchens that use Prepline free (Hungry House).
alter table public.businesses add column if not exists comped boolean not null default false;

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists billing_subscriptions_user_idx on public.billing_subscriptions(user_id);
create index if not exists billing_subscriptions_email_idx on public.billing_subscriptions(lower(email));

-- Only the server (with the secret key) writes here. People can read their own row.
alter table public.billing_subscriptions enable row level security;
drop policy if exists "users read own subscription" on public.billing_subscriptions;
create policy "users read own subscription" on public.billing_subscriptions
  for select to authenticated using (user_id = auth.uid());

-- Can the logged-in user use Prepline?
-- Yes if their kitchen is comped, or they (or their kitchen's owner) have a live subscription.
-- Payments are matched by account, or by confirmed email if they paid without logging in.
create or replace function public.my_access() returns boolean
language plpgsql security definer stable set search_path = public as $$
declare bid uuid;
begin
  if auth.uid() is null then return false; end if;
  select business_id into bid from business_members where user_id = auth.uid() limit 1;
  if bid is not null and exists (select 1 from businesses where id = bid and comped) then
    return true;
  end if;
  return exists (
    select 1
    from billing_subscriptions s
    where s.status in ('active', 'trialing', 'past_due')
      and exists (
        select 1
        from auth.users u
        where (
            u.id = auth.uid()
            or (bid is not null and u.id in (
              select user_id from business_members where business_id = bid and role = 'owner'))
          )
          and (
            s.user_id = u.id
            or (u.email_confirmed_at is not null and lower(s.email) = lower(u.email))
          )
      )
  );
end $$;

revoke execute on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;

-- Hungry House uses Prepline free.
update public.businesses set comped = true where lower(name) like 'hungry house%';
