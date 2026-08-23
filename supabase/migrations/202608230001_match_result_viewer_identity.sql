-- Identifies which side of a public EraMatch belongs to the authenticated
-- browser session without exposing either participant's profile identity.

create or replace function public.get_eraprint_match_result_viewer_side(
  p_match_id uuid
)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when a.profile_id = auth.uid() then 'A'
    when b.profile_id = auth.uid() then 'B'
    else null
  end
  from eraprint_matches m
  join eraprint_snapshots a on a.id = m.snapshot_a_id
  join eraprint_snapshots b on b.id = m.snapshot_b_id
  where m.id = p_match_id and auth.uid() is not null;
$$;

revoke all on function public.get_eraprint_match_result_viewer_side(uuid)
  from public, anon;
grant execute on function public.get_eraprint_match_result_viewer_side(uuid)
  to authenticated;
