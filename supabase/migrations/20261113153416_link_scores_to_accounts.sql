-- SPEC 14: puntuaciones vinculadas a la cuenta.
alter table public.scores
  add column user_id uuid null references auth.users(id) on delete set null;

create index scores_user_idx on public.scores (user_id) where user_id is not null;

-- Insert: invitado sin user_id, o la propia cuenta.
drop policy "scores: insert anónimo" on public.scores;
create policy "scores: insert propio o anónimo" on public.scores
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

-- Lectura pública sin user_id: fuera el SELECT de tabla y solo SELECT por columna.
revoke select on public.scores from anon, authenticated;
grant select (id, game_id, player_name, score, created_at) on public.scores to anon, authenticated;
grant insert (user_id) on public.scores to authenticated;

-- Leaderboard: mejor marca por cuenta (o por nombre si es invitado); expone has_account, no user_id.
drop view public.leaderboard;
create view public.leaderboard with (security_invoker = false) as
select game_id, player_name, score, achieved_at, has_account,
       row_number() over (partition by game_id order by score desc, achieved_at asc) as rank
from (
  select distinct on (game_id, coalesce(user_id::text, 'invitado:' || player_name))
         game_id, player_name, score, created_at as achieved_at,
         (user_id is not null) as has_account
  from public.scores
  order by game_id, coalesce(user_id::text, 'invitado:' || player_name), score desc, created_at asc
) best;
revoke all on public.leaderboard from anon, authenticated;
grant select on public.leaderboard to anon, authenticated;
