# SPEC 17 — Cerrar la redirección abierta de `safeNext` y limitar el INSERT de `scores`

> **Estado:** Aprobada
> **Depende de:** SPEC 06, SPEC 12, SPEC 14, SPEC 16
> **Fecha:** 2026-11-13
> **Objetivo:** Que `safeNext` no devuelva nunca un destino `//host` (SEC-009) y que `anon` y `authenticated` solo puedan insertar en las columnas previstas de `scores` (SEC-010).

---

## Por qué existe esta spec

La auditoría de `security-auditor` del 2026-11-13 (`references/security/security-audit.md`) encontró dos garantías de las specs rotas.

**SEC-009 (alta) — redirección abierta en `safeNext`.** `safeNext` (`lib/auth-rules.ts`) rechaza `//host`, `/\host` y URLs absolutas mirando el texto de entrada. Pero devuelve `url.pathname` ya normalizado, y las secuencias de punto se resuelven después de esa comprobación. Reproducido con una copia literal de la función en Node:

| `next` de entrada | `safeNext` devuelve hoy | Resuelto contra `http://localhost:3000` |
| ----------------- | ----------------------- | --------------------------------------- |
| `/.//evil.com`    | `//evil.com`            | `http://evil.com/`                      |
| `/..//evil.com`   | `//evil.com`            | `http://evil.com/`                      |
| `/a/..//evil.com` | `//evil.com`            | `http://evil.com/`                      |
| `/%2e//evil.com`  | `//evil.com`            | `http://evil.com/`                      |
| `/./\evil.com`    | `//evil.com`            | `http://evil.com/`                      |

La salida de `safeNext` es el destino de todas las redirecciones con `next`:

- `proxy.ts`: con sesión, `GET /acceso?next=/.//evil.com` hace `NextResponse.redirect(new URL("//evil.com", request.url))`, es decir, un 307 a `http://evil.com/`.
- `components/alias-form.tsx`: con sesión y alias, `/acceso/alias?next=/.//evil.com` hace `router.replace("//evil.com")`. El router de Next trata un origen externo como navegación dura y sale del sitio. Sin sesión, el proxy manda primero a `/acceso?next=/acceso/alias?next=/.//evil.com`; tras iniciar sesión, el jugador acaba en `evil.com`. Es un enlace de phishing con el dominio legítimo.
- `components/auth-form.tsx`: tras el login, `router.push(next)`.
- `app/auth/confirm/route.ts`: `redirect(next)` tras `verifyOtp`. Un atacante puede usar un `token_hash` de su propia cuenta.
- `app/auth/callback/route.ts`: `redirect(next)`. Hoy no es explotable, porque `signInWithOAuthAction` vuelve a pasar `safeNext` y `//evil.com` sale como `/juegos`.

Rompe, con una variante trivial, el criterio de la SPEC 12 «Iniciar sesión desde `/acceso?next=//ejemplo.com` lleva a `/juegos`».

**SEC-010 (media) — INSERT en todas las columnas de `scores`.** La SPEC 06 concede `insert (game_id, player_name, score)` y la SPEC 14 `insert (user_id)` a `authenticated`. Pero Supabase da por defecto privilegios de tabla completos a `anon` y `authenticated` (`pg_default_acl` del esquema `public`), así que esos grants por columna no limitan nada. Estado real (`information_schema.column_privileges`, 2026-11-13):

- `anon` y `authenticated` tienen INSERT en `id`, `game_id`, `player_name`, `score`, `created_at` y `user_id`.
- `has_table_privilege(<rol>, 'public.scores', 'insert')` es `true` para los dos.

Con la publishable key, un `POST /rest/v1/scores` puede fijar `created_at` en el pasado. Así gana los empates del TOP 10 y del Salón (`order by score desc, achieved_at asc`) y muestra fechas falsas o futuras. El SELECT ya se corrigió en la SPEC 14 (revoke de tabla y grant por columna); el INSERT se quedó igual.

---

## Alcance

**Dentro:**

- **`safeNext` (`lib/auth-rules.ts`):** después de normalizar, si el resultado empieza por `//` o por `/\`, devuelve `DEFAULT_NEXT`. Se actualiza su comentario.
  - Los llamadores no cambian: `proxy.ts`, `app/auth/confirm/route.ts`, `app/auth/callback/route.ts`, `components/auth-form.tsx`, `components/alias-form.tsx` y `signInWithOAuthAction` ya pasan por `safeNext`.
- **Migración `restrict_scores_insert_columns`:**
  - Revoca el INSERT de tabla sobre `scores` a `anon` y `authenticated`.
  - Concede INSERT por columna en `game_id`, `player_name`, `score` y `user_id` a los dos roles.
  - `id` y `created_at` dejan de ser insertables: siempre la identidad y `now()`.
  - La política `scores: insert propio o anónimo` no cambia. Sigue obligando a `anon` a dejar `user_id` nulo.
- **Historial y tipos:** `.sql` idéntico en `supabase/migrations/` con la versión de `list_migrations`, y `lib/supabase/database.types.ts` regenerado (no debería cambiar).
- **`CLAUDE.md`:**
  - En «Supabase → Esquema», que el INSERT de `scores` también es por columna (sin `id` ni `created_at`) y por qué.
  - En el párrafo de autenticación, que `safeNext` valida la ruta ya normalizada.

**Fuera de alcance (para futuras specs):**

- Revocar UPDATE, DELETE, TRUNCATE, REFERENCES y TRIGGER de tabla a `anon` y `authenticated` (SEC-011). Queda como decisión abierta.
- Cambiar los privilegios por defecto del esquema `public` (`alter default privileges`).
- Anti-trampas en las puntuaciones (SEC-015) y rate limit propio en las Server Actions (SEC-008).
- Los logs de `report()` con el mensaje crudo de Supabase (SEC-012).
- El posible oráculo de existencia de cuentas por fallos de SMTP (SEC-013).
- Reservar alias o ligar `player_name` al alias en la base de datos (SEC-016, va con `profiles`).
- Tests automáticos: no hay framework configurado.

---

## Modelo de datos

No hay tablas ni columnas nuevas.

`safeNext` mantiene su firma. Cambio previsto, tras `new URL(next, BASE)` y la comprobación del origen:

```ts
const path = `${url.pathname}${url.search}${url.hash}`;
// `/.//host`, `/..//host` o `/%2e//host` se normalizan a `//host` (relativo al protocolo).
if (path.startsWith("//") || path.startsWith("/\\")) return DEFAULT_NEXT;
return path;
```

| `next` de entrada                 | `safeNext` debe devolver          |
| --------------------------------- | --------------------------------- |
| `/salon`                          | `/salon`                          |
| `/acceso/alias?next=%2Fsalon`     | `/acceso/alias?next=%2Fsalon`     |
| `//evil.com`                      | `/juegos`                         |
| `/\evil.com`                      | `/juegos`                         |
| `https://evil.com`                | `/juegos`                         |
| `/.//evil.com`                    | `/juegos`                         |
| `/..//evil.com`                   | `/juegos`                         |
| `/a/..//evil.com`                 | `/juegos`                         |
| `/%2e//evil.com`                  | `/juegos`                         |
| `/./\evil.com`                    | `/juegos`                         |
| `/acceso/alias?next=/.//evil.com` | `/acceso/alias?next=/.//evil.com` |

La última fila es una ruta interna: el `next` anidado lo vuelve a filtrar `/acceso/alias` con `safeNext`, que ya devolverá `/juegos`.

Migración `supabase/migrations/<version>_restrict_scores_insert_columns.sql`:

```sql
-- SPEC 17: INSERT por columna en scores. Supabase concede INSERT de tabla por defecto,
-- y eso anulaba los grants por columna de SPEC 06 y 14 (created_at e id eran insertables).
revoke insert on public.scores from anon, authenticated;
grant insert (game_id, player_name, score, user_id) on public.scores to anon, authenticated;
```

Revocar el INSERT de tabla también revoca los INSERT por columna, así que el `grant` va después.

Permisos de INSERT sobre `scores` tras la migración:

| Columna       | `anon` | `authenticated` |
| ------------- | ------ | --------------- |
| `id`          | no     | no              |
| `game_id`     | sí     | sí              |
| `player_name` | sí     | sí              |
| `score`       | sí     | sí              |
| `created_at`  | no     | no              |
| `user_id`     | sí     | sí              |

---

## Plan de implementación

1. **`safeNext`:** aplicar el cambio en `lib/auth-rules.ts` y actualizar su comentario. Comprobación: un script manual de Node, fuera del repo, da los resultados de la tabla del modelo de datos, y ningún resultado resuelve a otro origen contra `http://localhost:3000`.
2. **Redirecciones en vivo** con `npm run dev` y Playwright:
   - con sesión, `GET /acceso?next=/.//evil.com` responde 307 a `/juegos`;
   - con sesión y alias, `/acceso/alias?next=/.//evil.com` termina en `/juegos`;
   - iniciar sesión desde `/acceso?next=/.//evil.com` termina en `/juegos`;
   - siguen funcionando `/acceso?next=/salon` → `/salon` y, sin sesión, `/acceso/alias?next=/salon` → `/acceso?next=%2Facceso%2Falias%3Fnext%3D%252Fsalon`.
3. **Migración `restrict_scores_insert_columns`** con `apply_migration`, su `.sql` idéntico en `supabase/migrations/` y los tipos regenerados. Comprobación con `execute_sql` (solo `SELECT`):
   - `has_table_privilege` de INSERT sobre `public.scores` es `false` para `anon` y `authenticated`;
   - `has_column_privilege` de INSERT es `false` en `id` y `created_at`, y `true` en `game_id`, `player_name`, `score` y `user_id`;
   - las garantías de la SPEC 14 siguen (sin SELECT de tabla, `user_id` no legible, mismas políticas).
4. **Guardado de puntuaciones:** sin sesión, una partida de ASTEROIDES se guarda con `user_id` nulo; con sesión, con el `user_id` de la cuenta y su alias. El TOP 10 muestra las dos tras volver al detalle.
5. **`CLAUDE.md`:** documentar el INSERT por columna de `scores` y que `safeNext` valida la ruta normalizada.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` pasan sin errores.
- [ ] `safeNext` da los once resultados de la tabla del modelo de datos.
- [ ] Ningún resultado de `safeNext` de esa tabla resuelve a un origen distinto de `http://localhost:3000`.
- [ ] Con sesión, `GET /acceso?next=/.//evil.com` responde 307 con `Location` en `http://localhost:3000/juegos`.
- [ ] Con sesión y alias, abrir `/acceso/alias?next=/.//evil.com` termina en `/juegos`.
- [ ] Iniciar sesión con correo desde `/acceso?next=/.//evil.com` termina en `/juegos`.
- [ ] Iniciar sesión desde `/acceso?next=/salon` sigue llevando a `/salon`.
- [ ] Sin sesión, `/acceso/alias?next=/salon` sigue redirigiendo a `/acceso?next=%2Facceso%2Falias%3Fnext%3D%252Fsalon`.
- [ ] `list_migrations` incluye `restrict_scores_insert_columns`, y su `.sql` está en `supabase/migrations/` con la misma versión.
- [ ] `has_table_privilege('anon', 'public.scores', 'insert')` y la misma con `authenticated` devuelven `false`.
- [ ] `has_column_privilege` de INSERT sobre `created_at` e `id` devuelve `false` para `anon` y `authenticated`.
- [ ] `has_column_privilege` de INSERT sobre `game_id`, `player_name`, `score` y `user_id` devuelve `true` para `anon` y `authenticated`.
- [ ] `has_table_privilege` de SELECT sobre `public.scores` sigue en `false`, y `has_column_privilege(…, 'user_id', 'select')` sigue en `false`, para los dos roles.
- [ ] Las políticas de `scores` y `games` son las mismas que antes de la spec.
- [ ] Sin sesión, guardar una partida de ASTEROIDES crea una fila con `user_id` nulo.
- [ ] Con sesión, guardar una partida de ASTEROIDES crea una fila con el `user_id` de la cuenta y su alias.
- [ ] El asesor de seguridad solo muestra `security_definer_view` (SEC-001) y `auth_leaked_password_protection` (SEC-002).

---

## Decisiones

- **Sí:** spec redactada por `security-auditor` sin fase de preguntas; revísala con `/spec` antes de aprobarla.
- **Sí:** corregir en `safeNext` y no en cada llamador. Es el único filtro de `next`, así que un arreglo cubre el proxy, los dos Route Handlers y los formularios.
- **Sí:** validar la ruta ya normalizada, no solo el texto de entrada. Las secuencias `.`, `..` y `%2e` solo se resuelven al parsear.
- **No:** rechazar cualquier `next` que contenga `.` o `%`. Rompería rutas legítimas con query codificada.
- **No:** colapsar las barras iniciales (`//evil.com` → `/evil.com`). Mandaría a una ruta que no existe; `/juegos` es el destino por defecto documentado.
- **No:** añadir una comprobación de origen en cada `redirect()`. Duplica la lógica de `safeNext` sin cubrir nada más.
- **Sí:** INSERT por columna en `scores`, igual que el SELECT de la SPEC 14: revoke de tabla y grant por columna.
- **Sí:** `user_id` insertable también por `anon`. `saveScoreAction` envía `user_id: null` en el guardado de invitado, y sin ese grant fallaría. La política RLS ya obliga a `anon` a dejarlo nulo.
- **No:** quitar `user_id` del insert de invitado para dar ese grant solo a `authenticated`, como escribía la SPEC 14. Toca código para el mismo resultado. Se puede preferir en la revisión.
- **No:** `created_at` ni `id` insertables. `created_at` decide los empates y la fecha visible, y debe ser siempre `now()`.
- **Decisión abierta:** ¿revocar también UPDATE, DELETE, TRUNCATE, REFERENCES y TRIGGER de tabla sobre `games`, `scores` y `game_stats` a `anon` y `authenticated` (SEC-011, baja)? Hoy solo RLS los bloquea (no hay políticas de update ni delete). TRUNCATE no pasa por RLS, aunque PostgREST no lo expone. Es barato y cabría en la misma migración, pero amplía el alcance.
- **Decisión abierta:** ¿cambiar los privilegios por defecto del esquema `public` (`alter default privileges`) para que las tablas nuevas no nazcan con permisos completos para `anon` y `authenticated`? Afecta a todas las tablas futuras (por ejemplo, una de `profiles`); probablemente merece su propia spec.

---

## Riesgos

| Riesgo                                                                       | Mitigación                                                                                                                         |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Revocar el INSERT de tabla rompe el guardado de invitado o de cuenta.        | Grant explícito de las cuatro columnas que envía `saveScoreAction`. El paso 4 lo comprueba antes de cerrar.                        |
| Revocar el INSERT de tabla borra también los grants por columna.             | El `grant` va después del `revoke` en la misma migración.                                                                          |
| Un `next` legítimo empieza por `//` tras normalizar.                         | No hay rutas así en `app/`. El destino por defecto, `/juegos`, ya es el comportamiento documentado para un `next` no válido.       |
| Una migración futura vuelve a conceder INSERT o SELECT de tabla en `scores`. | `CLAUDE.md` lo documenta, como el SELECT de la SPEC 14, y `security-auditor` lo comprueba (invariante A.4).                        |
| `safeNext` se usa en cliente y servidor, y un error rompe el login.          | Es una función pura. El paso 1 la comprueba con el script de vectores antes de tocar la UI, y el paso 2 repasa los flujos en vivo. |

---

## Lo que **no** está en esta spec

- Revocar UPDATE, DELETE, TRUNCATE, REFERENCES y TRIGGER de tabla (decisión abierta, SEC-011).
- Cambiar los privilegios por defecto del esquema `public`.
- Anti-trampas en las puntuaciones y rate limit propio en las Server Actions.
- Cambios en los logs de Auth o en las respuestas de registro y recuperación.
- Reserva de alias y tabla `profiles`.
- Tests automáticos.

Cada una de estas, si llega, irá en su propia spec.
