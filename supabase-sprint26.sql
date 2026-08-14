-- GAMBLY Sprint 26 — Supabase Production Foundation
-- Execute after supabase-schema.sql and existing production/migration SQL.

-- Performance
create index if not exists posts_author_created_at
  on public.posts(author_id, created_at desc);
create index if not exists notifications_user_created_at
  on public.notifications(user_id, created_at desc);
create index if not exists messages_conversation_created_at
  on public.messages(from_user, to_user, created_at desc);
create index if not exists follows_follower_following
  on public.follows(follower_id, following_id);

-- Profile link for the future Supabase Auth migration.
alter table public.users
  add column if not exists auth_user_id uuid unique;

-- Storage bucket for avatars and post media.
insert into storage.buckets (id, name, public)
values ('avatars','avatars',true)
on conflict (id) do update set public=true;

insert into storage.buckets (id, name, public)
values ('post-media','post-media',true)
on conflict (id) do update set public=true;

-- Safe public reads for published media.
drop policy if exists "gambly_public_avatar_read" on storage.objects;
create policy "gambly_public_avatar_read"
on storage.objects for select
using (bucket_id in ('avatars','post-media'));

-- Only authenticated Supabase users may write media directly.
drop policy if exists "gambly_authenticated_media_insert" on storage.objects;
create policy "gambly_authenticated_media_insert"
on storage.objects for insert to authenticated
with check (bucket_id in ('avatars','post-media'));

drop policy if exists "gambly_authenticated_media_update" on storage.objects;
create policy "gambly_authenticated_media_update"
on storage.objects for update to authenticated
using (bucket_id in ('avatars','post-media'))
with check (bucket_id in ('avatars','post-media'));

drop policy if exists "gambly_authenticated_media_delete" on storage.objects;
create policy "gambly_authenticated_media_delete"
on storage.objects for delete to authenticated
using (bucket_id in ('avatars','post-media'));

-- Realtime publication. Safe to execute repeatedly.
do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime') then
    begin alter publication supabase_realtime add table public.notifications; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.posts; exception when duplicate_object then null; end;
  end if;
end $$;

-- IMPORTANT:
-- The application server currently uses the service role for controlled writes.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY in NEXT_PUBLIC_* variables.
-- RLS policies for application tables should be added when direct browser writes
-- are enabled in the Supabase Auth migration.
