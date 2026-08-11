-- =========================================================
-- GAMBLY MVP V2 — Supabase/PostgreSQL
-- Baseado nos requisitos do MVP:
-- cadastro, login, perfil, feed, palpites, likes, comentários,
-- follows, visualização de palpites, ranking, histórico e estatísticas.
--
-- IMPORTANTE:
-- A autenticação existente do MVP usa a API do GAMBLY.
-- A migração para Supabase Auth puro fica para a etapa seguinte.
-- Nunca armazene a SUPABASE_SERVICE_ROLE_KEY no navegador.
-- =========================================================

create extension if not exists pgcrypto;

-- Usuários compatíveis com a API atual.
create table if not exists public.users (
  id text primary key,
  username varchar(30),
  name varchar(100) not null,
  handle varchar(30) not null unique,
  email varchar(255) not null unique,
  password text not null,
  bio varchar(280) default '',
  avatar text default '',
  premium boolean default false,
  followers integer not null default 0,
  following integer not null default 0,
  posts integer not null default 0,
  win_rate numeric(6,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sports (
  id text primary key,
  name varchar(50) not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.leagues (
  id text primary key,
  sport_id text not null references public.sports(id) on delete restrict,
  name varchar(100) not null,
  country varchar(100),
  created_at timestamptz not null default now(),
  unique(sport_id,name)
);

create table if not exists public.teams (
  id text primary key,
  name varchar(100) not null,
  short_name varchar(30),
  logo_url text,
  created_at timestamptz not null default now()
);

do $$ begin
  create type event_status as enum ('scheduled','live','finished','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prediction_type as enum ('winner','draw','over_under','both_teams_score','exact_score');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prediction_result as enum ('pending','won','lost','void');
exception when duplicate_object then null; end $$;

create table if not exists public.events (
  id text primary key,
  sport_id text not null references public.sports(id) on delete restrict,
  league_id text references public.leagues(id) on delete set null,
  home_team_id text not null references public.teams(id) on delete restrict,
  away_team_id text not null references public.teams(id) on delete restrict,
  start_time timestamptz not null,
  status event_status not null default 'scheduled',
  home_score integer,
  away_score integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(home_team_id <> away_team_id),
  check(home_score is null or home_score >= 0),
  check(away_score is null or away_score >= 0)
);

create table if not exists public.predictions (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  event_id text not null references public.events(id) on delete cascade,
  type prediction_type not null,
  selection varchar(100) not null,
  odds numeric(8,2),
  result prediction_result not null default 'pending',
  created_at timestamptz not null default now(),
  check(odds is null or odds > 0)
);

create table if not exists public.posts (
  id text primary key,
  author_id text not null references public.users(id) on delete cascade,
  type text,
  title varchar(200),
  text text default '',
  market varchar(100),
  odd numeric(8,2) default 0,
  stake numeric(10,2) default 0,
  confidence integer default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  liked_by jsonb not null default '[]'::jsonb,
  prediction_id text references public.predictions(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id text primary key,
  post_id text not null references public.posts(id) on delete cascade,
  author_id text not null references public.users(id) on delete cascade,
  author text default '',
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  id text primary key,
  follower_id text not null references public.users(id) on delete cascade,
  following_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(follower_id,following_id),
  check(follower_id <> following_id)
);

create table if not exists public.notifications (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  text text not null,
  kind text default 'interaction',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  "from" text not null references public.users(id) on delete cascade,
  to_user text not null references public.users(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

-- Histórico é a própria tabela predictions.
-- Estatísticas e ranking são calculados por views, evitando duplicação.
create or replace view public.user_prediction_stats as
select
  u.id as user_id,
  u.name,
  u.handle,
  count(p.id)::integer as total,
  count(*) filter (where p.result='won')::integer as won,
  count(*) filter (where p.result='lost')::integer as lost,
  count(*) filter (where p.result='pending')::integer as pending,
  case when count(*) filter (where p.result in ('won','lost')) = 0 then 0
       else round(100.0 * count(*) filter (where p.result='won') /
                  count(*) filter (where p.result in ('won','lost')), 1) end as win_rate
from public.users u
left join public.predictions p on p.user_id=u.id
group by u.id,u.name,u.handle;

create or replace view public.gambly_ranking as
select
  row_number() over(order by s.win_rate desc, s.won desc, s.total desc) as rank,
  s.*
from public.user_prediction_stats s
where s.total > 0;

create index if not exists idx_predictions_user_created on public.predictions(user_id,created_at desc);
create index if not exists idx_predictions_event on public.predictions(event_id);
create index if not exists idx_predictions_result on public.predictions(result);
create index if not exists idx_events_start_status on public.events(start_time,status);
create index if not exists idx_posts_author_created on public.posts(author_id,created_at desc);
create index if not exists idx_comments_post_created on public.comments(post_id,created_at desc);
create index if not exists idx_follows_following on public.follows(following_id);
create index if not exists idx_notifications_user_created on public.notifications(user_id,created_at desc);

insert into public.sports(id,name) values
 ('sp_football','Futebol'),
 ('sp_basketball','Basquete'),
 ('sp_tennis','Tênis'),
 ('sp_volleyball','Vôlei')
on conflict (id) do nothing;

insert into public.leagues(id,sport_id,name,country) values
 ('lg_bra','sp_football','Campeonato Brasileiro','Brasil'),
 ('lg_lib','sp_football','CONMEBOL Libertadores','América do Sul')
on conflict (id) do nothing;

-- RLS: o backend usa service_role, que ignora RLS.
alter table public.users enable row level security;
alter table public.sports enable row level security;
alter table public.leagues enable row level security;
alter table public.teams enable row level security;
alter table public.events enable row level security;
alter table public.predictions enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;

-- Storage
insert into storage.buckets(id,name,public) values
 ('avatars','avatars',true),
 ('post-media','post-media',true)
on conflict(id) do update set public=true;
