create table public.eraprint_circles (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_snapshot_id uuid not null references public.eraprint_snapshots(id) on delete restrict,
  status text not null default 'OPEN' check (status in ('OPEN', 'FINALIZED', 'EXPIRED')),
  circle_version text not null default 'CIRCLE_V1' check (circle_version = 'CIRCLE_V1'),
  scoring_version text not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create table public.eraprint_circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.eraprint_circles(id) on delete cascade,
  snapshot_id uuid not null references public.eraprint_snapshots(id) on delete restrict,
  joined_at timestamptz not null default now(),
  unique (circle_id, snapshot_id)
);

create table public.eraprint_circle_results (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null unique references public.eraprint_circles(id) on delete restrict,
  circle_version text not null check (circle_version = 'CIRCLE_V1'),
  scoring_version text not null,
  member_count smallint not null check (member_count between 3 and 10),
  primary_era_code text not null references public.eras(code),
  secondary_era_code text not null references public.eras(code),
  hidden_era_code text not null references public.eras(code),
  averaged_traits jsonb not null,
  averaged_era_blend jsonb not null,
  strongest_signals jsonb not null,
  most_united_trait jsonb not null,
  most_different_trait jsonb not null,
  member_results jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.eraprint_circles
  add column result_id uuid unique references public.eraprint_circle_results(id) on delete set null;

create index idx_circles_owner on public.eraprint_circles(owner_profile_id, created_at desc);
create index idx_circles_status_expiry on public.eraprint_circles(status, expires_at);
create index idx_circle_members_circle on public.eraprint_circle_members(circle_id, joined_at);
create index idx_circle_members_snapshot on public.eraprint_circle_members(snapshot_id);

alter table public.eraprint_circles enable row level security;
alter table public.eraprint_circle_members enable row level security;
alter table public.eraprint_circle_results enable row level security;

-- Browser roles receive no direct table grants or globally-readable policies.
-- All Circle mutations and public reads use the narrow functions below.

create or replace function public.create_eraprint_circle(p_owner_snapshot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_circle_id uuid;
  v_scoring_version text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select scoring_version into v_scoring_version
  from eraprint_snapshots
  where id = p_owner_snapshot_id and profile_id = v_user_id;

  if not found then
    raise exception 'Snapshot not found or not owned by this session.' using errcode = '42501';
  end if;

  if (select count(*) from eraprint_trait_scores where snapshot_id = p_owner_snapshot_id) <> 8 then
    raise exception 'The owner snapshot must contain eight persisted traits.' using errcode = '22023';
  end if;
  if (select jsonb_array_length(era_blend) from eraprint_snapshots where id = p_owner_snapshot_id) <> 12 then
    raise exception 'The owner snapshot must contain all twelve Era percentages.' using errcode = '22023';
  end if;

  insert into eraprint_circles (
    owner_profile_id, owner_snapshot_id, scoring_version
  ) values (
    v_user_id, p_owner_snapshot_id, v_scoring_version
  ) returning id into v_circle_id;

  insert into eraprint_circle_members (circle_id, snapshot_id)
  values (v_circle_id, p_owner_snapshot_id);

  return v_circle_id;
end;
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

create or replace function public.join_eraprint_circle(
  p_circle_id uuid,
  p_snapshot_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_circle eraprint_circles%rowtype;
  v_snapshot_version text;
  v_member_count integer;
  v_existing_snapshot uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into v_circle from eraprint_circles where id = p_circle_id for update;
  if not found then
    raise exception 'Circle not found.' using errcode = 'P0002';
  end if;

  if v_circle.status = 'FINALIZED' then
    raise exception 'This Circle has already been finalized.' using errcode = '22023';
  end if;
  if v_circle.status = 'EXPIRED' or v_circle.expires_at <= now() then
    raise exception 'This Circle invite has expired.' using errcode = '22023';
  end if;

  select scoring_version into v_snapshot_version
  from eraprint_snapshots
  where id = p_snapshot_id and profile_id = v_user_id;
  if not found then
    raise exception 'Joining snapshot not found or not owned by this session.' using errcode = '42501';
  end if;

  if v_snapshot_version <> v_circle.scoring_version then
    raise exception 'This EraPrint uses an incompatible scoring version.' using errcode = '22023';
  end if;
  if (select count(*) from eraprint_trait_scores where snapshot_id = p_snapshot_id) <> 8 then
    raise exception 'Joining snapshot must contain eight persisted traits.' using errcode = '22023';
  end if;
  if (select jsonb_array_length(era_blend) from eraprint_snapshots where id = p_snapshot_id) <> 12 then
    raise exception 'Joining snapshot must contain all twelve Era percentages.' using errcode = '22023';
  end if;

  select cm.snapshot_id into v_existing_snapshot
  from eraprint_circle_members cm
  join eraprint_snapshots s on s.id = cm.snapshot_id
  where cm.circle_id = p_circle_id and s.profile_id = v_user_id
  limit 1;

  if v_existing_snapshot is not null then
    if v_existing_snapshot <> p_snapshot_id then
      raise exception 'This session has already joined the Circle.' using errcode = '22023';
    end if;
    return (select count(*) from eraprint_circle_members where circle_id = p_circle_id);
  end if;

  select count(*) into v_member_count from eraprint_circle_members where circle_id = p_circle_id;
  if v_member_count >= 10 then
    raise exception 'This Circle already has 10 members.' using errcode = '22023';
  end if;

  insert into eraprint_circle_members (circle_id, snapshot_id)
  values (p_circle_id, p_snapshot_id)
  on conflict (circle_id, snapshot_id) do nothing;

  return (select count(*) from eraprint_circle_members where circle_id = p_circle_id);
end;
$$;

create or replace function public.finalize_eraprint_circle(p_circle_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_circle eraprint_circles%rowtype;
  v_member_count integer;
  v_traits jsonb;
  v_era_blend jsonb;
  v_strongest jsonb;
  v_united jsonb;
  v_different jsonb;
  v_members jsonb;
  v_primary text;
  v_secondary text;
  v_hidden text;
  v_result_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into v_circle from eraprint_circles where id = p_circle_id for update;
  if not found then
    raise exception 'Circle not found.' using errcode = 'P0002';
  end if;
  if v_circle.owner_profile_id <> v_user_id then
    raise exception 'Only the Circle creator can reveal the result.' using errcode = '42501';
  end if;
  if v_circle.status = 'FINALIZED' and v_circle.result_id is not null then
    return v_circle.result_id;
  end if;
  if v_circle.status = 'EXPIRED' or v_circle.expires_at <= now() then
    raise exception 'This Circle invite has expired.' using errcode = '22023';
  end if;

  select count(*) into v_member_count from eraprint_circle_members where circle_id = p_circle_id;
  if v_member_count < 3 then
    raise exception 'Circle requires at least 3 members before reveal.' using errcode = '22023';
  end if;
  if v_member_count > 10 then
    raise exception 'Circle cannot exceed 10 members.' using errcode = '22023';
  end if;
  if exists (
    select 1 from eraprint_circle_members cm
    join eraprint_snapshots s on s.id = cm.snapshot_id
    where cm.circle_id = p_circle_id and s.scoring_version <> v_circle.scoring_version
  ) then
    raise exception 'Circle members use incompatible scoring versions.' using errcode = '22023';
  end if;
  if exists (
    select 1 from eraprint_circle_members cm
    where cm.circle_id = p_circle_id
      and (select count(*) from eraprint_trait_scores t where t.snapshot_id = cm.snapshot_id) <> 8
  ) then
    raise exception 'Every Circle member must contain eight persisted traits.' using errcode = '22023';
  end if;
  if exists (
    select 1 from eraprint_circle_members cm
    join eraprint_snapshots s on s.id = cm.snapshot_id
    where cm.circle_id = p_circle_id and jsonb_array_length(s.era_blend) <> 12
  ) then
    raise exception 'Every Circle member must contain all twelve Era percentages.' using errcode = '22023';
  end if;

  with stats as (
    select t.trait_code,
      avg(t.score)::numeric as score,
      stddev_pop(t.score)::numeric as deviation,
      array_position(array['ROM','EMO','NOS','AUT','REF','ESC','SOC','GRD'], t.trait_code) as ordering
    from eraprint_circle_members cm
    join eraprint_trait_scores t on t.snapshot_id = cm.snapshot_id
    where cm.circle_id = p_circle_id
    group by t.trait_code
  )
  select
    (select jsonb_agg(jsonb_build_object('code', trait_code, 'score', score, 'standardDeviation', deviation) order by ordering) from stats),
    (select jsonb_agg(jsonb_build_object('code', trait_code, 'score', score, 'standardDeviation', deviation) order by abs(score - 50) desc, ordering)
      from (select * from stats order by abs(score - 50) desc, ordering limit 3) strongest),
    (select jsonb_build_object('code', trait_code, 'score', score, 'standardDeviation', deviation) from stats order by deviation, ordering limit 1),
    (select jsonb_build_object('code', trait_code, 'score', score, 'standardDeviation', deviation) from stats order by deviation desc, ordering limit 1)
  into v_traits, v_strongest, v_united, v_different;

  with era_stats as (
    select item->>'code' as code,
      max(item->>'name') as name,
      avg((item->>'percentage')::numeric)::numeric as percentage,
      array_position(array['DEBUT','FEARLESS','SPEAK_NOW','RED','1989','REPUTATION','LOVER','FOLKLORE','EVERMORE','MIDNIGHTS','TTPD','SHOWGIRL'], item->>'code') as ordering
    from eraprint_circle_members cm
    join eraprint_snapshots s on s.id = cm.snapshot_id
    cross join lateral jsonb_array_elements(s.era_blend) item
    where cm.circle_id = p_circle_id
    group by item->>'code'
  ), ranked as (
    select * from era_stats order by percentage desc, ordering
  )
  select
    (select jsonb_agg(jsonb_build_object('code', code, 'name', name, 'percentage', percentage, 'distance', 0) order by percentage desc, ordering) from ranked),
    (select code from era_stats order by percentage desc, ordering offset 0 limit 1),
    (select code from era_stats order by percentage desc, ordering offset 1 limit 1),
    (select code from era_stats order by percentage desc, ordering offset 2 limit 1)
  into v_era_blend, v_primary, v_secondary, v_hidden;

  select coalesce(jsonb_agg(jsonb_build_object(
    'snapshotId', s.id,
    'archetype', s.archetype,
    'primaryEra', (select item from jsonb_array_elements(s.era_blend) item where item->>'code' = s.primary_era_code limit 1),
    'secondaryEra', (select item from jsonb_array_elements(s.era_blend) item where item->>'code' = s.secondary_era_code limit 1),
    'hiddenEra', (select item from jsonb_array_elements(s.era_blend) item where item->>'code' = s.hidden_era_code limit 1)
  ) order by cm.joined_at, cm.id), '[]'::jsonb)
  into v_members
  from eraprint_circle_members cm
  join eraprint_snapshots s on s.id = cm.snapshot_id
  where cm.circle_id = p_circle_id;

  insert into eraprint_circle_results (
    circle_id, circle_version, scoring_version, member_count,
    primary_era_code, secondary_era_code, hidden_era_code,
    averaged_traits, averaged_era_blend, strongest_signals,
    most_united_trait, most_different_trait, member_results
  ) values (
    p_circle_id, 'CIRCLE_V1', v_circle.scoring_version, v_member_count,
    v_primary, v_secondary, v_hidden,
    v_traits, v_era_blend, v_strongest,
    v_united, v_different, v_members
  ) on conflict (circle_id) do nothing
  returning id into v_result_id;

  if v_result_id is null then
    select id into v_result_id from eraprint_circle_results where circle_id = p_circle_id;
  end if;

  update eraprint_circles
  set status = 'FINALIZED', result_id = v_result_id, finalized_at = now()
  where id = p_circle_id;

  return v_result_id;
end;
$$;

create or replace function public.get_public_eraprint_circle_result(p_result_id uuid)
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
    'members', r.member_results,
    'createdAt', r.created_at
  )
  from eraprint_circle_results r
  where r.id = p_result_id;
$$;

revoke all on public.eraprint_circles, public.eraprint_circle_members, public.eraprint_circle_results from anon, authenticated;
revoke all on function public.create_eraprint_circle(uuid) from public, anon;
revoke all on function public.get_public_eraprint_circle(uuid) from public;
revoke all on function public.get_eraprint_circle_participant_state(uuid) from public, anon;
revoke all on function public.join_eraprint_circle(uuid, uuid) from public, anon;
revoke all on function public.finalize_eraprint_circle(uuid) from public, anon;
revoke all on function public.get_public_eraprint_circle_result(uuid) from public;

grant execute on function public.create_eraprint_circle(uuid) to authenticated;
grant execute on function public.get_public_eraprint_circle(uuid) to anon, authenticated;
grant execute on function public.get_eraprint_circle_participant_state(uuid) to authenticated;
grant execute on function public.join_eraprint_circle(uuid, uuid) to authenticated;
grant execute on function public.finalize_eraprint_circle(uuid) to authenticated;
grant execute on function public.get_public_eraprint_circle_result(uuid) to anon, authenticated;
