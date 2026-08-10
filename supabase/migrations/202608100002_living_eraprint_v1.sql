alter table public.eraprint_snapshots
  add column previous_snapshot_id uuid references public.eraprint_snapshots(id) on delete restrict,
  add column answer_count smallint not null default 8 check (answer_count >= 8),
  add column catalog_version text not null default 'v1.0.0';

create unique index idx_snapshots_previous_unique
  on public.eraprint_snapshots(previous_snapshot_id)
  where previous_snapshot_id is not null;

create table public.eraprint_snapshot_answers (
  snapshot_id uuid not null references public.eraprint_snapshots(id) on delete cascade,
  question_id text not null references public.questions(id),
  choice_id text not null,
  sequence_no smallint not null check (sequence_no > 0),
  foreign key (question_id, choice_id) references public.question_choices(question_id, id),
  primary key (snapshot_id, question_id),
  unique (snapshot_id, sequence_no)
);

insert into public.eraprint_snapshot_answers (snapshot_id, question_id, choice_id, sequence_no)
select s.id, a.question_id, a.choice_id, a.sequence_no
from public.eraprint_snapshots s
join public.answers a on a.session_id = s.game_session_id
on conflict do nothing;

alter table public.eraprint_snapshot_answers enable row level security;

create policy "Users read own snapshot answers" on public.eraprint_snapshot_answers
for select using (
  exists (
    select 1 from public.eraprint_snapshots s
    where s.id = snapshot_id and s.profile_id = auth.uid()
  )
);

create policy "Users insert own snapshot answers" on public.eraprint_snapshot_answers
for insert with check (
  exists (
    select 1 from public.eraprint_snapshots s
    where s.id = snapshot_id and s.profile_id = auth.uid()
  )
);

grant select, insert on public.eraprint_snapshot_answers to authenticated;

-- Result evidence and snapshots are append-only. Public URLs and social
-- results must always keep rendering the values captured at creation time.
drop policy if exists "Users update own answers" on public.answers;
drop policy if exists "Users update own snapshots" on public.eraprint_snapshots;
drop policy if exists "Users update own trait scores" on public.eraprint_trait_scores;
revoke update on public.answers, public.eraprint_snapshots, public.eraprint_trait_scores from authenticated;

create or replace function public.get_latest_owned_eraprint_snapshot()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id
  from eraprint_snapshots
  where profile_id = auth.uid()
  order by created_at desc, id desc
  limit 1;
$$;

revoke all on function public.get_latest_owned_eraprint_snapshot() from public;
grant execute on function public.get_latest_owned_eraprint_snapshot() to authenticated;
