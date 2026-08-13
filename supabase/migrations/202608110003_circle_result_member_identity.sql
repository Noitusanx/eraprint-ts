-- Adds privacy-safe member labels to newly finalized Circle results and
-- exposes only positional identity metadata to the result UI.

alter table public.eraprint_circle_members
  add column if not exists display_name varchar(32)
  check (display_name is null or length(trim(display_name)) between 1 and 32);

create or replace function public.snapshot_circle_member_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coalesce(jsonb_agg(
    member.value
    || case
      when cm.display_name is not null
      then jsonb_build_object('displayName', cm.display_name)
      else '{}'::jsonb
    end
    order by member.ordinality
  ), '[]'::jsonb)
  into new.member_results
  from jsonb_array_elements(new.member_results) with ordinality as member(value, ordinality)
  left join eraprint_circle_members cm
    on cm.circle_id = new.circle_id
    and cm.snapshot_id = (member.value->>'snapshotId')::uuid;

  return new;
end;
$$;

drop trigger if exists snapshot_circle_member_identity_on_result
  on public.eraprint_circle_results;

create trigger snapshot_circle_member_identity_on_result
before insert on public.eraprint_circle_results
for each row execute function public.snapshot_circle_member_identity();

create or replace function public.set_eraprint_circle_member_display_name(
  p_circle_id uuid,
  p_display_name text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := nullif(trim(p_display_name), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if v_name is not null and length(v_name) > 32 then
    raise exception 'Circle names must be 32 characters or fewer.' using errcode = '22023';
  end if;

  update eraprint_circle_members cm
  set display_name = v_name
  from eraprint_snapshots s, eraprint_circles c
  where cm.circle_id = p_circle_id
    and cm.snapshot_id = s.id
    and s.profile_id = auth.uid()
    and c.id = cm.circle_id
    and c.status = 'OPEN';

  if not found then
    raise exception 'Circle membership not found or no longer editable.' using errcode = '42501';
  end if;
  return v_name;
end;
$$;

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
    ),
    'displayName', (
      select cm.display_name
      from eraprint_circle_members cm
      join eraprint_snapshots s on s.id = cm.snapshot_id
      where cm.circle_id = c.id and s.profile_id = auth.uid()
      limit 1
    )
  )
  from eraprint_circles c
  where c.id = p_circle_id and auth.uid() is not null;
$$;

create or replace function public.get_public_eraprint_circle(p_circle_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'circleId', c.id,
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

create or replace function public.get_eraprint_circle_result_viewer_state(
  p_result_id uuid
)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'memberIndex', (
      select member.ordinality::integer
      from jsonb_array_elements(r.member_results) with ordinality as member(value, ordinality)
      join eraprint_snapshots s
        on s.id = (member.value->>'snapshotId')::uuid
      where s.profile_id = auth.uid()
      limit 1
    )
  )
  from eraprint_circle_results r
  where r.id = p_result_id and auth.uid() is not null;
$$;

create or replace function public.get_public_eraprint_circle_result(
  p_result_id uuid
)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'circleResultId', r.id,
    'circleVersion', r.circle_version,
    'scoringVersion', r.scoring_version,
    'memberCount', r.member_count,
    'traits', r.averaged_traits,
    'eraBlend', r.averaged_era_blend,
    'primaryEra', (select item from jsonb_array_elements(r.averaged_era_blend) item where item->>'code' = r.primary_era_code limit 1),
    'secondaryEra', (select item from jsonb_array_elements(r.averaged_era_blend) item where item->>'code' = r.secondary_era_code limit 1),
    'hiddenEra', (select item from jsonb_array_elements(r.averaged_era_blend) item where item->>'code' = r.hidden_era_code limit 1),
    'strongestSignals', r.strongest_signals,
    'mostUnitedTrait', r.most_united_trait,
    'mostDifferentTrait', r.most_different_trait,
    'creatorMemberIndex', (
      select member.ordinality::integer
      from eraprint_circles c,
        jsonb_array_elements(r.member_results) with ordinality as member(value, ordinality)
      where c.id = r.circle_id
        and member.value->>'snapshotId' = c.owner_snapshot_id::text
      limit 1
    ),
    'members', r.member_results,
    'createdAt', r.created_at
  )
  from eraprint_circle_results r
  where r.id = p_result_id;
$$;

revoke all on function public.get_eraprint_circle_result_viewer_state(uuid)
  from public, anon;
grant execute on function public.get_eraprint_circle_result_viewer_state(uuid)
  to authenticated;

revoke all on function public.set_eraprint_circle_member_display_name(uuid, text)
  from public, anon;
grant execute on function public.set_eraprint_circle_member_display_name(uuid, text)
  to authenticated;

revoke all on function public.get_eraprint_circle_participant_state(uuid)
  from public, anon;
grant execute on function public.get_eraprint_circle_participant_state(uuid)
  to authenticated;

revoke all on function public.get_public_eraprint_circle(uuid)
  from public;
grant execute on function public.get_public_eraprint_circle(uuid)
  to anon, authenticated;

revoke all on function public.get_public_eraprint_circle_result(uuid)
  from public;
grant execute on function public.get_public_eraprint_circle_result(uuid)
  to anon, authenticated;
