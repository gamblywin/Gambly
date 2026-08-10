-- GAMBLY Sprint 24 — Comunidades e organização de grupos
-- Execute no Supabase SQL Editor uma vez antes de usar comunidades em produção.

create table if not exists public.communities (
  id text primary key,
  name text not null,
  description text default '',
  owner_id text not null,
  members jsonb not null default '[]'::jsonb,
  pending jsonb not null default '[]'::jsonb,
  posts jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{"joinMode":"auto","postingMode":"all"}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.groups
  add column if not exists pending jsonb not null default '[]'::jsonb;

alter table public.groups
  add column if not exists settings jsonb not null default '{"joinMode":"invite","postingMode":"all"}'::jsonb;

create index if not exists communities_name_idx on public.communities (lower(name));
