-- EraPrint pre-production transactional-data cleanup
--
-- REVIEW THIS FILE BEFORE RUNNING IT MANUALLY IN THE SUPABASE SQL EDITOR.
-- This script intentionally does not touch auth.users. See the repository
-- documentation/cleanup handoff for the separate anonymous-auth consideration.
--
-- REFERENCE / SYSTEM TABLES (preserved):
--   traits, eras, era_trait_profiles, questions, question_choices,
--   choice_trait_effects
--
-- USER / TRANSACTIONAL TABLES (emptied):
--   profiles, game_sessions, answers, eraprint_snapshots,
--   eraprint_trait_scores, eraprint_snapshot_answers,
--   eraprint_match_invites, eraprint_matches,
--   eraprint_circles, eraprint_circle_members, eraprint_circle_results

-- ---------------------------------------------------------------------------
-- PREVIEW: run this block by itself first if you only want to inspect counts.
-- ---------------------------------------------------------------------------
select 'answers' as table_name, count(*) as rows_to_delete from public.answers
union all select 'eraprint_circle_members', count(*) from public.eraprint_circle_members
union all select 'eraprint_circle_results', count(*) from public.eraprint_circle_results
union all select 'eraprint_circles', count(*) from public.eraprint_circles
union all select 'eraprint_match_invites', count(*) from public.eraprint_match_invites
union all select 'eraprint_matches', count(*) from public.eraprint_matches
union all select 'eraprint_snapshot_answers', count(*) from public.eraprint_snapshot_answers
union all select 'eraprint_snapshots', count(*) from public.eraprint_snapshots
union all select 'eraprint_trait_scores', count(*) from public.eraprint_trait_scores
union all select 'game_sessions', count(*) from public.game_sessions
union all select 'profiles', count(*) from public.profiles
order by table_name;

-- Reference counts before cleanup. These are never deletion targets below.
select 'choice_trait_effects' as table_name, count(*) as preserved_rows from public.choice_trait_effects
union all select 'era_trait_profiles', count(*) from public.era_trait_profiles
union all select 'eras', count(*) from public.eras
union all select 'question_choices', count(*) from public.question_choices
union all select 'questions', count(*) from public.questions
union all select 'traits', count(*) from public.traits
order by table_name;

begin;

-- Stop before any DELETE if this database does not contain the exact catalog
-- represented by the current supabase/seed.sql. A raised exception rolls back
-- the transaction.
do $$
begin
  if (select count(*) from public.questions) <> 30 then
    raise exception 'Safety check failed: expected 30 questions.';
  end if;
  if (select count(*) from public.question_choices) <> 98 then
    raise exception 'Safety check failed: expected 98 question choices.';
  end if;
  if (select count(*) from public.choice_trait_effects) <> 220 then
    raise exception 'Safety check failed: expected 220 choice trait effects.';
  end if;
  if (select count(*) from public.eras) <> 12 then
    raise exception 'Safety check failed: expected 12 Era definitions.';
  end if;
  if (select count(*) from public.traits) <> 8 then
    raise exception 'Safety check failed: expected 8 trait definitions.';
  end if;
  if (select count(*) from public.era_trait_profiles) <> 96 then
    raise exception 'Safety check failed: expected 96 Era/trait profile rows.';
  end if;
end
$$;

-- Circle children must be removed before circles because result/member FKs use
-- ON DELETE RESTRICT. Deleting results also clears circles.result_id through
-- its ON DELETE SET NULL relationship.
delete from public.eraprint_circle_members;
delete from public.eraprint_circle_results;
delete from public.eraprint_circles;

-- Matches must precede invites because matches.invite_id uses ON DELETE
-- RESTRICT. Deleting matches clears invites.match_id via ON DELETE SET NULL.
delete from public.eraprint_matches;
delete from public.eraprint_match_invites;

-- Snapshot-owned evidence is removed explicitly even though these two FKs also
-- use ON DELETE CASCADE.
delete from public.eraprint_snapshot_answers;
delete from public.eraprint_trait_scores;

-- Session answers and sessions precede snapshots because resumable refinement
-- sessions reference their immutable base snapshot with ON DELETE RESTRICT.
delete from public.answers;
delete from public.game_sessions;

-- Living EraPrint snapshots form a self-referencing immutable history chain
-- with ON DELETE RESTRICT. Detach only that transactional history link before
-- deleting every snapshot; no result values or reference data are modified.
update public.eraprint_snapshots
set previous_snapshot_id = null
where previous_snapshot_id is not null;

delete from public.eraprint_snapshots;
delete from public.profiles;

-- ---------------------------------------------------------------------------
-- POST-CLEAN VERIFICATION (returned before COMMIT by the SQL Editor).
-- Every transactional count must be zero.
-- ---------------------------------------------------------------------------
select 'answers' as table_name, count(*) as remaining_rows from public.answers
union all select 'eraprint_circle_members', count(*) from public.eraprint_circle_members
union all select 'eraprint_circle_results', count(*) from public.eraprint_circle_results
union all select 'eraprint_circles', count(*) from public.eraprint_circles
union all select 'eraprint_match_invites', count(*) from public.eraprint_match_invites
union all select 'eraprint_matches', count(*) from public.eraprint_matches
union all select 'eraprint_snapshot_answers', count(*) from public.eraprint_snapshot_answers
union all select 'eraprint_snapshots', count(*) from public.eraprint_snapshots
union all select 'eraprint_trait_scores', count(*) from public.eraprint_trait_scores
union all select 'game_sessions', count(*) from public.game_sessions
union all select 'profiles', count(*) from public.profiles
order by table_name;

-- Expected current reference counts: 30 questions, 98 choices, 220 hidden
-- effects, 12 Eras, 8 traits, and 96 Era/trait profile rows.
select 'choice_trait_effects' as table_name, count(*) as preserved_rows, count(*) = 220 as expected
from public.choice_trait_effects
union all select 'era_trait_profiles', count(*), count(*) = 96 from public.era_trait_profiles
union all select 'eras', count(*), count(*) = 12 from public.eras
union all select 'question_choices', count(*), count(*) = 98 from public.question_choices
union all select 'questions', count(*), count(*) = 30 from public.questions
union all select 'traits', count(*), count(*) = 8 from public.traits
order by table_name;

-- Structural catalog checks: all choices belong to a question, every choice
-- has at least one hidden effect, and every Era has all eight trait vectors.
select
  (select count(*) from public.questions where active) = 30 as all_questions_active,
  not exists (
    select 1
    from public.question_choices c
    left join public.questions q on q.id = c.question_id
    where q.id is null
  ) as all_choices_have_questions,
  not exists (
    select 1
    from public.question_choices c
    where not exists (
      select 1 from public.choice_trait_effects e where e.choice_id = c.id
    )
  ) as all_choices_have_effects,
  not exists (
    select 1
    from public.eras e
    where (select count(*) from public.era_trait_profiles p where p.era_code = e.code) <> 8
  ) as every_era_has_eight_traits;

commit;
