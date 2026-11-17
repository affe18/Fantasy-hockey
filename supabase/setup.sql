-- RinkIQ account storage
-- Run this in the Supabase SQL Editor for your project.
create table if not exists public.user_leagues (
  user_id uuid primary key references auth.users(id) on delete cascade,
  league_id text not null,
  season integer not null,
  league_json jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_leagues enable row level security;

-- Each signed-in manager can read and change only their own saved league.
drop policy if exists "Users can read their own league" on public.user_leagues;
create policy "Users can read their own league"
  on public.user_leagues for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own league" on public.user_leagues;
create policy "Users can insert their own league"
  on public.user_leagues for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own league" on public.user_leagues;
create policy "Users can update their own league"
  on public.user_leagues for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own league" on public.user_leagues;
create policy "Users can delete their own league"
  on public.user_leagues for delete
  to authenticated
  using (auth.uid() = user_id);
