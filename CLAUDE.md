# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

Arcade Vault: plataforma para jugar juegos online y competir por la mayor cantidad de puntos. El catálogo y el leaderboard viven en Supabase; hay cuentas reales con Supabase Auth (correo en SPEC 12; Google y GitHub en SPEC 13). Con sesión, las puntuaciones se guardan vinculadas a la cuenta y con su alias (SPEC 14); los invitados siguen guardando con nombre libre.

**Juegos con motor real:** ASTEROIDES (SPEC 05), TETRA (SPEC 07), REBOTE (SPEC 08), VIBORITA (SPEC 09) y RANARIA (spec de game jam `specs/game-jam/frogger/01-frogger-core.md`). El resto de entradas de `lib/games.ts` (`bloque-buster`, `caida`, `serpentina`, …) no tienen motor y usan la partida simulada de `GamePlayer`.

**Rutas (`app/`):**

- `/` — landing (datos estáticos de `lib/home.ts`).
- `/juegos` — biblioteca, leída de Supabase.
- `/juegos/[id]` — detalle del juego con TOP 10.
- `/juegos/[id]/jugar` — partida (`GamePlayer` + `GameCanvas`) y guardado de puntuación (`actions.ts`).
- `/salon` — Salón de la Fama, leído de Supabase.
- `/acerca-de` — información y formulario de contacto vía Resend (`actions.ts`).
- `/acceso` — registro e inicio de sesión con correo y contraseña (SPEC 12, `components/auth-form.tsx`); admite `?modo=registro`, `?next=/ruta-interna` (filtrada con `safeNext`) y `?error=enlace|oauth`. Con sesión muestra «sesión iniciada como». Botones GOOGLE y GITHUB en ambas pestañas (SPEC 13).
- `/acceso/recuperar` y `/acceso/nueva-clave` — recuperación de contraseña.
- `/acceso/alias` — alias obligatorio tras el primer acceso por OAuth (SPEC 13, `components/alias-form.tsx`), prerrellenado con `suggestAlias`; admite `?next=`.
- `/auth/confirm` — Route Handler de los enlaces de los correos de Auth (`verifyOtp` con `token_hash`).
- `/auth/callback` — Route Handler de la vuelta de Google/GitHub (`exchangeCodeForSession`); sin alias → `/acceso/alias?next=`, error → `/acceso?error=oauth`.

**Autenticación (SPEC 12):** Supabase Auth con correo y contraseña y confirmación por correo; el alias del jugador vive en `user_metadata.alias` (no es único). `proxy.ts` (raíz) solo refresca las cookies de sesión con `lib/supabase/proxy.ts`; ninguna ruta exige sesión. Registro, login, logout y recuperación son Server Actions de `app/acceso/actions.ts` (devuelven `AuthResult`); la UI conoce la sesión por `useSession()` (`components/session-provider.tsx` → `lib/session.ts`, que lee con el cliente de navegador), con `user` (`{ id, email, name, hasAlias, aliasSuggestion, avatarUrl }`, `name` = alias o `JUGADOR`), `ready`, `refresh()` y `logout()`. Reglas compartidas (alias, correo, contraseña mínima de 8, `safeNext`, `OAUTH_PROVIDERS`, `suggestAlias`, `aliasInitials`) en `lib/auth-rules.ts`; piezas de UI comunes en `components/auth-ui.tsx`. El invitado sigue existiendo: sin sesión se juega y se guarda con nombre libre.

**Puntuaciones con cuenta (SPEC 14):** con sesión, `saveScoreAction` toma `user_id` y alias de `getUser()` en el servidor e ignora el `name` del cliente (si la sesión caducó, guarda como invitado). En `GamePlayer`, con sesión el modal de fin muestra el alias fijo (`.fixed-alias`) sin campo editable, en todos los juegos (los simulados siguen en `localStorage`). Las marcas con cuenta llevan el rombo `<AccountBadge />` (`components/account-badge.tsx`, SVG + texto `sr-only` «jugador con cuenta») en el TOP 10 del detalle, en el podio y la tabla del Salón y en el modal. Un invitado puede usar un nombre que coincide con un alias (reservar alias queda para una spec de `profiles`).

**OAuth y alias obligatorio (SPEC 13):** `signInWithOAuthAction` (Server Action) toma el origen de las cabeceras, pide la URL del proveedor con `redirectTo = <origen>/auth/callback?next=…` y hace `redirect()`; el verificador PKCE queda en cookie del servidor. Las cuentas OAuth nacen sin alias: `components/alias-guard.tsx` (montado en `app/layout.tsx`) redirige cualquier página a `/acceso/alias?next=<ruta>` mientras `user.hasAlias` sea `false` (exentas `/acceso/alias` y `/auth/*`); `saveAliasAction` escribe `user_metadata.alias`. Un mismo correo verificado vincula la identidad OAuth a la cuenta de correo existente (vinculación automática de Supabase) y conserva su alias. En el nav, hasta 1100 px (corte subido en SPEC 15) el botón de cuenta es compacto: sin sesión, icono pixel-art apagado que lleva a `/acceso`; con sesión, la foto de la cuenta.

**Foto de la cuenta (SPEC 15):** `user.avatarUrl` sale de `user_metadata.avatar_url` o `picture` (solo URLs `https:`; si no, `null`). `components/user-avatar.tsx` (`<UserAvatar name avatarUrl size={28|40|48} />`) la pinta en un círculo cian con `<img>` normal (`alt=""`, `referrerPolicy="no-referrer"`, sin `next/image` ni cambios en `next.config.ts`) y, si no hay foto o falla la carga (`onError`), muestra las iniciales del alias (`aliasInitials`: `PX_KAI` → `PK`, `NEONFOX` → `NE`). Es decorativa (`aria-hidden`): el alias va al lado o en el `aria-label` del botón. Tamaños: 28 px junto a `ALIAS ▾` en escritorio, 40 px como botón compacto hasta 1100 px y 48 px en la cabecera del menú de cuenta y del panel de la hamburguesa.

El desarrollo sigue **Spec Driven Design**: ante una feature nueva se escribe primero la spec en `specs/NN-<slug>.md` (con `/spec`) y luego se implementa a partir de ella (con `/spec-impl`, que crea la rama `spec-NN-<slug>` según `specs/.spec-config.yml`). Las specs llevan un campo `Estado` (Borrador → Aprobado → Implementado) y una sección "Problemas conocidos" cuando aplica. Las specs de juegos originales del agente `game-jam` viven aparte, en `specs/game-jam/<id>/` (hoy: `frogger/`, implementada como RANARIA, y `apila/`, en Borrador).

## Comandos

- `npm run dev` — servidor de desarrollo (http://localhost:3000)
- `npm run build` — build de producción (también hace el type-check)
- `npm run start` — sirve el build
- `npm run lint` — ESLint 9 flat config (`eslint-config-next` core-web-vitals + typescript + `eslint-config-prettier`)
- `npm run format` — Prettier sobre todo el repo (config en `.prettierrc.json`, exclusiones en `.prettierignore`)

Hook de Claude Code (`.claude/settings.json` → `.claude/hooks/format-and-lint.mjs`): tras cada Write/Edit, pasa el archivo por Prettier, luego (si es JS/TS) por `eslint --fix` con `no-multiple-empty-lines` en `max: 0` para borrar las líneas en blanco (respeta los template literals), y de nuevo por Prettier. En CSS/JSON borra las líneas en blanco por texto; Markdown solo pasa por Prettier. Es silencioso: los errores de lint que no se puedan corregir automáticamente no bloquean.

No hay framework de tests configurado todavía. La verificación visual se hace con el MCP de Playwright.

## Variables de entorno

Copia `.env.example` a `.env.local` (ignorado por git) y rellena los valores. El build necesita las de Supabase (ver abajo); las de Resend no.

**Resend (solo servidor, sin prefijo `NEXT_PUBLIC_`):**

- `RESEND_API_KEY` — API key de Resend para el formulario de contacto de `/acerca-de`.
- `CONTACT_TO_EMAIL` — buzón del equipo que recibe los mensajes.
- `CONTACT_FROM_EMAIL` — remitente en un dominio verificado en Resend, p. ej. `Arcade Vault <contacto@dominio>`. Sin dominio verificado se puede usar `Arcade Vault <onboarding@resend.dev>` solo para pruebas: Resend únicamente entrega al correo dueño de la cuenta, así que `CONTACT_TO_EMAIL` debe ser ese correo.

Si falta alguna, el formulario muestra el error genérico y la causa queda en el log del servidor.

**Supabase (públicas, con prefijo `NEXT_PUBLIC_`; llegan al navegador):**

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto cloud, `https://<ref>.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key (`sb_publishable_...`). Es pública por diseño; la protección la da RLS. Nunca uses aquí la secret / `service_role` key.

Solo las lee `lib/supabase/env.ts`, que lanza un error con el nombre de la variable que falte. Los clientes (`lib/supabase/server.ts`, `lib/supabase/client.ts` y `lib/supabase/public.ts`) se crean bajo demanda, así que importarlos no exige las variables. Pero `npm run build` sí las necesita y necesita red: `generateStaticParams` de `/juegos/[id]` y el prerender de `/juegos` y del detalle leen la base de datos (SPEC 06). Sin ellas, o con Supabase caído, el build falla.

## Supabase

- **Proyecto:** el MCP de Supabase está configurado en `.mcp.json` (proyecto cloud, sin stack local).
- **Esquema:** tablas `games` y `scores`, vistas `leaderboard` y `game_stats`, con RLS (lectura pública, sin update/delete). `scores` tiene CHECK de nombre `^[A-Z0-9_]{1,10}$` y puntuación entera entre 0 y 10.000.000, y `user_id uuid null` (FK a `auth.users`, `on delete set null`; SPEC 14). Insert: política `user_id is null or user_id = (select auth.uid())` (invitado sin `user_id`, cuenta solo con el suyo). `user_id` no es público: `anon`/`authenticated` no tienen SELECT de tabla sobre `scores`, solo por columna (`id, game_id, player_name, score, created_at`); ojo, Supabase da por defecto permisos de tabla completos, así que una columna nueva sería legible si se vuelve a conceder SELECT de tabla. `leaderboard` agrupa la mejor marca por cuenta (o por nombre si es invitado), expone `has_account` y no `user_id`, y es `security_invoker = false` para poder agrupar por una columna que el invocador no lee: el asesor de Supabase la marca como _security definer view_ y está aceptado (SPEC 14).
- **Migraciones:** se aplican con `apply_migration` del MCP de Supabase (no se usa la Supabase CLI). Cada migración aplicada tiene su `.sql` idéntico en `supabase/migrations/`, con el nombre `<version>_<nombre>.sql` y la misma versión que devuelve `list_migrations`. Es el historial versionado del esquema. Cada juego nuevo añade su fila a `games` con una migración `add_game_<id>`.
- **Auth (configuración manual en el panel; el MCP no la expone):** _Confirm email_ activado y contraseña mínima de 8 (Auth → Providers → Email); _Site URL_ y _Redirect URLs_ con `http://localhost:3000` (al desplegar hay que añadir el dominio de producción); SMTP propio con Resend (`smtp.resend.com:465`, usuario `resend`, contraseña = `RESEND_API_KEY`, remitente = `CONTACT_FROM_EMAIL`); plantillas _Confirm signup_ → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` y _Reset password_ → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/acceso/nueva-clave`. Proveedores OAuth (SPEC 13): GitHub OAuth App y cliente OAuth de Google («Aplicación web») con _callback_ `https://<ref>.supabase.co/auth/v1/callback` (Google: origen JS `http://localhost:3000`), activados en Auth → Sign In / Providers con su Client ID y Secret; la vinculación automática por correo verificado se deja por defecto. Google está en modo _Testing_: solo entran sus _test users_.
- **Tipos:** `lib/supabase/database.types.ts` se genera con `generate_typescript_types` del MCP; regenéralo tras cada migración, no lo edites a mano.
- **Acceso:** solo `lib/catalog.ts` (`getCatalog`, `getCatalogGame`, `getLeaderboard`: lecturas cacheadas con `"use cache"` + `cacheTag("games")` / `cacheTag("game-<id>")`, cliente público sin cookies) y las Server Actions (`app/juegos/[id]/jugar/actions.ts` → `saveScoreAction`, que con sesión guarda con la cuenta y su alias e invalida con `updateTag`; `app/acceso/actions.ts` → auth) hablan con Supabase, más `lib/session.ts` (cliente de navegador, solo para leer la sesión de Auth), `lib/supabase/proxy.ts` (refresco de sesión en `proxy.ts`), `app/auth/confirm/route.ts` y `app/auth/callback/route.ts`. Los componentes no importan `@supabase/*` ni `lib/supabase/*`. Un error de Supabase se devuelve como `{ ok: false }` y la UI muestra `SignalLost`.

## Juegos

- **Contrato de motor** (`games/types.ts`): `GameFactory(canvas, callbacks) → GameInstance` con `pause/resume/restart/destroy`; callbacks `onStats({ score, lives, level })` (solo cuando cambia), `onGameOver(finalScore)` y `onPauseToggle()`. El detalle y las extensiones permitidas están en `.claude/skills/add-game/contract.md`.
- **Registro:** `games/registry.ts` → `GAME_ENGINES`, indexado por el `id` del catálogo. Cada motor vive en `games/<id>/` (`engine.ts`, `constants.ts` y módulos propios). Utilidades compartidas en `games/shared/`: `input.ts` (`isTypingTarget`, para no capturar teclas mientras se escribe el nombre), `skins.ts` (`SKIN_IDS`) y `touch.ts` (tipo `TouchLayout`).
- **Canvas:** siempre 800×600 (`components/game-canvas.tsx`); el HUD de React solo muestra puntuación, vidas y nivel. Todo lo demás se dibuja dentro del canvas.
- **Assets y sonido** (extensiones E2/E3, aplicadas por REBOTE): en `public/games/<id>/…`, cargados con `new Image()` / `new Audio()` dentro de la factory, nunca al importar el módulo.
- **Skins (E4, aplicada):** cada juego define las suyas en `games/<id>/skins.ts` (mínimo `neon`, `retro`, `clasico`, `pastel`) y se registra en `GAME_SKINS`; las aplica el agente `skin-designer` (registro en `references/games-with-themes.md`). Pendiente: TETRA aún no tiene `skins.ts` ni está en `GAME_SKINS`.
- **Controles táctiles (SPEC 10 y 11):** cada juego con motor declara su pad en `games/<id>/touch.ts` y se registra en `GAME_TOUCH`; sin entrada no hay pad en móvil. El pad lo pinta `components/touch-pad.tsx` con el aspecto del Gamepad MK-II (SPEC 11, referencia en `references/gamepad-assets/`). Los juegos nuevos los porta el agente `mobile-porter` (registro en `references/games-with-touch.md`).
- **E1 (vidas opcionales) no está aplicada:** `GameStats.lives` sigue siendo `number`; TETRA emite `1`/`0` en lugar de `null`.
- **Doble registro del juego:** además de `GAME_ENGINES` y la fila en Supabase, cada juego va en `GAMES` de `lib/games.ts` (lo usan la landing y `generateStaticParams` de `/juegos/[id]/jugar`) y su portada `.cover-<id>` en `app/globals.css`.
- **Referencias:** `references/implemented-games.md` (juegos implementados, categoría y color) y `.claude/skills/add-game/recipe.md` (cómo integrar uno nuevo).

## Skills

- `/spec` y `/spec-impl` — de [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`). Instaladas en `.claude/skills/` y `.agents/skills/`, versionadas en `skills-lock.json`.
- `/spec-impl-game <spec>` (`.claude/skills/spec-impl-game/`) — igual que `/spec-impl` (lee y sigue sus fases 1–4, admite rutas de `specs/game-jam/<id>/`) y, al terminar el último paso, lanza automáticamente y en secuencia `skin-designer` y después `mobile-porter` con el `id` del juego (solo si está en `GAME_ENGINES`). No commitea.
- `/add-game <juego>` (`.claude/skills/add-game/`) — para integrar un juego de `references/started-games/`. Especialización de `/spec`: analiza el código original y escribe su spec en Borrador con la receta de integración (motor en `games/<id>/`, `GAME_ENGINES`, `GAMES`, portada, fila en la tabla `games` de Supabase, TOP 10 y Salón). No escribe código; después se implementa con `/spec-impl`. Archivos de apoyo: `recipe.md` (receta y trampas conocidas), `contract.md` (contrato de motor y extensiones E1–E3) y `game-spec-template.md`.
- `/frontend-design` — úsala siempre para diseñar interfaz de usuario. Las maquetas de referencia de la UI están en `references/Templates/`.

## Agentes

Definiciones en `.claude/agents/`; consulta el archivo de cada uno para el detalle.

- [`game-planner`](.claude/agents/game-planner.md) — propone y elige el próximo juego. Memoria: `references/game-suggestions-todo.md`.
- [`game-jam`](.claude/agents/game-jam.md) — diseña un juego original a partir de un tema y escribe sus specs en `specs/game-jam/<id>/`. No escribe código.
- [`skin-designer`](.claude/agents/skin-designer.md) — garantiza las skins `neon`, `retro`, `clasico` y `pastel` de un juego. Memoria: `references/games-with-themes.md`.
- [`mobile-porter`](.claude/agents/mobile-porter.md) — hace jugable un juego en el móvil (pad táctil y gestos, SPEC 10). Memoria: `references/games-with-touch.md`.

Rutina en la nube `game-jam-nocturno` (gestión con `/schedule`): de lunes a viernes a las 2:00 (Ciudad de México) invoca `game-jam` con la siguiente sugerencia pendiente y sube la rama `game-jam-<id>`, sin PR.

## Problemas conocidos

- **Correos de Auth solo al dueño de Resend** (SPEC 12): sin dominio verificado, el SMTP usa `onboarding@resend.dev` y los correos de confirmación y recuperación solo llegan a la cuenta de Resend. Para abrir el registro a terceros, verifica un dominio en Resend y cambia el _Sender email_ de Supabase y `CONTACT_FROM_EMAIL`.
- **Google OAuth en modo de prueba** (SPEC 13): solo pueden entrar las cuentas añadidas como _test users_ en Google Auth Platform. Para abrirlo a todos hay que publicar la pantalla de consentimiento.
- **Desbordamiento horizontal fuera del nav** (SPEC 13): `/salon` desborda a 360 px y varias páginas a 320 px; el nav y la landing ya caben a 360/390 px.

- **Catálogo desactualizado tras añadir un juego** (SPEC 07): Next reutiliza entre builds las respuestas de `fetch` de Supabase guardadas en `.next/cache/fetch-cache` sin tags, así que `/juegos` puede salir sin el juego nuevo. Antes del build que sigue a una migración de datos, borra `.next/cache/fetch-cache/` (y `.next/server/route-cache` si existe) y comprueba que `.next/server/app/juegos.html` contiene el juego nuevo.

## Stack y particularidades

- **Next.js 16.4 (App Router) + React 19.3 + TypeScript strict.** Las APIs difieren de versiones anteriores: consulta `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`) antes de escribir código.
- `next.config.ts` habilita flags que cambian el modelo de render/caché:
  - `cacheComponents: true` — Cache Components / PPR; el contenido dinámico debe ir dentro de `<Suspense>` y el cacheo se declara explícitamente (`"use cache"`).
  - `partialPrefetching: true` y `experimental.agentFeedback: true`.
  - `allowedDevOrigins: ['192.168.1.71']` — permite abrir `npm run dev` desde el móvil en la red local.
- **Tailwind CSS v4** cargado vía el loader `@tailwindcss/turbopack` (regla `*.css` en `turbopack.rules`), no vía PostCSS. Los tokens de tema se definen en `app/globals.css` con `@theme inline`; no existe `tailwind.config.*`.
- Los tipos de props de rutas son globales y generados (p. ej. `LayoutProps<"/">` en `app/layout.tsx`); no se importan.
- Alias de imports: `@/*` → raíz del repo.
- Dependencias de servidor: `resend`, `@supabase/ssr`, `@supabase/supabase-js` y `server-only` (lo importa `lib/catalog.ts`).
