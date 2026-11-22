-- OpenDoor student workspace cloud backup (opt-in only).
-- Stores only the whitelisted workspace data assembled by the frontend.
-- Never store passwords, identity documents, exact birth dates, financial data or private essays here.

create table if not exists public.student_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace jsonb not null default '{}'::jsonb
    check (jsonb_typeof(workspace) = 'object' and pg_column_size(workspace) <= 65536),
  updated_at timestamptz not null default now()
);

alter table public.student_workspaces enable row level security;

drop policy if exists "student workspace read own" on public.student_workspaces;
create policy "student workspace read own"
  on public.student_workspaces for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "student workspace insert own" on public.student_workspaces;
create policy "student workspace insert own"
  on public.student_workspaces for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "student workspace update own" on public.student_workspaces;
create policy "student workspace update own"
  on public.student_workspaces for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "student workspace delete own" on public.student_workspaces;
create policy "student workspace delete own"
  on public.student_workspaces for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.student_workspaces to authenticated;
grant select, insert, update on public.user_profiles to authenticated;
grant select on public.opportunities to anon, authenticated;
grant select on public.feedback to anon, authenticated;

comment on table public.student_workspaces is
  'Opt-in student workspace backup. RLS restricts every row to its owner. Frontend must whitelist fields and obtain appropriate consent before syncing.';
