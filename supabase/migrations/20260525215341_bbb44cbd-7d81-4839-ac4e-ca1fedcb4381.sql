
-- Roles enum + table
create type public.app_role as enum ('student','psychologist','researcher','patient','admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- DSM content
create table public.disorder_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  sort_order int not null default 0
);

create table public.disorders (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.disorder_categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  dsm_code text,
  summary text not null,
  overview text,
  prevalence text,
  created_at timestamptz not null default now()
);
create index on public.disorders (category_id);
create index on public.disorders using gin (to_tsvector('english', name || ' ' || summary || ' ' || coalesce(overview,'')));

create table public.disorder_criteria (
  id uuid primary key default gen_random_uuid(),
  disorder_id uuid not null references public.disorders(id) on delete cascade,
  label text not null,
  description text not null,
  sort_order int not null default 0
);
create index on public.disorder_criteria (disorder_id);

create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  disorder_id uuid not null references public.disorders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, disorder_id)
);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated before update on public.profiles
for each row execute function public.touch_updated_at();

-- New user trigger -> profile + default patient role
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'patient');
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.disorder_categories enable row level security;
alter table public.disorders enable row level security;
alter table public.disorder_criteria enable row level security;
alter table public.bookmarks enable row level security;

-- Profiles
create policy "profiles read all" on public.profiles for select using (true);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);

-- User roles
create policy "roles read own" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "roles insert own non-admin" on public.user_roles for insert
  with check (auth.uid() = user_id and role <> 'admin');
create policy "roles delete own non-admin" on public.user_roles for delete
  using (auth.uid() = user_id and role <> 'admin');
create policy "admin manage roles" on public.user_roles for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- DSM content: authenticated read, admin write
create policy "cats read auth" on public.disorder_categories for select to authenticated using (true);
create policy "cats admin write" on public.disorder_categories for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "dis read auth" on public.disorders for select to authenticated using (true);
create policy "dis admin write" on public.disorders for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "crit read auth" on public.disorder_criteria for select to authenticated using (true);
create policy "crit admin write" on public.disorder_criteria for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Bookmarks: own only
create policy "bm read own" on public.bookmarks for select using (auth.uid() = user_id);
create policy "bm insert own" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bm delete own" on public.bookmarks for delete using (auth.uid() = user_id);
