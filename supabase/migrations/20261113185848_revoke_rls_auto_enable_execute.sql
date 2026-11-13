-- SPEC 16: rls_auto_enable() es la función del event trigger ensure_rls (activa RLS en
-- las tablas nuevas de public). Es SECURITY DEFINER y no debe ser invocable por RPC;
-- el trigger lo dispara Postgres, así que quitar EXECUTE a los roles de la API no le afecta.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
