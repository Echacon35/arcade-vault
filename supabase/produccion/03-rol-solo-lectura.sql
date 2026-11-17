-- Arcade Vault: acceso de solo lectura a producción por el pooler (Supavisor).
-- Ejecútalo en el SQL Editor de producción (conectado como postgres), después de 01-bootstrap.sql.
-- NO es una migración: solo aplica a prod y lleva una contraseña. No lo copies a supabase/migrations/
-- ni guardes aquí la clave real: sustitúyela solo en el editor y no guardes la query con ella.
--
-- Dos piezas:
--   arcade_readonly  → rol de GRUPO, sin login. Tiene los permisos (solo SELECT).
--   <usuario>        → usuario CON login y clave propia (no la del usuario postgres). Hereda los
--                      permisos del grupo y lleva lo que Postgres no hereda por pertenencia:
--                      BYPASSRLS, transacciones read-only y timeouts.
-- Para dar acceso a otra persona o herramienta, repite solo el bloque 2 con otro usuario y otra clave.
--
-- BYPASSRLS: las políticas de lectura solo cubren anon/authenticated, así que sin él vería las tablas
-- vacías. No permite escribir: lo que puede hacer lo limitan los GRANT (solo SELECT).
-- No da acceso a auth (correos, identidades), storage ni ningún INSERT/UPDATE/DELETE.
--
-- Conexión (Connect → Connection pooling en el panel de prod), con el nombre del usuario:
--   postgresql://<usuario>.<ref-prod>:<CLAVE>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
--   5432 = modo sesión (recomendado para consultas); 6543 = modo transacción (sin SET de sesión).
begin;
-- 1. Rol de grupo con los permisos (sin login).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'arcade_readonly') then
    create role arcade_readonly nologin;
  else
    -- Si una versión anterior de esta plantilla lo creó con login, lo convierte en grupo.
    alter role arcade_readonly nologin nobypassrls;
    alter role arcade_readonly reset all;
  end if;
end
$$;
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
-- 2. Usuario con login que hereda el grupo.
do $$
declare
  usuario text := 'arcade_lector';  -- cámbialo si quieres otro nombre (minúsculas, sin espacios)
  clave   text := '<CLAVE>';        -- clave aleatoria de 32+ caracteres
begin
  if clave = '<CLAVE>' or length(clave) < 24 then
    raise exception 'Pon una clave real de 24 o más caracteres en la variable "clave"';
  end if;
  if usuario !~ '^[a-z_][a-z0-9_]{2,40}$' or usuario in ('postgres', 'arcade_readonly') then
    raise exception 'Nombre de usuario no válido: %', usuario;
  end if;
  if exists (select 1 from pg_roles where rolname = usuario) then
    raise exception 'El usuario % ya existe. Para rotar la clave: alter role % password ''...'';', usuario, usuario;
  end if;
  execute format(
    'create role %I with login password %L inherit
       nosuperuser nocreatedb nocreaterole noreplication bypassrls
       connection limit 5',
    usuario, clave);
  execute format('grant arcade_readonly to %I', usuario);
  -- Red de seguridad: toda transacción del usuario es de solo lectura y con límites de tiempo.
  execute format('alter role %I set default_transaction_read_only = on', usuario);
  execute format('alter role %I set statement_timeout = %L', usuario, '30s');
  execute format('alter role %I set idle_in_transaction_session_timeout = %L', usuario, '60s');
end
$$;
commit;
-- Verificación (solo lectura). El grupo debe salir con rolcanlogin = false; el usuario con
-- rolcanlogin = true, rolbypassrls = true, rolsuper = false, rolconfig con
-- default_transaction_read_only=on y miembro_de = arcade_readonly.
select r.rolname, r.rolcanlogin, r.rolbypassrls, r.rolsuper, r.rolcreaterole, r.rolconfig,
       (select string_agg(g.rolname, ',')
          from pg_auth_members m join pg_roles g on g.oid = m.roleid
         where m.member = r.oid) as miembro_de
  from pg_roles r
 where r.rolname = 'arcade_readonly'
    or (r.rolname <> 'postgres'  -- en PG16+ el creador figura como miembro con ADMIN
        and exists (select 1 from pg_auth_members m
                     where m.member = r.oid and m.roleid = 'arcade_readonly'::regrole))
 order by r.rolcanlogin, r.rolname;
-- Debe salir solo SELECT.
select table_schema, table_name, string_agg(privilege_type, ',' order by privilege_type) as privilegios
  from information_schema.role_table_grants
 where grantee = 'arcade_readonly'
 group by 1, 2
 order by 1, 2;
-- Prueba ya conectado como el usuario (debe fallar con
-- "cannot execute INSERT in a read-only transaction"):
--   insert into public.games (id) values ('x');
--
-- Retirar el acceso de un usuario (el grupo se queda para otros):
--   drop role arcade_lector;
-- Retirarlo todo:
--   drop role arcade_lector;
--   reassign owned by arcade_readonly to postgres;
--   drop owned by arcade_readonly;
--   drop role arcade_readonly;
