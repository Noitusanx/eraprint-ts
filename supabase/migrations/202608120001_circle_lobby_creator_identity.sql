-- Exposes the creator's stable card position without exposing ownership IDs.

create or replace function public.get_public_eraprint_circle(p_circle_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'circleId', c.id,
    'creatorMemberIndex', (
      select ranked.member_index
      from (
        select cm.snapshot_id,
          (row_number() over (order by cm.joined_at, cm.id))::integer as member_index
        from eraprint_circle_members cm
        where cm.circle_id = c.id
      ) ranked
      where ranked.snapshot_id = c.owner_snapshot_id
      limit 1
    ),
    'status', case when c.status = 'OPEN' and c.expires_at <= now() then 'EXPIRED' else c.status end,
    'circleVersion', c.circle_version,
    'expiresAt', c.expires_at,
    'memberCount', (select count(*) from eraprint_circle_members cm where cm.circle_id = c.id),
    'maxMembers', 10,
    'resultId', c.result_id,
    'members', (
      select coalesce(json_agg(json_build_object(
        'displayName', cm.display_name,
        'archetype', s.archetype,
        'primaryEra', (select item from jsonb_array_elements(s.era_blend) item where item->>'code' = s.primary_era_code limit 1),
        'secondaryEra', (select item from jsonb_array_elements(s.era_blend) item where item->>'code' = s.secondary_era_code limit 1)
      ) order by cm.joined_at, cm.id), '[]'::json)
      from eraprint_circle_members cm
      join eraprint_snapshots s on s.id = cm.snapshot_id
      where cm.circle_id = c.id
    )
  )
  from eraprint_circles c
  where c.id = p_circle_id;
$$;

revoke all on function public.get_public_eraprint_circle(uuid) from public;
grant execute on function public.get_public_eraprint_circle(uuid)
  to anon, authenticated;
