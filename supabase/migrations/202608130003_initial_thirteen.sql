-- New initial EraPrints contain 13 answers. Keep the existing >= 8 constraint
-- so historical eight-answer snapshots remain valid and immutable.
alter table public.eraprint_snapshots
  alter column answer_count set default 13;
