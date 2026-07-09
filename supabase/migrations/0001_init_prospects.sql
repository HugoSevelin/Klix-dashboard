create table public.prospects (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company        text not null default '',
  phone          text not null default '',
  address        text not null default '',
  city           text,
  website        text,
  business_type  text,
  extra          jsonb not null default '{}'::jsonb,
  status         text not null default 'todo'
                   check (status in ('todo', 'success', 'failed')),
  failure_reason text
                   check (failure_reason is null or failure_reason in (
                     'not_interested', 'voicemail', 'invalid_number',
                     'call_back_later', 'unreachable'
                   )),
  next_call_date timestamptz,
  call_attempts  integer not null default 0,
  notes          text not null default '',
  history        jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index prospects_owner_id_idx on public.prospects (owner_id);
create index prospects_owner_status_idx on public.prospects (owner_id, status);
create index prospects_owner_next_call_idx on public.prospects (owner_id, next_call_date)
  where next_call_date is not null;

alter table public.prospects enable row level security;

create policy "prospects_select_own" on public.prospects
  for select using (owner_id = auth.uid());
create policy "prospects_insert_own" on public.prospects
  for insert with check (owner_id = auth.uid());
create policy "prospects_update_own" on public.prospects
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "prospects_delete_own" on public.prospects
  for delete using (owner_id = auth.uid());

-- obligatoire pour que postgres_changes (realtime) voie la table, indépendamment des policies RLS
alter publication supabase_realtime add table public.prospects;
