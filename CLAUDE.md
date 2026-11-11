# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

SArcade Vault: plataforma para jugar juegos online y competir por la mayor cantidad de puntos. El catálogo y el leaderboard viven en Supabase; las puntuaciones se guardan con nombre libre (sin cuentas reales).

**Juegos con motor real:** ASTEROIDES (SPEC 05), TETRA (SPEC 07), REBOTE (SPEC 08) y VIBORITA (SPEC 09). El resto de entradas de `lib/games.ts` (`bloque-buster`, `caida`, `serpentina`, …) no tienen motor y usan la partida simulada de `GamePlayer`.

**Rutas (`app/`):**

- `/` — landing (datos estáticos de `lib/home.ts`).
- `/juegos` — biblioteca, leída de Supabase.
- `/juegos/[id]` — detalle del juego con TOP 10.
- `/juegos/[id]/jugar` — partida (`GamePlayer` + `GameCanvas`) y guardado de puntuación (`actions.ts`).
- `/salon` — Salón de la Fama, leído de Supabase.
- `/acerca-de` — información y formulario de contacto vía Resend (`actions.ts`).
- `/acceso` — login/registro simulado: la "sesión" es un nombre en `localStorage` (`lib/session.ts`, `components/session-provider.tsx`); no hay auth real.

El desarrollo sigue **Spec Driven Design**: ante una feature nueva se escribe primero la spec en `specs/NN-<slug>.md` (con `/spec`) y luego se implementa a partir de ella (con `/spec-impl`, que crea la rama `spec-NN-<slug>` según `specs/.spec-config.yml`). Las specs llevan un campo `Estado` (Borrador → Aprobado → Implementado) y una sección "Problemas conocidos" cuando aplica.

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
- **Esquema:** tablas `games` y `scores`, vistas `leaderboard` y `game_stats`, con RLS (lectura pública, insert anónimo en `scores`, sin update/delete). `scores` tiene CHECK de nombre `^[A-Z0-9_]{1,10}$` y puntuación entera entre 0 y 10.000.000.
- **Migraciones:** se aplican con `apply_migration` del MCP de Supabase (no se usa la Supabase CLI). Cada migración aplicada tiene su `.sql` idéntico en `supabase/migrations/`, con el nombre `<version>_<nombre>.sql` y la misma versión que devuelve `list_migrations`. Es el historial versionado del esquema. Cada juego nuevo añade su fila a `games` con una migración `add_game_<id>`.
- **Tipos:** `lib/supabase/database.types.ts` se genera con `generate_typescript_types` del MCP; regenéralo tras cada migración, no lo edites a mano.
- **Acceso:** solo `lib/catalog.ts` (`getCatalog`, `getCatalogGame`, `getLeaderboard`: lecturas cacheadas con `"use cache"` + `cacheTag("games")` / `cacheTag("game-<id>")`, cliente público sin cookies) y las Server Actions (`app/juegos/[id]/jugar/actions.ts` → `saveScoreAction`, que invalida con `updateTag`) hablan con Supabase. Los componentes no importan `@supabase/*` ni `lib/supabase/*`. Un error de Supabase se devuelve como `{ ok: false }` y la UI muestra `SignalLost`.

## Juegos

- **Contrato de motor** (`games/types.ts`): `GameFactory(canvas, callbacks) → GameInstance` con `pause/resume/restart/destroy`; callbacks `onStats({ score, lives, level })` (solo cuando cambia), `onGameOver(finalScore)` y `onPauseToggle()`. El detalle y las extensiones permitidas están en `.claude/skills/add-game/contract.md`.
- **Registro:** `games/registry.ts` → `GAME_ENGINES`, indexado por el `id` del catálogo. Cada motor vive en `games/<id>/` (`engine.ts`, `constants.ts` y módulos propios). Utilidades compartidas en `games/shared/` (p. ej. `isTypingTarget` para no capturar teclas mientras se escribe el nombre).
- **Canvas:** siempre 800×600 (`components/game-canvas.tsx`); el HUD de React solo muestra puntuación, vidas y nivel. Todo lo demás se dibuja dentro del canvas.
- **Assets y sonido** (extensiones E2/E3, aplicadas por REBOTE): en `public/games/<id>/…`, cargados con `new Image()` / `new Audio()` dentro de la factory, nunca al importar el módulo.
- **E1 (vidas opcionales) no está aplicada:** `GameStats.lives` sigue siendo `number`; TETRA emite `1`/`0` en lugar de `null`.
- **Doble registro del juego:** además de `GAME_ENGINES` y la fila en Supabase, cada juego va en `GAMES` de `lib/games.ts` (lo usan la landing y `generateStaticParams` de `/juegos/[id]/jugar`) y su portada `.cover-<id>` en `app/globals.css`.
- **juegos** ver archivo references\implemented-games.md cuando necesites revisar por los juegos implementadosy como implementar uno nuevo

## Skills

- `/spec` y `/spec-impl` — de [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`). Instaladas en `.claude/skills/` y `.agents/skills/`, versionadas en `skills-lock.json`.
- `/add-game <juego>` (`.claude/skills/add-game/`) — para integrar un juego de `references/started-games/`. Especialización de `/spec`: analiza el código original y escribe su spec en Borrador con la receta de integración (motor en `games/<id>/`, `GAME_ENGINES`, `GAMES`, portada, fila en la tabla `games` de Supabase, TOP 10 y Salón). No escribe código; después se implementa con `/spec-impl`. Archivos de apoyo: `recipe.md` (receta y trampas conocidas), `contract.md` (contrato de motor y extensiones E1–E3) y `game-spec-template.md`.
- Agente `game-planner` (`.claude/agents/game-planner.md`) — planifica y decide qué juego nuevo encaja en la plataforma. Su memoria de sugerencias (con estado) está en `references/game-suggestions-todo.md`; no escribe código.
- `/frontend-design` — úsala siempre para diseñar interfaz de usuario. Las maquetas de referencia de la UI están en `references/Templates/`.

## Problemas conocidos

- **Catálogo desactualizado tras añadir un juego** (SPEC 07): Next reutiliza entre builds las respuestas de `fetch` de Supabase guardadas en `.next/cache/fetch-cache` sin tags, así que `/juegos` puede salir sin el juego nuevo. Antes del build que sigue a una migración de datos, borra `.next/cache/fetch-cache/` (y `.next/server/route-cache` si existe) y comprueba que `.next/server/app/juegos.html` contiene el juego nuevo.

## Stack y particularidades

- **Next.js 16.4 (App Router) + React 19.3 + TypeScript strict.** Las APIs difieren de versiones anteriores: consulta `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`) antes de escribir código.
- `next.config.ts` habilita flags que cambian el modelo de render/caché:
  - `cacheComponents: true` — Cache Components / PPR; el contenido dinámico debe ir dentro de `<Suspense>` y el cacheo se declara explícitamente (`"use cache"`).
  - `partialPrefetching: true` y `experimental.agentFeedback: true`.
- **Tailwind CSS v4** cargado vía el loader `@tailwindcss/turbopack` (regla `*.css` en `turbopack.rules`), no vía PostCSS. Los tokens de tema se definen en `app/globals.css` con `@theme inline`; no existe `tailwind.config.*`.
- Los tipos de props de rutas son globales y generados (p. ej. `LayoutProps<"/">` en `app/layout.tsx`); no se importan.
- Alias de imports: `@/*` → raíz del repo.
- Dependencias de servidor: `resend`, `@supabase/ssr`, `@supabase/supabase-js` y `server-only` (lo importa `lib/catalog.ts`).
