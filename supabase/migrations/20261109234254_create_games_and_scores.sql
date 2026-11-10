create table public.games (
  id                text primary key check (id ~ '^[a-z0-9-]+$'),
  title             text not null,
  short_description text not null,
  long_description  text not null,
  category          text not null check (category in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover             text not null,
  color             text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id) on delete cascade,
  player_name text not null check (player_name ~ '^[A-Z0-9_]{1,10}$'),
  score       integer not null check (score between 0 and 10000000),
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc, created_at);

-- Mejor marca por nombre. En empate gana quien llegó antes.
create view public.leaderboard with (security_invoker = true) as
select game_id, player_name, score, achieved_at,
       row_number() over (partition by game_id order by score desc, achieved_at asc) as rank
from (
  select distinct on (game_id, player_name)
         game_id, player_name, score, created_at as achieved_at
  from public.scores
  order by game_id, player_name, score desc, created_at asc
) best;

create view public.game_stats with (security_invoker = true) as
select g.id as game_id,
       coalesce(max(s.score), 0) as best,
       count(s.id)               as plays
from public.games g
left join public.scores s on s.game_id = g.id
group by g.id;

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games: lectura pública"  on public.games  for select to anon, authenticated using (true);
create policy "scores: lectura pública" on public.scores for select to anon, authenticated using (true);
create policy "scores: insert anónimo"  on public.scores for insert to anon, authenticated with check (true);
-- Sin políticas de update ni delete: quedan denegados.

grant select on public.games, public.scores, public.leaderboard, public.game_stats to anon, authenticated;
grant insert (game_id, player_name, score) on public.scores to anon, authenticated;

insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values (
  'asteroides',
  'ASTEROIDES',
  'Rota, propulsa y parte las rocas en pedazos.',
  'Tu nave flota a la deriva en un campo de rocas. Gira, enciende el propulsor y dispara: cada roca grande se parte en dos medianas y cada mediana en dos pequeñas. Atrapa el power-up 3x para disparar en abanico durante cinco segundos. Limpia el campo y llega otro con más rocas.',
  'SHOOTER',
  'cover-asteroides',
  'cyan',
  1
);
