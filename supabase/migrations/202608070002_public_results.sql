create or replace function get_public_eraprint_result(p_snapshot_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'snapshotId', s.id,
    'scoringVersion', s.scoring_version,
    'primaryEraCode', s.primary_era_code,
    'secondaryEraCode', s.secondary_era_code,
    'hiddenEraCode', s.hidden_era_code,
    'archetype', s.archetype,
    'clarity', s.clarity,
    'fingerprintCode', s.fingerprint_code,
    'eraBlend', s.era_blend,
    'traits', (
      select json_agg(
        json_build_object(
          'traitCode', t.trait_code,
          'score', t.score,
          'evidenceCount', t.evidence_count,
          'totalEffect', t.total_effect,
          'reliability', t.reliability
        )
      )
      from eraprint_trait_scores t
      where t.snapshot_id = s.id
    )
  )
  from eraprint_snapshots s
  where s.id = p_snapshot_id;
$$;
