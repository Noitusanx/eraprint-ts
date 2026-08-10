create table public.eraprint_match_invites (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  owner_snapshot_id uuid not null references public.eraprint_snapshots(id) on delete cascade,
  completed_snapshot_id uuid references public.eraprint_snapshots(id) on delete set null,
  status text not null default 'OPEN' check (status in ('OPEN', 'COMPLETED', 'EXPIRED')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (completed_snapshot_id is null or completed_snapshot_id <> owner_snapshot_id)
);

create table public.eraprint_matches (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null unique references public.eraprint_match_invites(id) on delete restrict,
  snapshot_a_id uuid not null references public.eraprint_snapshots(id) on delete restrict,
  snapshot_b_id uuid not null references public.eraprint_snapshots(id) on delete restrict,
  trait_similarity numeric(5,2) not null check (trait_similarity between 0 and 100),
  era_similarity numeric(5,2) not null check (era_similarity between 0 and 100),
  match_score numeric(5,2) not null check (match_score between 0 and 100),
  match_version text not null check (match_version = 'MATCH_V1'),
  most_in_sync jsonb not null,
  biggest_contrast jsonb not null,
  shared_era jsonb not null,
  profile_a_result jsonb not null,
  profile_b_result jsonb not null,
  created_at timestamptz not null default now(),
  check (snapshot_a_id <> snapshot_b_id)
);

alter table public.eraprint_match_invites
  add column match_id uuid unique references public.eraprint_matches(id) on delete set null;

create index idx_match_invites_owner on public.eraprint_match_invites(owner_profile_id, created_at desc);
create index idx_match_invites_expiry on public.eraprint_match_invites(status, expires_at);
create index idx_matches_snapshots on public.eraprint_matches(snapshot_a_id, snapshot_b_id);

alter table public.eraprint_match_invites enable row level security;
alter table public.eraprint_matches enable row level security;

-- Tables are deliberately not granted to browser roles. Every read/write crosses
-- a narrow function boundary; no private-table SELECT policy is globally true.

create or replace function public.create_eraprint_match_invite(p_snapshot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from eraprint_snapshots
    where id = p_snapshot_id and profile_id = v_user_id
  ) then
    raise exception 'Snapshot not found or not owned by this session.' using errcode = '42501';
  end if;

  insert into eraprint_match_invites (owner_profile_id, owner_snapshot_id)
  values (v_user_id, p_snapshot_id)
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;

create or replace function public.get_my_latest_eraprint_snapshot()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id
  from eraprint_snapshots
  where profile_id = auth.uid()
  order by created_at desc
  limit 1;
$$;

create or replace function public.get_public_eraprint_match_invite(p_invite_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'inviteId', i.id,
    'status', case
      when i.status = 'OPEN' and i.expires_at <= now() then 'EXPIRED'
      else i.status
    end,
    'expiresAt', i.expires_at,
    'matchId', i.match_id,
    'owner', json_build_object(
      'archetype', s.archetype,
      'primaryEra', json_build_object(
        'code', s.primary_era_code,
        'name', coalesce(
          (select item->>'name' from jsonb_array_elements(s.era_blend) item where item->>'code' = s.primary_era_code limit 1),
          s.primary_era_code
        )
      ),
      'secondaryEra', json_build_object(
        'code', s.secondary_era_code,
        'name', coalesce(
          (select item->>'name' from jsonb_array_elements(s.era_blend) item where item->>'code' = s.secondary_era_code limit 1),
          s.secondary_era_code
        )
      )
    )
  )
  from eraprint_match_invites i
  join eraprint_snapshots s on s.id = i.owner_snapshot_id
  where i.id = p_invite_id;
$$;

create or replace function public.complete_eraprint_match_invite(
  p_invite_id uuid,
  p_joiner_snapshot_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite eraprint_match_invites%rowtype;
  v_trait_similarity numeric;
  v_era_similarity numeric;
  v_match_score numeric;
  v_most_in_sync jsonb;
  v_biggest_contrast jsonb;
  v_shared_era jsonb;
  v_profile_a jsonb;
  v_profile_b jsonb;
  v_match_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into v_invite
  from eraprint_match_invites
  where id = p_invite_id
  for update;

  if not found then
    raise exception 'Match invite not found.' using errcode = 'P0002';
  end if;

  if v_invite.status = 'COMPLETED' and v_invite.match_id is not null then
    return v_invite.match_id;
  end if;

  if v_invite.status = 'EXPIRED' or v_invite.expires_at <= now() then
    update eraprint_match_invites set status = 'EXPIRED' where id = p_invite_id;
    raise exception 'This match invite has expired.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from eraprint_snapshots
    where id = p_joiner_snapshot_id and profile_id = v_user_id
  ) then
    raise exception 'Joining snapshot not found or not owned by this session.' using errcode = '42501';
  end if;

  if v_invite.owner_snapshot_id = p_joiner_snapshot_id then
    raise exception 'An EraPrint cannot match with itself.' using errcode = '22023';
  end if;

  if (select count(*) from eraprint_trait_scores where snapshot_id = v_invite.owner_snapshot_id) <> 8
     or (select count(*) from eraprint_trait_scores where snapshot_id = p_joiner_snapshot_id) <> 8 then
    raise exception 'Both snapshots must contain eight persisted traits.' using errcode = '22023';
  end if;

  with pairs as (
    select a.trait_code,
      a.score::numeric as score_a,
      b.score::numeric as score_b,
      abs(a.score - b.score)::numeric as difference,
      (100 - abs(a.score - b.score))::numeric as similarity
    from eraprint_trait_scores a
    join eraprint_trait_scores b on b.trait_code = a.trait_code
    where a.snapshot_id = v_invite.owner_snapshot_id
      and b.snapshot_id = p_joiner_snapshot_id
  )
  select
    round(greatest(0, least(100, 100 * (1 - sqrt(avg(power((score_a - score_b) / 100, 2))))))::numeric, 2),
    (select jsonb_agg(jsonb_build_object(
      'code', trait_code,
      'scoreA', score_a,
      'scoreB', score_b,
      'difference', round(difference, 2),
      'similarity', round(greatest(0, least(100, similarity)), 2)
    ) order by similarity desc, array_position(array['ROM','EMO','NOS','AUT','REF','ESC','SOC','GRD'], trait_code))
      from (select * from pairs order by similarity desc, array_position(array['ROM','EMO','NOS','AUT','REF','ESC','SOC','GRD'], trait_code) limit 2) top_two),
    (select jsonb_build_object(
      'code', trait_code,
      'scoreA', score_a,
      'scoreB', score_b,
      'difference', round(difference, 2),
      'similarity', round(greatest(0, least(100, similarity)), 2)
    ) from pairs order by difference desc, array_position(array['ROM','EMO','NOS','AUT','REF','ESC','SOC','GRD'], trait_code) limit 1)
  into v_trait_similarity, v_most_in_sync, v_biggest_contrast
  from pairs;

  with a as (
    select item->>'code' as code, item->>'name' as name, (item->>'percentage')::numeric as percentage
    from eraprint_snapshots s, jsonb_array_elements(s.era_blend) item
    where s.id = v_invite.owner_snapshot_id
  ), b as (
    select item->>'code' as code, item->>'name' as name, (item->>'percentage')::numeric as percentage
    from eraprint_snapshots s, jsonb_array_elements(s.era_blend) item
    where s.id = p_joiner_snapshot_id
  ), shared as (
    select a.code, coalesce(a.name, b.name, a.code) as name,
      a.percentage as percentage_a, b.percentage as percentage_b,
      least(a.percentage, b.percentage) as strength
    from a join b using (code)
  )
  select
    round(greatest(0, least(100, sum(strength)))::numeric, 2),
    (select jsonb_build_object(
      'code', code,
      'name', name,
      'strength', round(strength, 2),
      'percentageA', percentage_a,
      'percentageB', percentage_b
    ) from shared order by strength desc, code limit 1)
  into v_era_similarity, v_shared_era
  from shared;

  v_match_score := round(greatest(0, least(100,
    0.70 * v_trait_similarity + 0.30 * v_era_similarity
  ))::numeric, 2);

  select jsonb_build_object(
    'archetype', s.archetype,
    'primaryEra', (select item from jsonb_array_elements(s.era_blend) item where item->>'code' = s.primary_era_code limit 1),
    'secondaryEra', (select item from jsonb_array_elements(s.era_blend) item where item->>'code' = s.secondary_era_code limit 1),
    'hiddenEra', (select item from jsonb_array_elements(s.era_blend) item where item->>'code' = s.hidden_era_code limit 1),
    'traitScores', (select jsonb_object_agg(t.trait_code, t.score) from eraprint_trait_scores t where t.snapshot_id = s.id),
    'eraBlend', s.era_blend
  ) into v_profile_a
  from eraprint_snapshots s where s.id = v_invite.owner_snapshot_id;

  select jsonb_build_object(
    'archetype', s.archetype,
    'primaryEra', (select item from jsonb_array_elements(s.era_blend) item where item->>'code' = s.primary_era_code limit 1),
    'secondaryEra', (select item from jsonb_array_elements(s.era_blend) item where item->>'code' = s.secondary_era_code limit 1),
    'hiddenEra', (select item from jsonb_array_elements(s.era_blend) item where item->>'code' = s.hidden_era_code limit 1),
    'traitScores', (select jsonb_object_agg(t.trait_code, t.score) from eraprint_trait_scores t where t.snapshot_id = s.id),
    'eraBlend', s.era_blend
  ) into v_profile_b
  from eraprint_snapshots s where s.id = p_joiner_snapshot_id;

  insert into eraprint_matches (
    invite_id, snapshot_a_id, snapshot_b_id,
    trait_similarity, era_similarity, match_score, match_version,
    most_in_sync, biggest_contrast, shared_era,
    profile_a_result, profile_b_result
  ) values (
    p_invite_id, v_invite.owner_snapshot_id, p_joiner_snapshot_id,
    v_trait_similarity, v_era_similarity, v_match_score, 'MATCH_V1',
    v_most_in_sync, v_biggest_contrast, v_shared_era,
    v_profile_a, v_profile_b
  )
  on conflict (invite_id) do nothing
  returning id into v_match_id;

  if v_match_id is null then
    select id into v_match_id from eraprint_matches where invite_id = p_invite_id;
  end if;

  update eraprint_match_invites
  set status = 'COMPLETED', completed_snapshot_id = p_joiner_snapshot_id,
      match_id = v_match_id, completed_at = now()
  where id = p_invite_id;

  return v_match_id;
end;
$$;

create or replace function public.get_public_eraprint_match_result(p_match_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'matchId', m.id,
    'traitSimilarity', m.trait_similarity,
    'eraSimilarity', m.era_similarity,
    'matchScore', m.match_score,
    'matchVersion', m.match_version,
    'mostInSync', m.most_in_sync,
    'biggestContrast', m.biggest_contrast,
    'sharedEra', m.shared_era,
    'profileA', m.profile_a_result,
    'profileB', m.profile_b_result,
    'createdAt', m.created_at
  )
  from eraprint_matches m
  where m.id = p_match_id;
$$;

revoke all on public.eraprint_match_invites, public.eraprint_matches from anon, authenticated;

revoke all on function public.create_eraprint_match_invite(uuid) from public, anon;
revoke all on function public.get_my_latest_eraprint_snapshot() from public, anon;
revoke all on function public.complete_eraprint_match_invite(uuid, uuid) from public, anon;
revoke all on function public.get_public_eraprint_match_invite(uuid) from public;
revoke all on function public.get_public_eraprint_match_result(uuid) from public;

grant execute on function public.create_eraprint_match_invite(uuid) to authenticated;
grant execute on function public.get_my_latest_eraprint_snapshot() to authenticated;
grant execute on function public.complete_eraprint_match_invite(uuid, uuid) to authenticated;
grant execute on function public.get_public_eraprint_match_invite(uuid) to anon, authenticated;
grant execute on function public.get_public_eraprint_match_result(uuid) to anon, authenticated;
