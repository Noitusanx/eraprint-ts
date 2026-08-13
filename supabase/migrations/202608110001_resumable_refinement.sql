alter table public.game_sessions
  add column if not exists base_snapshot_id uuid references public.eraprint_snapshots(id) on delete restrict,
  add column if not exists refinement_mode text check (refinement_mode = 'CONTINUOUS'),
  add column if not exists refinement_target_count smallint check (refinement_target_count > 0);

alter table public.game_sessions
  add constraint refinement_session_metadata
  check (
    (base_snapshot_id is null and refinement_mode is null and refinement_target_count is null)
    or
    (session_type = 'DEEPEN_PROFILE' and base_snapshot_id is not null and refinement_mode is not null and refinement_target_count is not null)
  ) not valid;

alter table public.game_sessions validate constraint refinement_session_metadata;

create unique index if not exists idx_one_active_refinement_per_profile
  on public.game_sessions(profile_id)
  where session_type = 'DEEPEN_PROFILE' and status = 'IN_PROGRESS';

create index if not exists idx_refinement_base_snapshot
  on public.game_sessions(base_snapshot_id, started_at desc)
  where session_type = 'DEEPEN_PROFILE';
