-- Privacy-safe ownership check for controls on a public personal result.

create or replace function public.is_eraprint_snapshot_owned_by_viewer(
  p_snapshot_id uuid
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from eraprint_snapshots s
    where s.id = p_snapshot_id
      and s.profile_id = auth.uid()
  );
$$;

revoke all on function public.is_eraprint_snapshot_owned_by_viewer(uuid)
  from public, anon;
grant execute on function public.is_eraprint_snapshot_owned_by_viewer(uuid)
  to authenticated;
