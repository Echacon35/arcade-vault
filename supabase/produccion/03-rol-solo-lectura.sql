-- Arcade Vault: rol de solo lectura para consultar producción por el pooler (Supavisor).
-- Ejecútalo en el SQL Editor de producción, una sola vez, después de 01-bootstrap.sql.
-- NO es una migración: solo aplica a prod y lleva una contraseña. No lo copies a supabase/migrations/
-- ni guardes aquí la clave real: sustitúyela solo en el editor y no guardes la query con ella.
--
-- Qué da:
--   - LOGIN con contraseña, sin superusuario ni creación de roles o bases.
--   - SELECT sobre todo public (games, scores, leaderboard, game_stats y lo que creen migraciones futuras).
--   - Transacciones read-only por defecto y límites de tiempo.
--   - BYPASSRLS: las políticas de lectura solo cubren anon/authenticated, así que sin él vería las
--     tablas vacías. No le permite escribir: lo que puede hacer lo limitan los GRANT (solo SELECT).
-- Qué NO da: acceso a auth (correos, identidades), storage ni ningún INSERT/UPDATE/DELETE.
--
-- Conexión (Connect → Connection pooling en el panel de prod):
--   postgresql://arcade_readonly.<ref-prod>:<CLAVE>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
--   5432 = modo sesión (recomendado para consultas); 6543 = modo transacción (sin SET de sesión).

begin;

do $$
declare
  -- Sustituye por una clave aleatoria de 32+ caracteres (p. ej. un generador de contraseñas).
  clave text := '<CLAVE>';
begin
  if clave = '<CLAVE>' or length(clave) < 24 then
    raise exception 'Pon una clave real de 24 o más caracteres en la variable "clave"';
  end if;
  if exists (select 1 from pg_roles where rolname = 'arcade_readonly') then
    raise exception 'El rol arcade_readonly ya existe. Para rotar la clave: alter role arcade_readonly password ''...'';';
  end if;
  execute format(
    'create role arcade_readonly with login password %L
       nosuperuser nocreatedb nocreaterole noinherit noreplication bypassrls
       connection limit 5',
    clave);
end
$$;

-- Red de seguridad: toda transacción del rol es de solo lectura y con límites de tiempo.
alter role arcade_readonly set default_transaction_read_only = on;
alter role arcade_readonly set statement_timeout = '30s';
alter role arcade_readonly set idle_in_transaction_session_timeout = '60s';

-- Lectura de public: tablas y vistas actuales.
grant usage on schema public to arcade_readonly;
grant select on all tables in schema public to arcade_readonly;
grant select on all sequences in schema public to arcade_readonly;

-- Tablas y vistas que creen las migraciones futuras (las aplica el rol postgres).
alter default privileges for role postgres in schema public
  grant select on tables to arcade_readonly;
alter default privileges for role postgres in schema public
  grant select on sequences to arcade_readonly;

-- Historial de migraciones, para comparar prod con supabase/migrations/.
grant usage on schema supabase_migrations to arcade_readonly;
grant select on supabase_migrations.schema_migrations to arcade_readonly;

-- Opcional: ocultar scores.user_id (uuid de la cuenta). Descomenta las dos líneas.
-- revoke select on public.scores from arcade_readonly;
-- grant select (id, game_id, player_name, score, created_at) on public.scores to arcade_readonly;

commit;

-- Verificación (solo lectura). Debe salir rolcanlogin = true, rolbypassrls = true, rolsuper = false,
-- rolconfig con default_transaction_read_only=on, y solo privilegios SELECT.
select rolname, rolcanlogin, rolbypassrls, rolsuper, rolcreaterole, rolconfig
  from pg_roles
 where rolname = 'arcade_readonly';

select table_schema, table_name, string_agg(privilege_type, ',' order by privilege_type) as privilegios
  from information_schema.role_table_grants
 where grantee = 'arcade_readonly'
 group by 1, 2
 order by 1, 2;

-- Prueba ya conectado como arcade_readonly (debe fallar con
-- "cannot execute INSERT in a read-only transaction"):
--   insert into public.games (id) values ('x');

-- Retirar el acceso:
--   reassign owned by arcade_readonly to postgres;
--   drop owned by arcade_readonly;
--   drop role arcade_readonly;
