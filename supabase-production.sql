-- BetSocial Sprint 20 — complementos de produção
-- Execute após supabase-schema.sql.

-- Índices para as consultas mais frequentes.
create index if not exists posts_created_at_desc on public.posts(created_at desc);
create index if not exists users_name_lower on public.users(lower(name));
create index if not exists users_handle_lower on public.users(lower(handle));

-- Storage para avatars. O backend deve usar SUPABASE_SERVICE_ROLE_KEY; nunca exponha essa chave ao browser.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- RLS defensivo para acesso direto pelo cliente. O servidor BetSocial usa service_role e continua funcionando.
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');

-- Políticas básicas para impedir escrita anônima no Storage.
drop policy if exists "avatars_no_anon_insert" on storage.objects;
create policy "avatars_no_anon_insert" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');
drop policy if exists "avatars_no_anon_update" on storage.objects;
create policy "avatars_no_anon_update" on storage.objects for update to authenticated using (bucket_id = 'avatars') with check (bucket_id = 'avatars');
drop policy if exists "avatars_no_anon_delete" on storage.objects;
create policy "avatars_no_anon_delete" on storage.objects for delete to authenticated using (bucket_id = 'avatars');
