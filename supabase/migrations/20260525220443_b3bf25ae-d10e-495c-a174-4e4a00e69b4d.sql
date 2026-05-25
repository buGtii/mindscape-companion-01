
-- psychologist profiles
create table public.psychologist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  qualification text not null,
  specializations text[] not null default '{}',
  experience_years int not null default 0,
  fee_cents int not null default 0,
  currency text not null default 'USD',
  languages text[] not null default '{english}',
  bio text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.psychologist_profiles enable row level security;

create policy "psy read verified or self or admin" on public.psychologist_profiles
  for select to authenticated
  using (verified = true or user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "psy insert self if psychologist" on public.psychologist_profiles
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_role(auth.uid(),'psychologist'));
create policy "psy update own" on public.psychologist_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "psy admin all" on public.psychologist_profiles
  for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create trigger psy_touch before update on public.psychologist_profiles
  for each row execute function public.touch_updated_at();

-- availability slots
create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null references public.psychologist_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_booked boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.availability_slots enable row level security;
create index slots_psy_idx on public.availability_slots(psychologist_id, starts_at);

create policy "slots read auth" on public.availability_slots for select to authenticated using (true);
create policy "slots psy manage own" on public.availability_slots for all to authenticated
  using (exists (select 1 from public.psychologist_profiles p where p.id = psychologist_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.psychologist_profiles p where p.id = psychologist_id and p.user_id = auth.uid()));

-- bookings
create type public.booking_status as enum ('pending','confirmed','completed','cancelled');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  psychologist_id uuid not null references public.psychologist_profiles(id) on delete cascade,
  slot_id uuid not null references public.availability_slots(id) on delete restrict,
  status public.booking_status not null default 'pending',
  patient_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create index bookings_patient_idx on public.bookings(patient_id);
create index bookings_psy_idx on public.bookings(psychologist_id);

create policy "bookings read participant" on public.bookings for select to authenticated using (
  patient_id = auth.uid()
  or exists (select 1 from public.psychologist_profiles p where p.id = psychologist_id and p.user_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);
create policy "bookings patient create" on public.bookings for insert to authenticated
  with check (patient_id = auth.uid());
create policy "bookings update participant" on public.bookings for update to authenticated using (
  patient_id = auth.uid()
  or exists (select 1 from public.psychologist_profiles p where p.id = psychologist_id and p.user_id = auth.uid())
);

create trigger bookings_touch before update on public.bookings
  for each row execute function public.touch_updated_at();

-- messages (chat)
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create index messages_booking_idx on public.messages(booking_id, created_at);

create policy "msg read participant" on public.messages for select to authenticated using (
  exists (
    select 1 from public.bookings b
    left join public.psychologist_profiles p on p.id = b.psychologist_id
    where b.id = booking_id and (b.patient_id = auth.uid() or p.user_id = auth.uid())
  )
);
create policy "msg send participant" on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and exists (
    select 1 from public.bookings b
    left join public.psychologist_profiles p on p.id = b.psychologist_id
    where b.id = booking_id and (b.patient_id = auth.uid() or p.user_id = auth.uid())
  )
);

alter publication supabase_realtime add table public.messages;
alter table public.messages replica identity full;

-- clinical assessments (psychologist-only)
create table public.clinical_assessments (
  id uuid primary key default gen_random_uuid(),
  psychologist_id uuid not null,
  patient_label text not null,
  disorder_id uuid references public.disorders(id) on delete set null,
  checked_criteria jsonb not null default '[]'::jsonb,
  risk_level text not null default 'low',
  notes text,
  treatment_plan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clinical_assessments enable row level security;

create policy "ca psychologist own" on public.clinical_assessments for all to authenticated
  using (psychologist_id = auth.uid() and public.has_role(auth.uid(),'psychologist'))
  with check (psychologist_id = auth.uid() and public.has_role(auth.uid(),'psychologist'));

create trigger ca_touch before update on public.clinical_assessments
  for each row execute function public.touch_updated_at();

-- student quiz attempts
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  disorder_id uuid references public.disorders(id) on delete set null,
  score int not null,
  total int not null,
  created_at timestamptz not null default now()
);
alter table public.quiz_attempts enable row level security;
create policy "qa own" on public.quiz_attempts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- flashcard reviews
create table public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  disorder_id uuid not null references public.disorders(id) on delete cascade,
  ease int not null default 0,
  reviewed_at timestamptz not null default now(),
  unique(user_id, disorder_id)
);
alter table public.flashcard_reviews enable row level security;
create policy "fc own" on public.flashcard_reviews for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- AI symptom analyses log
create table public.ai_symptom_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  input_text text not null,
  suggestions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.ai_symptom_analyses enable row level security;
create policy "ai own" on public.ai_symptom_analyses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
