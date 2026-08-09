-- BetSocial Sprint 9 — schema PostgreSQL/Supabase normalizado.
create table if not exists public.users (id text primary key,name text not null,handle text not null unique,email text not null unique,password text not null,bio text default '',followers integer default 0,following integer default 0,posts integer default 0,win_rate numeric default 0,avatar text default '',created_at timestamptz default now());
create table if not exists public.posts (id text primary key,author_id text not null references public.users(id) on delete cascade,type text,title text,text text default '',market text,odd numeric default 0,stake numeric default 0,confidence integer default 0,likes integer default 0,comments integer default 0,created_at timestamptz default now());
create table if not exists public.comments (id text primary key,post_id text not null references public.posts(id) on delete cascade,author_id text not null references public.users(id) on delete cascade,author text default '',text text not null,created_at timestamptz default now());
create table if not exists public.notifications (id text primary key,user_id text not null references public.users(id) on delete cascade,text text not null,kind text default 'interaction',read boolean default false,created_at timestamptz default now());
create table if not exists public.messages (id text primary key,"from" text not null references public.users(id) on delete cascade,to_user text not null references public.users(id) on delete cascade,text text not null,created_at timestamptz default now(),read boolean default false);
create table if not exists public.follows (id text primary key,follower_id text not null references public.users(id) on delete cascade,following_id text not null references public.users(id) on delete cascade,created_at timestamptz default now(),unique(follower_id,following_id));
create table if not exists public.reset_tokens (id text primary key,user_id text not null references public.users(id) on delete cascade,hash text not null,expires_at timestamptz not null,used boolean default false);
create index if not exists posts_author_created on public.posts(author_id,created_at desc);
create index if not exists comments_post_created on public.comments(post_id,created_at desc);
create index if not exists notifications_user_created on public.notifications(user_id,created_at desc);
create index if not exists messages_pair_created on public.messages("from",to_user,created_at desc);
create index if not exists follows_follower on public.follows(follower_id);
create index if not exists follows_following on public.follows(following_id);

alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.follows enable row level security;
alter table public.reset_tokens enable row level security;
