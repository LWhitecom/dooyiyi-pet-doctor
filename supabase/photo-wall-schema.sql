create table if not exists public.photo_wall_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  photos jsonb not null default '[]'::jsonb,
  stickers jsonb not null default '[]'::jsonb,
  profile_photo jsonb,
  finale_cards jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.photo_wall_states enable row level security;

create policy "Users read their own wall" on public.photo_wall_states for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users insert their own wall" on public.photo_wall_states for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own wall" on public.photo_wall_states for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wall-media', 'wall-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users read their own wall images" on storage.objects for select to authenticated using (bucket_id = 'wall-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users upload their own wall images" on storage.objects for insert to authenticated with check (bucket_id = 'wall-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Users delete their own wall images" on storage.objects for delete to authenticated using (bucket_id = 'wall-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
