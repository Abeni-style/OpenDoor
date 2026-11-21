-- OpenDoor optional shared backend schema (Supabase/PostgreSQL)
-- Run only after creating a project and reviewing privacy, moderation and consent requirements.
create extension if not exists pgcrypto;

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
  education_levels text[] not null default '{}',
  subjects text[] not null default '{}',
  funding_type text not null default 'Not stated',
  fee text not null default 'Not stated',
  deadline date,
  deadline_type text not null default 'Not stated',
  modality text not null default 'Not stated',
  verification_status text not null default 'pending_review' check (verification_status in ('pending_review','verified','needs_update','closed','expired')),
  last_checked date,
  verified_by uuid,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_age is null or max_age is null or min_age <= max_age),
  check (verification_status <> 'verified' or (last_checked is not null and verified_by is not null))
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 8 and 700),
  display_name text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  moderated_at timestamptz,
  moderator_id uuid
);

alter table public.opportunities enable row level security;
alter table public.feedback enable row level security;

-- Public visitors can only read verified opportunities.
drop policy if exists "public read verified opportunities" on public.opportunities;
create policy "public read verified opportunities" on public.opportunities for select to anon, authenticated using (verification_status = 'verified');

-- Public visitors can read only approved feedback.
drop policy if exists "public read approved feedback" on public.feedback;
create policy "public read approved feedback" on public.feedback for select to anon, authenticated using (status = 'approved');

-- New public feedback is always untrusted and must be moderated.
drop policy if exists "public submit pending feedback" on public.feedback;
create policy "public submit pending feedback" on public.feedback for insert to anon, authenticated with check (status = 'pending' and moderated_at is null and moderator_id is null);

-- Do not create public update/delete policies. Moderation and catalogue changes must use a protected server-side admin function.
