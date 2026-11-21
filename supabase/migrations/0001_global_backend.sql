-- OpenDoor Global Backend: Supabase/PostgreSQL
-- Run in a new Supabase project after reviewing privacy, billing and moderation policy.
create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  country text,
  age_band text check (age_band is null or age_band in ('13-15','16-17','18-24','25+','prefer_not_to_say')),
  education_level text,
  interests text[] not null default '{}',
  billing_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  provider text not null,
  category text not null,
  description text not null,
  official_url text not null check (official_url like 'https://%'),
  application_url text,
  min_age smallint check (min_age is null or min_age >= 0),
  max_age smallint check (max_age is null or max_age >= 0),
  eligible_countries text[] not null default '{}',
  excluded_countries text[] not null default '{}',
  regions text[] not null default '{}',
  education_levels text[] not null default '{}',
  subjects text[] not null default '{}',
  funding_type text not null default 'Not stated',
  fee text not null default 'Not stated',
  deadline date,
  modality text not null default 'Not stated',
  status text not null default 'pending_review' check (status in ('pending_review','verified','needs_update','closed','expired')),
  last_checked date,
  verified_by uuid references auth.users(id),
  source_id text,
  fingerprint text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_age is null or max_age is null or min_age <= max_age),
  check (status <> 'verified' or (last_checked is not null and verified_by is not null))
);

create table if not exists public.opportunity_candidates (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  provider text not null,
  title text not null,
  official_url text not null check (official_url like 'https://%'),
  category text,
  description text,
  raw_record jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending_review' check (review_status in ('pending_review','accepted','rejected','duplicate')),
  discovered_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create table if not exists public.source_registry (
  source_id text primary key,
  provider_name text not null,
  official_source_url text not null check (official_source_url like 'https://%'),
  feed_url text,
  category_scope text,
  active boolean not null default false,
  terms_reviewed boolean not null default false,
  last_successful_sync timestamptz,
  notes text not null default ''
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  topic text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 8 and 700),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderator_id uuid references auth.users(id)
);

create table if not exists public.entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','premium')),
  billing_status text not null default 'inactive',
  provider text not null default 'stripe',
  customer_id text,
  subscription_id text unique,
  price_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('catalogue_moderator','feedback_moderator','super_admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.api_rate_limits (
  key_hash text not null,
  scope text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (key_hash, scope, window_start)
);

create or replace function public.consume_rate_limit(p_key_hash text, p_scope text, p_window_start timestamptz, p_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare new_count integer;
begin
  insert into public.api_rate_limits(key_hash, scope, window_start, request_count)
  values (p_key_hash, p_scope, p_window_start, 1)
  on conflict (key_hash, scope, window_start)
  do update set request_count = api_rate_limits.request_count + 1
  returning request_count into new_count;
  return new_count <= p_limit;
end; $$;
revoke all on function public.consume_rate_limit(text,text,timestamptz,integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,text,timestamptz,integer) to service_role;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles(user_id) values (new.id) on conflict do nothing;
  insert into public.entitlements(user_id, plan, billing_status) values (new.id, 'free', 'inactive') on conflict do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_opendoor on auth.users;
create trigger on_auth_user_created_opendoor after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.user_profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_candidates enable row level security;
alter table public.source_registry enable row level security;
alter table public.feedback enable row level security;
alter table public.entitlements enable row level security;
alter table public.admin_users enable row level security;
alter table public.api_rate_limits enable row level security;

-- Profiles: only the owner can read/update their own minimal profile. Billing eligibility is never client-editable.
drop policy if exists "profile read own" on public.user_profiles;
create policy "profile read own" on public.user_profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists "profile insert own" on public.user_profiles;
create policy "profile insert own" on public.user_profiles for insert to authenticated with check (auth.uid() = user_id and billing_eligible = false);
drop policy if exists "profile update own safe fields" on public.user_profiles;
create policy "profile update own safe fields" on public.user_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and billing_eligible = false);

-- Public can read only verified and non-expired opportunities.
drop policy if exists "public read verified opportunities" on public.opportunities;
create policy "public read verified opportunities" on public.opportunities for select to anon, authenticated using (status = 'verified' and (deadline is null or deadline >= current_date));

-- Candidates, sources and limits are server-side only. Moderators use service role or secured admin tooling.
-- Public visitors can read only approved reviews. Submissions are routed through the edge function.
drop policy if exists "public read approved feedback" on public.feedback;
create policy "public read approved feedback" on public.feedback for select to anon, authenticated using (status = 'approved');

-- Users can read only their own subscription entitlement; the client cannot alter billing state.
drop policy if exists "read own entitlement" on public.entitlements;
create policy "read own entitlement" on public.entitlements for select to authenticated using (auth.uid() = user_id);

-- Admins do not receive broad RLS policies by default. Use service-role edge functions for moderation.
-- Never expose SUPABASE_SERVICE_ROLE_KEY, Stripe secrets or AI keys in frontend code.
