# SPEC 14 — Puntuaciones vinculadas a la cuenta

> **Estado:** Implementado
> **Depende de:** SPEC 06, SPEC 06.5, SPEC 12, SPEC 13
> **Fecha:** 2026-11-13
> **Objetivo:** Guardar las puntuaciones de los jugadores con sesión vinculadas a su cuenta (`scores.user_id`) y con su alias fijo, y distinguirlas en el TOP 10 y en el Salón de la Fama.

---

## Por qué existe esta spec

Es la tercera y última parte del plan de autenticación que se dividió en la SPEC 12:

- **SPEC 12:** cuentas con correo.
- **SPEC 13:** OAuth y alias obligatorio.
- **SPEC 14 (esta):** puntuaciones con cuenta.

Hoy, aunque haya sesión, `saveScoreAction` guarda el nombre que manda el cliente, y el modal de fin lo deja editar. La partida no queda ligada a la cuenta, y cualquiera puede guardar con el alias de otro.

El leaderboard agrupa por `player_name`, así que una cuenta y un invitado con el mismo nombre se mezclan.

---

## Alcance

**Dentro:**

- **Migración `link_scores_to_accounts`:**
  - Columna `scores.user_id uuid null`, con FK a `auth.users(id)` `on delete set null`.
  - Política de insert: `user_id is null or user_id = auth.uid()`. Un invitado no puede poner `user_id`, y una cuenta solo puede poner el suyo.
  - `user_id` no es legible públicamente. `anon` y `authenticated` leen `scores` con grants por columna, sin `user_id`.
  - La vista `leaderboard` agrupa la mejor marca por cuenta (`user_id`) y, para invitados, por `player_name`, y expone `has_account boolean` en lugar del `user_id`.
  - Las puntuaciones existentes quedan con `user_id = null`. No hay relleno retroactivo.
- **`saveScoreAction` (`app/juegos/[id]/jugar/actions.ts`):**
  - **Con sesión válida en el servidor:** usa `user.id` y `user_metadata.alias` leídos con `getUser()` e ignora el nombre del cliente. Si la cuenta no tiene alias válido, devuelve error. No debería ocurrir, por el guardián de la SPEC 13.
  - **Sin sesión:** como hoy, guarda el nombre del cliente validado con `user_id = null`.
- **Modal de fin (`components/game-player.tsx`):**
  - **Con sesión:** el nombre no se edita. Muestra el alias fijo con el distintivo de cuenta y el botón `GUARDAR PUNTUACIÓN`. No hay opción de guardar como invitado.
  - Se aplica en todos los juegos, también en los simulados sin motor, que siguen guardando en `localStorage` sin `user_id`.
  - **Sin sesión:** como hoy, con el campo de nombre libre.
- **Distintivo de cuenta:**
  - En el TOP 10 del detalle (`app/juegos/[id]/page.tsx`) y en el podio y la tabla del Salón (`components/hall-of-fame.tsx`), las marcas con `has_account` llevan un `◆` cian junto al nombre.
  - Texto accesible: «jugador con cuenta» (con `title` y texto solo para lectores de pantalla).
  - El mismo distintivo aparece en el modal de fin junto al alias.
- **`lib/catalog.ts`:** `getLeaderboard` lee `has_account`, y `LeaderboardRow` gana `hasAccount: boolean`.
- **Tipos:** se regenera `lib/supabase/database.types.ts` con el MCP.
- **Documentación:** `CLAUDE.md` refleja el esquema nuevo, la regla de nombre con sesión y el distintivo.

**Fuera de alcance (para futuras specs):**

- Alias único, tabla `profiles` o reservar alias. Un invitado puede seguir guardando con un nombre que coincide con el alias de una cuenta; el distintivo lo diferencia.
- Página de perfil o «mis puntuaciones», y cambiar el alias.
- Borrar la cuenta desde la app (la FK ya deja las marcas como de invitado si ocurre).
- Asignar a una cuenta las puntuaciones antiguas de invitado con el mismo nombre.
- Subir a Supabase las puntuaciones de juegos simulados (siguen en `localStorage`).
- El bloque estático «TOP JUGADORES · HOY» de la landing (datos de `lib/home.ts`).

---

## Modelo de datos

Migración `supabase/migrations/<version>_link_scores_to_accounts.sql` (aplicada con `apply_migration`):

```sql
alter table public.scores
  add column user_id uuid null references auth.users(id) on delete set null;
create index scores_user_idx on public.scores (user_id) where user_id is not null;

-- Insert: invitado sin user_id, o la propia cuenta.
drop policy "scores: insert anónimo" on public.scores;
create policy "scores: insert propio o anónimo" on public.scores
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
grant insert (user_id) on public.scores to authenticated;

-- Lectura pública sin user_id (grants por columna).
revoke select on public.scores from anon, authenticated;
grant select (id, game_id, player_name, score, created_at) on public.scores to anon, authenticated;

-- Leaderboard: mejor marca por cuenta (o por nombre si es invitado); expone has_account, no user_id.
create or replace view public.leaderboard with (security_invoker = false) as
select game_id, player_name, score, achieved_at, has_account,
       row_number() over (partition by game_id order by score desc, achieved_at asc) as rank
from (
  select distinct on (game_id, coalesce(user_id::text, 'invitado:' || player_name))
         game_id, player_name, score, created_at as achieved_at,
         (user_id is not null) as has_account
  from public.scores
  order by game_id, coalesce(user_id::text, 'invitado:' || player_name), score desc, created_at asc
) best;
grant select on public.leaderboard to anon, authenticated;
```

Al implementar se confirma la sintaxis exacta. `create or replace view` no permite reordenar columnas, así que puede hacer falta `drop view` + `create view`.

Notas:

- `leaderboard` pasa a `security_invoker = false`. El invocador ya no puede leer `user_id`, y la vista necesita agrupar por él. La vista no expone `user_id`, y `scores` ya era de lectura pública, así que no se abre nada nuevo. El asesor de seguridad de Supabase avisará de una _security definer view_; se documenta como aceptado.
- `game_stats` no cambia (solo usa `id` y `score`).
- `player_name` conserva el CHECK `^[A-Z0-9_]{1,10}$`. En las marcas con cuenta guarda el alias que tenía la cuenta al jugar.

`lib/catalog.ts`:

```ts
export type LeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
  /** La marca se guardó con sesión iniciada (SPEC 14). */
  hasAccount: boolean;
};
```

`saveScoreAction` mantiene su firma (`{ gameId, name, score }` → `SaveScoreResult`). Con sesión, `name` se ignora.

---

## Plan de implementación

1. **Aplicar la migración `link_scores_to_accounts`** con `apply_migration`. Guardar su `.sql` idéntico en `supabase/migrations/` con la versión que devuelve `list_migrations`. Regenerar `lib/supabase/database.types.ts`.
   - Comprobación con `execute_sql`:
     - la vista devuelve `has_account` y sin `user_id`;
     - como `anon`, `select user_id from scores` falla por permisos;
     - las marcas existentes siguen en el TOP con `has_account = false`.
   - La app sigue funcionando sin cambios.
2. **`lib/catalog.ts`:** leer `has_account` en `getLeaderboard` y añadir `hasAccount` a `LeaderboardRow`. Nadie lo pinta todavía.
3. **`saveScoreAction`:** con sesión, `getUser()` → `user_id` y alias de la sesión. Sin sesión, igual que antes. Comprobación: una partida con sesión crea una fila con `user_id` y el alias; una de invitado, con `user_id` nulo.
4. **Distintivo en el TOP 10 y en el Salón**:
   - Un componente pequeño compartido (`components/account-badge.tsx`), usado en `app/juegos/[id]/page.tsx` y `components/hall-of-fame.tsx`.
   - Diseño con `/frontend-design`.
5. **Modal de fin en `components/game-player.tsx`**:
   - Con sesión, alias fijo con distintivo, sin campo editable, en todos los juegos.
   - Sin sesión, sin cambios.
6. **Actualizar `CLAUDE.md`**: esquema de `scores` y `leaderboard`, regla de nombre con sesión en «Supabase → Acceso» y en el párrafo de autenticación, y el aviso del asesor sobre la vista.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] `list_migrations` incluye `link_scores_to_accounts`, y su `.sql` está en `supabase/migrations/` con la misma versión.
- [ ] Como `anon`, leer `scores.user_id` por la API falla por permisos. Leer `id`, `game_id`, `player_name`, `score` y `created_at` funciona.
- [ ] Como `anon`, insertar una fila con `user_id` distinto de nulo falla por RLS.
- [ ] Las puntuaciones anteriores a la migración siguen apareciendo en el TOP 10 y en el Salón, sin distintivo.
- [ ] Con sesión, el modal de fin muestra el alias fijo con `◆` y no tiene campo de nombre editable, en un juego con motor y en uno simulado.
- [ ] Con sesión, guardar en un juego con motor crea en `scores` una fila con el `user_id` de la cuenta y `player_name` igual a su alias.
- [ ] Con sesión, una petición a `saveScoreAction` con otro `name` guarda igualmente el alias de la cuenta.
- [ ] Sin sesión, el modal permite escribir el nombre y la fila se guarda con `user_id` nulo, como antes.
- [ ] En el TOP 10 del juego y en el Salón, la marca con cuenta muestra `◆` cian con el texto accesible «jugador con cuenta». Las de invitado no lo muestran.
- [ ] Una cuenta con alias `PX_KAI` y un invitado `PX_KAI` en el mismo juego aparecen como dos filas distintas del TOP 10.
- [ ] Dos marcas de la misma cuenta en el mismo juego aparecen como una sola fila (la mejor).
- [ ] Tras guardar, el TOP 10 del juego muestra la marca nueva al volver al detalle (invalidación con `updateTag` como hasta ahora).
- [ ] La vista `leaderboard` no tiene ninguna columna `user_id`.

---

## Decisiones

- **Sí:** agrupar el leaderboard por cuenta y, para invitados, por nombre. Una cuenta es un jugador aunque comparta nombre con un invitado. Dos invitados con el mismo nombre se siguen fusionando, como hoy.
- **No:** seguir agrupando solo por nombre. Mezclaría las marcas de una cuenta con las de cualquier invitado que use su alias.
- **Sí:** distintivo `◆` cian para las marcas con cuenta, en el TOP 10, en el Salón y en el modal de fin. Es lo que hace visible la diferencia entre una cuenta y un invitado con el mismo nombre.
- **Sí:** un invitado puede usar un nombre que coincide con un alias. Con el alias en `user_metadata` no hay forma barata ni segura de comprobarlo; reservar alias va con la futura spec de `profiles`.
- **No:** bloquearlo con una función `SECURITY DEFINER` sobre `auth.users`, porque revelaría qué alias existen.
- **Sí:** `on delete set null` en la FK. Si se borra una cuenta, sus marcas quedan como de invitado y el Salón no pierde récords.
- **No:** `on delete cascade`.
- **Sí:** con sesión, el servidor toma `user_id` y alias de `getUser()` e ignora el nombre del cliente. Nadie puede guardar con su `user_id` y un nombre ajeno manipulando la petición.
- **Sí:** el alias de `user_metadata` solo se usa como nombre visible, nunca para autorizar. Autoriza la política RLS (`user_id = auth.uid()`). Riesgo anotado en la SPEC 12.
- **Sí:** `user_id` no es público. Grants por columna en `scores`, y la vista expone solo `has_account`. No se filtran los UUID de las cuentas.
- **Sí:** vista `leaderboard` con `security_invoker = false`, porque necesita agrupar por `user_id` sin que el invocador pueda leerlo. Se acepta el aviso del asesor de Supabase: la vista no expone nada que no fuera ya público.
- **No:** una función RPC para el leaderboard. Obligaría a cambiar `lib/catalog.ts` a `rpc()` sin ganar seguridad frente a la vista.
- **Sí:** alias fijo con sesión en todos los juegos, también en los simulados. Una sola regla en el modal.
- **No:** «guardar como invitado» con sesión. Para jugar como invitado se cierra sesión.
- **Sí:** si la sesión caduca en el servidor entre jugar y guardar, la marca se guarda como de invitado con el nombre que mande el cliente (el alias) y sin distintivo. Es lo más simple y no pierde la puntuación.
- **Sí:** sin relleno retroactivo de `user_id` en marcas antiguas. No hay forma fiable de saber de quién eran.
- **Sí:** `player_name` guarda el alias del momento de jugar. Hoy el alias no se puede cambiar; si una spec futura lo permite, decidirá si el Salón muestra el nombre antiguo o el actual.

---

## Riesgos

| Riesgo                                                                                                                   | Mitigación                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `revoke select` + grants por columna rompe consultas existentes que usen `select *` sobre `scores`.                      | Hoy solo se lee `scores` a través de las vistas. El paso 1 comprueba el TOP 10 y el Salón tras migrar, antes de tocar código. |
| La vista con `security_invoker = false` hace que el asesor de seguridad de Supabase la marque.                           | Decisión documentada en `CLAUDE.md`. La vista solo expone columnas ya públicas más `has_account`.                             |
| La caché de `fetch` de Next sirve el leaderboard sin `has_account` tras el despliegue (problema conocido de la SPEC 07). | Antes del build, borrar `.next/cache/fetch-cache/`, como indica «Problemas conocidos» en `CLAUDE.md`.                         |
| Un invitado se hace pasar por una cuenta usando su alias.                                                                | Aceptado en esta spec. El distintivo `◆` lo diferencia y la reserva de alias va con `profiles`.                               |
| `create or replace view` falla al cambiar las columnas de la vista.                                                      | Usar `drop view` + `create view` en la misma migración y volver a dar los grants.                                             |

---

## Lo que **no** está en esta spec

- Alias único, `profiles` y reserva de alias.
- Perfil, «mis puntuaciones» y cambio de alias.
- Borrado de cuenta desde la app.
- Reasignar a cuentas las puntuaciones antiguas de invitado.
- Subir a Supabase las partidas simuladas.
- El TOP estático de la landing.

Cada una de estas, si llega, irá en su propia spec.
