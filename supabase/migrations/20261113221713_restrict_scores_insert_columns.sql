-- SPEC 17: INSERT por columna en scores. Supabase concede INSERT de tabla por defecto,
-- y eso anulaba los grants por columna de SPEC 06 y 14 (created_at e id eran insertables).
revoke insert on public.scores from anon, authenticated;
grant insert (game_id, player_name, score, user_id) on public.scores to anon, authenticated;
