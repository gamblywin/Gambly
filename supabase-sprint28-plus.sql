-- GAMBLY Sprint 28+ — palpites múltiplos + auditoria da fonte do resultado
-- Executar DEPOIS de supabase-sprint28-settlement.sql

alter table public.events
  add column if not exists result_source varchar(80),
  add column if not exists result_source_version varchar(80),
  add column if not exists result_received_at timestamptz;

alter table public.predictions
  add column if not exists slip_id text;

create table if not exists public.prediction_slips (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  title varchar(120) not null default 'Palpite múltiplo',
  result prediction_result not null default 'pending',
  prediction_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'predictions_slip_fk') then
    alter table public.predictions
      add constraint predictions_slip_fk
      foreign key (slip_id) references public.prediction_slips(id) on delete set null;
  end if;
end $$;

create index if not exists idx_predictions_slip_id on public.predictions(slip_id);
create index if not exists idx_prediction_slips_user_created on public.prediction_slips(user_id,created_at desc);
create index if not exists idx_prediction_slips_result on public.prediction_slips(result);

comment on table public.prediction_slips is 'Agrupador social de duas ou mais seleções esportivas do mesmo usuário; não representa uma conta financeira.';
comment on column public.events.result_source is 'Origem declarada do resultado usado pelo GAMBLY.';
comment on column public.events.result_source_version is 'Versão/identificador do feed quando disponível.';
comment on column public.events.result_received_at is 'Momento em que o GAMBLY recebeu/registrou o resultado.';
comment on column public.predictions.slip_id is 'Agrupa a seleção em um palpite múltiplo.';

alter table public.prediction_slips enable row level security;


-- Publicações multimídia / publicação de jogo
alter table public.posts
  add column if not exists event_id text,
  add column if not exists prediction_id text,
  add column if not exists slip_id text,
  add column if not exists image text;

create index if not exists idx_posts_event_id on public.posts(event_id);
create index if not exists idx_posts_slip_id on public.posts(slip_id);
