alter table public.game_sessions
  drop constraint if exists game_sessions_refinement_mode_check;

update public.game_sessions
set refinement_mode = 'CONTINUOUS'
where session_type = 'DEEPEN_PROFILE'
  and refinement_mode in ('QUICK', 'ALL_REMAINING');

update public.game_sessions as session
set refinement_target_count = greatest(
  session.refinement_target_count,
  30 - snapshot.answer_count
)
from public.eraprint_snapshots as snapshot
where session.base_snapshot_id = snapshot.id
  and session.session_type = 'DEEPEN_PROFILE'
  and session.status = 'IN_PROGRESS';

alter table public.game_sessions
  add constraint game_sessions_refinement_mode_check
  check (refinement_mode is null or refinement_mode = 'CONTINUOUS');
