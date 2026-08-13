-- Forward-compatible cleanup for databases where the earlier continuous-mode
-- migration was already applied. Active sessions remain resumable because
-- their identity is profile + base snapshot + IN_PROGRESS status.
alter table public.game_sessions
  drop constraint if exists game_sessions_refinement_mode_check,
  drop constraint if exists refinement_session_metadata,
  drop column if exists refinement_mode,
  drop column if exists refinement_target_count;

alter table public.game_sessions
  add constraint refinement_session_metadata
  check (
    base_snapshot_id is null
    or (session_type = 'DEEPEN_PROFILE' and base_snapshot_id is not null)
  ) not valid;

alter table public.game_sessions validate constraint refinement_session_metadata;
