do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'photo_wall_states'
  ) then
    alter publication supabase_realtime add table public.photo_wall_states;
  end if;
end
$$;
