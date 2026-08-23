create or replace function public.get_eraprint_match_invite_viewer_state(
  p_invite_id uuid
)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'isOwner', i.owner_profile_id = auth.uid(),
    'snapshotId', case
      when i.owner_profile_id = auth.uid() then i.owner_snapshot_id
      else null
    end,
    'status', case
      when i.status = 'OPEN' and i.expires_at <= now() then 'EXPIRED'
      else i.status
    end,
    'matchId', i.match_id
  )
  from eraprint_match_invites i
  where i.id = p_invite_id;
$$;

revoke all on function public.get_eraprint_match_invite_viewer_state(uuid)
  from public, anon;
grant execute on function public.get_eraprint_match_invite_viewer_state(uuid)
  to authenticated;
