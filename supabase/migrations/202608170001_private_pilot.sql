create table if not exists public.pilot_results (
  pilot_identifier uuid primary key,
  selected_choice_ids jsonb not null,
  answered_count smallint not null check (answered_count = 13),
  public_trait_scores jsonb not null,
  hidden_scores jsonb not null,
  primary_era_code text not null,
  secondary_era_code text not null,
  hidden_era_code text not null,
  era_blend jsonb not null,
  scoring_version text not null,
  fit_score smallint check (fit_score between 1 and 5),
  top_three_fit boolean,
  preferred_era_code text,
  feedback_comment varchar(500),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check ((completed_at is null) or (fit_score is not null and top_three_fit is not null))
);
alter table public.pilot_results enable row level security;
revoke all on public.pilot_results from anon, authenticated;
create index if not exists pilot_results_completed_at_idx on public.pilot_results(completed_at desc);
