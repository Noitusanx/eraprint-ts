create or replace function public.get_eraprint_circle_participant_state(p_circle_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'isOwner', c.owner_profile_id = auth.uid(),
    'isMember', exists (
      select 1
      from eraprint_circle_members cm
      join eraprint_snapshots s on s.id = cm.snapshot_id
      where cm.circle_id = c.id and s.profile_id = auth.uid()
    ),
    'memberIndex', (
      select ranked.member_index
      from (
        select s.profile_id,
          (row_number() over (order by cm.joined_at, cm.id))::integer as member_index
        from eraprint_circle_members cm
        join eraprint_snapshots s on s.id = cm.snapshot_id
        where cm.circle_id = c.id
      ) ranked
      where ranked.profile_id = auth.uid()
      limit 1
    ),
    'snapshotId', (
      select s.id
      from eraprint_snapshots s
      where s.profile_id = auth.uid()
      order by s.created_at desc
      limit 1
    )
  )
  from eraprint_circles c
  where c.id = p_circle_id and auth.uid() is not null;
$$;

revoke all on function public.get_eraprint_circle_participant_state(uuid) from public, anon;
grant execute on function public.get_eraprint_circle_participant_state(uuid) to authenticated;
