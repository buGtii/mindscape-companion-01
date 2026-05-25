
create extension if not exists pg_trgm;

alter table public.disorders
  add column if not exists synonyms text[] not null default '{}',
  add column if not exists common_symptoms text[] not null default '{}',
  add column if not exists source_page integer,
  add column if not exists source_citation text default 'American Psychiatric Association. Diagnostic and Statistical Manual of Mental Disorders, Fifth Edition, Text Revision (DSM-5-TR). Washington, DC: APA, 2022.',
  add column if not exists is_premium boolean not null default false;

create index if not exists disorders_name_trgm on public.disorders using gin (name gin_trgm_ops);
create index if not exists disorders_synonyms_idx on public.disorders using gin (synonyms);
create index if not exists disorders_symptoms_idx on public.disorders using gin (common_symptoms);

create table if not exists public.disorder_relations (
  id uuid primary key default gen_random_uuid(),
  from_disorder_id uuid not null references public.disorders(id) on delete cascade,
  to_disorder_id uuid not null references public.disorders(id) on delete cascade,
  relation_type text not null default 'related',
  notes text,
  created_at timestamptz not null default now(),
  unique (from_disorder_id, to_disorder_id, relation_type)
);
alter table public.disorder_relations enable row level security;
create policy "rel read auth" on public.disorder_relations for select to authenticated using (true);
create policy "rel admin write" on public.disorder_relations for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  tier text not null default 'free',
  status text not null default 'active',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "sub read own" on public.subscriptions for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "sub insert own" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "sub update own" on public.subscriptions for update using (auth.uid() = user_id);
create policy "sub admin all" on public.subscriptions for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.is_premium(_uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.subscriptions where user_id = _uid and tier = 'premium' and status = 'active' and (current_period_end is null or current_period_end > now()))
    or exists(select 1 from public.user_roles where user_id = _uid and role in ('admin','psychologist','researcher'));
$$;

drop trigger if exists subs_updated on public.subscriptions;
create trigger subs_updated before update on public.subscriptions for each row execute function public.touch_updated_at();

alter table public.messages replica identity full;
alter table public.bookings replica identity full;
do $$
begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.bookings; exception when duplicate_object then null; end;
end $$;
