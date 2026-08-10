create or replace function public.get_public_eraprint_match_result(p_match_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'matchId', m.id,
    'snapshotAId', m.snapshot_a_id,
    'snapshotBId', m.snapshot_b_id,
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

revoke all on function public.get_public_eraprint_match_result(uuid) from public;
grant execute on function public.get_public_eraprint_match_result(uuid) to anon, authenticated;
