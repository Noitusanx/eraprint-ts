create extension if not exists pgcrypto;

create table if not exists public.traits (
  code text primary key,
  name text not null,
  low_label text not null,
  high_label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.eras (
  code text primary key,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.era_trait_profiles (
  era_code text not null references public.eras(code) on delete cascade,
  trait_code text not null references public.traits(code) on delete cascade,
  score numeric(5,2) not null check (score between 0 and 100),
  scoring_version text not null,
  primary key (era_code, trait_code, scoring_version)
);

create table if not exists public.questions (
  id text primary key,
  question_type text not null check (question_type in ('SCENARIO','THIS_OR_THAT','VISUAL_PICK')),
  category text not null,
  prompt text not null,
  active boolean not null default true,
  content_version text not null default 'v1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.question_choices (
  id text primary key,
  question_id text not null references public.questions(id) on delete cascade,
  label text not null,
  hint text,
  position smallint not null,
  unique (question_id, position),
  unique (question_id, id)
);

create table if not exists public.choice_trait_effects (
  choice_id text not null references public.question_choices(id) on delete cascade,
  trait_code text not null references public.traits(code) on delete cascade,
  effect smallint not null check (effect in (-2,-1,1,2)),
  primary key (choice_id, trait_code)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Anonymous Swiftie',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  session_type text not null check (session_type in ('INITIAL','DAILY','DEEPEN_PROFILE')),
  status text not null check (status in ('IN_PROGRESS','COMPLETED','ABANDONED')),
  scoring_version text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  question_id text not null references public.questions(id),
  choice_id text not null,
  sequence_no smallint not null check (sequence_no > 0),
  foreign key (question_id, choice_id) references public.question_choices(question_id, id),
  answered_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create table if not exists public.eraprint_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_session_id uuid unique references public.game_sessions(id) on delete set null,
  scoring_version text not null,
  primary_era_code text not null references public.eras(code),
  secondary_era_code text not null references public.eras(code),
  hidden_era_code text not null references public.eras(code),
  archetype text not null,
  clarity numeric(5,2) not null check (clarity between 0 and 95),
  fingerprint_code text not null,
  era_blend jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.eraprint_trait_scores (
  snapshot_id uuid not null references public.eraprint_snapshots(id) on delete cascade,
  trait_code text not null references public.traits(code),
  score numeric(5,2) not null check (score between 0 and 100),
  evidence_count integer not null check (evidence_count >= 0),
  total_effect integer not null,
  reliability numeric(5,4) not null check (reliability between 0 and 1),
  primary key (snapshot_id, trait_code)
);

create index if not exists idx_game_sessions_profile on public.game_sessions(profile_id, started_at desc);
create index if not exists idx_answers_profile on public.answers(profile_id, answered_at desc);
create index if not exists idx_snapshots_profile on public.eraprint_snapshots(profile_id, created_at desc);
create index if not exists idx_snapshots_primary_era on public.eraprint_snapshots(primary_era_code);
create index if not exists idx_snapshots_fingerprint on public.eraprint_snapshots(fingerprint_code);

alter table public.traits enable row level security;
alter table public.eras enable row level security;
alter table public.era_trait_profiles enable row level security;
alter table public.questions enable row level security;
alter table public.question_choices enable row level security;
alter table public.choice_trait_effects enable row level security;
alter table public.profiles enable row level security;
alter table public.game_sessions enable row level security;
alter table public.answers enable row level security;
alter table public.eraprint_snapshots enable row level security;
alter table public.eraprint_trait_scores enable row level security;

drop policy if exists "Reference traits are readable" on public.traits;
create policy "Reference traits are readable" on public.traits for select using (true);

drop policy if exists "Reference eras are readable" on public.eras;
create policy "Reference eras are readable" on public.eras for select using (true);

drop policy if exists "Reference era profiles are readable" on public.era_trait_profiles;
create policy "Reference era profiles are readable" on public.era_trait_profiles for select using (true);

drop policy if exists "Reference questions are readable" on public.questions;
create policy "Reference questions are readable" on public.questions for select using (active = true);

drop policy if exists "Reference choices are readable" on public.question_choices;
create policy "Reference choices are readable" on public.question_choices for select using (true);

-- Hidden scoring weights intentionally are not granted to browser roles.
-- They are seeded in PostgreSQL for server-side analytics/calibration only.

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users read own sessions" on public.game_sessions;
create policy "Users read own sessions" on public.game_sessions for select using (auth.uid() = profile_id);

drop policy if exists "Users insert own sessions" on public.game_sessions;
create policy "Users insert own sessions" on public.game_sessions for insert with check (auth.uid() = profile_id);

drop policy if exists "Users update own sessions" on public.game_sessions;
create policy "Users update own sessions" on public.game_sessions
for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "Users read own answers" on public.answers;
create policy "Users read own answers" on public.answers for select using (auth.uid() = profile_id);

drop policy if exists "Users insert own answers" on public.answers;
create policy "Users insert own answers" on public.answers for insert with check (auth.uid() = profile_id);

drop policy if exists "Users update own answers" on public.answers;
create policy "Users update own answers" on public.answers
for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "Users read own snapshots" on public.eraprint_snapshots;
create policy "Users read own snapshots" on public.eraprint_snapshots for select using (auth.uid() = profile_id);

drop policy if exists "Users insert own snapshots" on public.eraprint_snapshots;
create policy "Users insert own snapshots" on public.eraprint_snapshots for insert with check (auth.uid() = profile_id);

drop policy if exists "Users update own snapshots" on public.eraprint_snapshots;
create policy "Users update own snapshots" on public.eraprint_snapshots
for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "Users read own trait scores" on public.eraprint_trait_scores;
create policy "Users read own trait scores" on public.eraprint_trait_scores
for select using (
  exists (
    select 1
    from public.eraprint_snapshots s
    where s.id = snapshot_id and s.profile_id = auth.uid()
  )
);

drop policy if exists "Users insert own trait scores" on public.eraprint_trait_scores;
create policy "Users insert own trait scores" on public.eraprint_trait_scores
for insert with check (
  exists (
    select 1
    from public.eraprint_snapshots s
    where s.id = snapshot_id and s.profile_id = auth.uid()
  )
);

drop policy if exists "Users update own trait scores" on public.eraprint_trait_scores;
create policy "Users update own trait scores" on public.eraprint_trait_scores
for update using (
  exists (
    select 1
    from public.eraprint_snapshots s
    where s.id = snapshot_id and s.profile_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.eraprint_snapshots s
    where s.id = snapshot_id and s.profile_id = auth.uid()
  )
);

grant select on public.traits, public.eras, public.era_trait_profiles, public.questions, public.question_choices to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.game_sessions, public.answers, public.eraprint_snapshots, public.eraprint_trait_scores to authenticated;
