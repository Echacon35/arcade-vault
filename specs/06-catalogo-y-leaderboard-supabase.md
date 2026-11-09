# SPEC 06 — Catálogo y leaderboard en Supabase

> **Estado:** Aprobado
> **Depende de:** SPEC 04, SPEC 05
> **Fecha:** 2026-11-09
> **Objetivo:** Crear en Supabase las tablas `games` y `scores` con su leaderboard, hacer que `/juegos` y el detalle de cada juego lean de ellas, y que `GUARDAR PUNTUACIÓN` de ASTEROIDES escriba ahí a través de una Server Action.

---

## Por qué existe esta spec

Hoy todo es mock: el catálogo es `GAMES` en `lib/games.ts` (11 juegos, 10 simulados con `best` y `plays` inventados), el TOP 10 del detalle sale de `seededScores` y las puntuaciones se guardan en `localStorage` con `saveScore`. La base de datos de Supabase está vacía (`list_tables` devuelve `[]`).

Esta spec crea el primer esquema real y conecta dos pantallas a él. Es una migración parcial a propósito:

- **En la tabla `games` solo entra ASTEROIDES**, el único juego jugable. La biblioteca mostrará un solo juego.
- **El código simulado no se borra.** `GAMES`, `seededScores`, la partida simulada de `GamePlayer`, el Inicio y el Salón de la Fama siguen como están.
- **No hay Auth.** Las puntuaciones se insertan con la publishable key y RLS que permite insert anónimo con restricciones. Se puede hacer trampa; se acepta hasta la spec de Auth.
- **`cacheComponents: true`.** Las lecturas públicas se cachean con `"use cache"` + `cacheTag` y se invalidan al guardar. `"use cache"` no puede leer `cookies()`, así que hace falta un cliente público sin cookies.

---

## Alcance

**Dentro:**

- **Esquema en Supabase** (aplicado con `apply_migration` del MCP y copiado a `supabase/migrations/`):
  - Tabla `games` sembrada con la fila `asteroides`, con los textos actuales de su entrada en `GAMES`.
  - Tabla `scores` con una fila por partida guardada.
  - Vista `leaderboard`: mejor marca por `(game_id, player_name)` con su rango.
  - Vista `game_stats`: `best` (máxima puntuación, 0 si no hay) y `plays` (número de partidas guardadas) por juego.
  - RLS: `games` y las vistas solo lectura pública; `scores` lectura pública e insert anónimo; nadie puede actualizar ni borrar.
- **Tipos generados** con `generate_typescript_types` del MCP en `lib/supabase/database.types.ts`.
- **Cliente público sin cookies** `lib/supabase/public.ts` para lecturas cacheadas.
- **Capa de datos** `lib/catalog.ts` (`server-only`) con `getCatalog`, `getCatalogGame` y `getLeaderboard`, cacheadas con `"use cache"` y tags.
- **`/juegos`** lee `getCatalog()` en servidor y pasa los juegos a `Library` como prop. Búsqueda y chips de categoría siguen funcionando en cliente.
- **`/juegos/[id]`** lee `getCatalogGame(id)` y `getLeaderboard(id, 10)`:
  - `Mejor puntuación` y `Partidas` salen de `game_stats`.
  - TOP 10 real con rango, nombre y puntuación. Sin filas: `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
  - Un id que no está en la tabla `games` da el 404 temático.
- **Server Action `saveScoreAction`** en `app/juegos/[id]/jugar/actions.ts`: valida, inserta en `scores` e invalida los tags del juego.
- **`GamePlayer`**: para juegos con motor (`GAME_ENGINES`), `GUARDAR PUNTUACIÓN` llama a la Server Action, con estados `GUARDANDO…`, guardado y error con reintento. Los juegos simulados siguen usando `saveScore` de `lib/session.ts`.
- **Estado de error temático** cuando Supabase falla: `▸ SEÑAL PERDIDA — REINTENTA_` en lugar de la lista de `/juegos` o del TOP 10.
- **`CLAUDE.md`**: la nota "El build no depende de ninguna" se corrige (ver Decisiones) y se documenta `supabase/migrations/`.

**Fuera de alcance (para futuras specs):**

- Supabase Auth, sustituir `lib/session.ts` y asociar puntuaciones a usuarios.
- Anti-trampas (firmar partidas, validar en servidor la lógica del juego, rate limiting).
- Salón de la Fama con datos reales. Sigue con `GAMES` y `seededScores`.
- Inicio con datos reales (mini-cards, `TOP_PLAYERS`, `HOME_STATS`). Sigue con `GAMES` y `lib/home.ts`.
- `/juegos/[id]/jugar` leyendo de BD. Sigue con `getGame` de `GAMES`, así que los juegos simulados siguen jugables por URL.
- Borrar `GAMES`, `seededScores` o la partida simulada.
- Añadir más juegos a la tabla `games`.
- Panel de administración, editar o borrar puntuaciones.
- Paginación del leaderboard.
- Supabase CLI (`supabase init`, `link`, `db push`).
- Tests automatizados.

---

## Modelo de datos

```sql
-- supabase/migrations/<timestamp>_create_games_and_scores.sql

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
values ('asteroides', 'ASTEROIDES', '<short de GAMES>', '<long de GAMES>', 'SHOOTER', 'cover-asteroides', 'cyan', 1);
```

Los textos `<short de GAMES>` y `<long de GAMES>` se copian literalmente de la entrada `asteroides` de `lib/games.ts`.

```ts
// lib/supabase/public.ts — sin cookies, apto para "use cache"
export function createPublicClient(): SupabaseClient<Database>;
// createClient de @supabase/supabase-js con getSupabaseEnv() y auth.persistSession = false.

// lib/catalog.ts — import "server-only"
export type CatalogResult<T> = { ok: true; data: T } | { ok: false };

export type LeaderboardRow = { rank: number; name: string; score: number; date: string }; // date "dd/mm/aaaa"

export async function getCatalog(): Promise<CatalogResult<Game[]>>;
// "use cache"; cacheTag("games"). games + game_stats, ordenado por sort_order.

export async function getCatalogGame(id: string): Promise<CatalogResult<Game | null>>;
// "use cache"; cacheTag("games", `game-${id}`). null si no existe → la página llama a notFound().

export async function getLeaderboard(gameId: string, limit: number): Promise<CatalogResult<LeaderboardRow[]>>;
// "use cache"; cacheTag(`game-${gameId}`). leaderboard ordenado por rank.
```

Mapeo a `Game` (el tipo de `lib/games.ts` no cambia): `short_description → short`, `long_description → long`, `category → cat`, `best → best`, `plays → plays.toLocaleString("es-ES")`.

```ts
// app/juegos/[id]/jugar/actions.ts — "use server"
export type SaveScoreResult = { ok: true } | { ok: false; error: string };
export async function saveScoreAction(input: { gameId: string; name: string; score: number }): Promise<SaveScoreResult>;
// Valida: name ~ /^[A-Z0-9_]{1,10}$/, score entero entre 0 y 10.000.000, gameId ~ /^[a-z0-9-]+$/.
// Inserta con createClient() de lib/supabase/server.ts e invalida `game-${gameId}` (y "games" por game_stats).
// Error genérico al cliente; la causa va a console.error.
```

Convenciones:

- Columnas en `snake_case` en BD; los nombres de TS siguen los de `Game`.
- Solo `lib/catalog.ts` y la Server Action hablan con Supabase. Los componentes no importan clientes de Supabase.
- Las funciones con `"use cache"` nunca leen `cookies()` ni `headers()`.
- Un error de Supabase no se cachea como dato válido: la rama `{ ok: false }` usa un `cacheLife` corto (ver paso 4).
- Cada migración aplicada con el MCP tiene su `.sql` idéntico en `supabase/migrations/`.

---

## Plan de implementación

1. **Documentación.** Leer en `node_modules/next/dist/docs/` las guías de `use cache`, `cacheTag`, `cacheLife`, `revalidateTag`/`updateTag`, Server Actions y `generateStaticParams` con `cacheComponents`. Anotar qué API de invalidación corresponde a una Server Action en esta versión.
2. **Esquema.** Comprobar con `list_tables` que la BD sigue vacía. Aplicar la migración del modelo de datos con `apply_migration` y guardar el mismo SQL en `supabase/migrations/`. Verificar con `list_tables`, con `execute_sql` de solo lectura (`select * from games`) y con `get_advisors` (seguridad) que no hay avisos de RLS.
3. **Tipos y cliente público.** Generar `lib/supabase/database.types.ts` con `generate_typescript_types`. Tipar `server.ts` y `client.ts` con `Database`. Crear `lib/supabase/public.ts`. `npm run build` pasa.
4. **Capa de datos.** Crear `lib/catalog.ts` con las tres funciones, sus tags y el manejo de error. Todavía no se usan.
5. **`/juegos`.** `app/juegos/page.tsx` llama a `getCatalog()` dentro de `<Suspense>` y pasa los juegos a `Library`, que deja de importar `GAMES`. Error → `▸ SEÑAL PERDIDA — REINTENTA_`. Comprobación manual: solo aparece ASTEROIDES con `best` y `plays` reales.
6. **Detalle.** `app/juegos/[id]/page.tsx` usa `getCatalogGame` y `getLeaderboard(id, 10)`. `generateStaticParams` toma los ids de la tabla `games`. Estado vacío y de error del TOP 10. `/juegos/rocas` da 404.
7. **Server Action.** Crear `app/juegos/[id]/jugar/actions.ts` con validación, insert e invalidación.
8. **`GamePlayer`.** Si el juego tiene motor, `GUARDAR PUNTUACIÓN` llama a `saveScoreAction` con estados `GUARDANDO…` (botón deshabilitado), `PUNTUACIÓN GUARDADA` y error (`▸ NO SE PUDO GUARDAR — REINTENTA_`, botón activo). Los juegos sin motor siguen con `saveScore`.
9. **Documentación del repo.** Actualizar `CLAUDE.md`: el build ahora necesita las variables de Supabase y existe `supabase/migrations/` como historial de las migraciones aplicadas por MCP.
10. **Limpieza.** `npm run lint` y `npm run build` sin errores.

Reglas transversales:

- Los cambios de esquema solo se hacen con `apply_migration`. `execute_sql` se usa únicamente para lecturas de verificación y para borrar las puntuaciones de prueba al final.
- No se usa la `service_role` / secret key.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores con `.env.local` configurado.
- [ ] `list_tables` muestra `games` y `scores` con RLS activado; `get_advisors` (seguridad) no reporta avisos sobre ellas ni sobre las vistas.
- [ ] `supabase/migrations/` contiene el `.sql` de cada migración aplicada y coincide con `list_migrations`.
- [ ] `select * from games` devuelve exactamente una fila, `asteroides`, con los textos de `GAMES`.
- [ ] Con la publishable key: `update` y `delete` sobre `scores` y cualquier escritura sobre `games` fallan; `insert` en `scores` con `player_name = 'abc'` o `score = -1` falla.
- [ ] `/juegos` muestra solo ASTEROIDES; la búsqueda y los chips de categoría filtran sin errores.
- [ ] Sin puntuaciones, `/juegos/asteroides` muestra `Mejor puntuación 0`, `Partidas 0` y `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- [ ] Tras guardar una partida en `/juegos/asteroides/jugar`, el modal muestra `PUNTUACIÓN GUARDADA` y, al volver al detalle sin recargar a mano, el TOP 10, `Mejor puntuación` y `Partidas` reflejan la nueva fila.
- [ ] Guardar dos veces con el mismo nombre deja una sola fila de ese nombre en el TOP 10, con su mejor puntuación, y `Partidas` cuenta ambas.
- [ ] `/juegos/rocas` (detalle) da el 404 temático; `/juegos/rocas/jugar` sigue con la partida simulada y guarda en `localStorage`.
- [ ] Con la URL de Supabase rota en `.env.local`, `/juegos` y el TOP 10 muestran `▸ SEÑAL PERDIDA — REINTENTA_` y guardar muestra `▸ NO SE PUDO GUARDAR — REINTENTA_` sin perder la puntuación del modal.
- [ ] Ningún componente importa `@supabase/*` ni `lib/supabase/*`; solo `lib/catalog.ts` y `actions.ts` lo hacen.
- [ ] Inicio y Salón de la Fama se ven igual que antes.
- [ ] La consola no muestra errores durante el flujo jugar → guardar → ver detalle.
- [ ] Las puntuaciones de prueba se borran de `scores` al terminar.

---

## Decisiones

- **Sí:** tabla `games` en Supabase y `/juegos` + detalle leyendo de ella. Decisión del usuario.
- **Sí:** solo ASTEROIDES en `games`. Es el único juego jugable; no se migran cifras inventadas.
- **Sí:** mantener `GAMES`, `seededScores` y la simulación sin usarse en `/juegos`. El usuario prefiere no borrar código todavía; Inicio, Salón y `jugar` siguen dependiendo de ellos.
- **Sí:** `/juegos/[id]/jugar` sigue con `GAMES`. Los juegos simulados siguen accesibles por URL; su detalle da 404.
- **Sí:** los juegos sin motor siguen guardando con `saveScore` en `localStorage`. La FK de `scores.game_id` rechazaría cualquier id que no esté en `games`.
- **Sí:** Server Action + RLS de insert anónimo. Permite validar en servidor sin Auth. Se acepta que se pueda trampear.
- **No:** insert directo desde el navegador. Sin validación de servidor ni invalidación de caché.
- **Sí:** leaderboard con la mejor marca por nombre (vista `leaderboard`). Evita que un jugador ocupe todo el TOP.
- **Sí:** `best` y `plays` calculados en la vista `game_stats`. No hay columnas que desincronizar.
- **Sí:** validación nombre `^[A-Z0-9_]{1,10}$` y score 0–10.000.000, duplicada en la Server Action y en `CHECK`. Coincide con el input actual del modal; el `CHECK` protege aunque alguien salte la Action.
- **Sí:** `"use cache"` + `cacheTag`, invalidado desde la Server Action. Páginas rápidas y datos frescos tras guardar.
- **Sí:** cliente público sin cookies (`lib/supabase/public.ts`). `"use cache"` no admite `cookies()`.
- **Sí:** `apply_migration` del MCP con copia en `supabase/migrations/`. Historial versionado sin introducir la CLI.
- **Sí:** tipos generados con el MCP. Con tablas reales, tipar las consultas evita errores de nombres de columna.
- **Sí:** el build pasa a necesitar las variables de Supabase. `generateStaticParams` y el prerender leen la BD; contradice SPEC 04 ("el build no depende de ninguna"), así que se actualiza `CLAUDE.md`.
- **Sí:** estado de error temático en lugar de fallback a datos locales. No oculta fallos de conexión.
- **No:** Salón e Inicio con datos reales. Fuera del alcance elegido; irán en otra spec.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Cualquiera puede insertar puntuaciones falsas con la publishable key. | `CHECK` de rango y formato. Aceptado hasta la spec de Auth/anti-trampas. |
| Un error de Supabase en el prerender queda cacheado como página vacía. | `CatalogResult` con rama `{ ok: false }` y `cacheLife` corto en esa rama; el paso 1 confirma la API. |
| `generateStaticParams` no puede devolver un array vacío con `cacheComponents` o falla sin red en build. | El paso 1 lo verifica en la doc local; la tabla siempre tiene al menos `asteroides`. |
| La API de invalidación (`revalidateTag` vs `updateTag`) cambió en Next 16. | El paso 1 obliga a leer la guía local antes de escribir la Server Action. |
| Proyectos nuevos de Supabase no conceden permisos por defecto a `anon` en `public`. | `grant` explícitos en la migración y criterio que prueba lectura e insert con la publishable key. |
| Las vistas saltan RLS si se crean como `security definer`. | `security_invoker = true` y revisión con `get_advisors`. |
| El `.sql` del repo diverge de lo aplicado. | Criterio que compara con `list_migrations`. |

---

## Lo que **no** está en esta spec

- Supabase Auth y puntuaciones ligadas a usuarios.
- Anti-trampas y rate limiting.
- Salón de la Fama e Inicio con datos reales.
- Más juegos en la tabla `games`.
- Borrar el código simulado (`GAMES`, `seededScores`, partida simulada).
- Administración, edición o borrado de puntuaciones.
- Supabase CLI.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
