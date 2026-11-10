# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

Arcade Vault: plataforma para jugar juegos online y competir por la mayor cantidad de puntos. Actualmente es el scaffold de `create-next-app`; aún no hay juegos, backend ni base de datos.

El desarrollo sigue **Spec Driven Design** con las skills `/spec` y `/spec-impl` de [Klerith/fernando-skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`). Ante una feature nueva, se espera escribir primero la spec y luego implementarla a partir de ella.

## Comandos

- `npm run dev` — servidor de desarrollo (http://localhost:3000)
- `npm run build` — build de producción (también hace el type-check)
- `npm run start` — sirve el build
- `npm run lint` — ESLint 9 flat config (`eslint-config-next` core-web-vitals + typescript + `eslint-config-prettier`)
- `npm run format` — Prettier sobre todo el repo (config en `.prettierrc.json`, exclusiones en `.prettierignore`)

Hook de Claude Code (`.claude/settings.json` → `.claude/hooks/format-and-lint.mjs`): tras cada Write/Edit, pasa el archivo por Prettier, luego (si es JS/TS) por `eslint --fix` con `no-multiple-empty-lines` en `max: 0` para borrar las líneas en blanco (respeta los template literals), y de nuevo por Prettier. En CSS/JSON borra las líneas en blanco por texto; Markdown solo pasa por Prettier. Es silencioso: los errores de lint que no se puedan corregir automáticamente no bloquean.

No hay framework de tests configurado todavía.

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

- **Esquema:** tablas `games` y `scores`, vistas `leaderboard` y `game_stats`, con RLS (lectura pública, insert anónimo en `scores`, sin update/delete).
- **Migraciones:** se aplican con `apply_migration` del MCP de Supabase (no se usa la Supabase CLI). Cada migración aplicada tiene su `.sql` idéntico en `supabase/migrations/`, con el nombre `<version>_<nombre>.sql` y la misma versión que devuelve `list_migrations`. Es el historial versionado del esquema.
- **Tipos:** `lib/supabase/database.types.ts` se genera con `generate_typescript_types` del MCP; regenéralo tras cada migración, no lo edites a mano.
- **Acceso:** solo `lib/catalog.ts` (lecturas cacheadas con `"use cache"` + `cacheTag`, cliente público sin cookies) y las Server Actions (p. ej. `app/juegos/[id]/jugar/actions.ts`, que invalida con `updateTag`) hablan con Supabase. Los componentes no importan `@supabase/*` ni `lib/supabase/*`.

## Skills

Usa siempre /frontend-design para diseñar interfaz de usuario.

## Stack y particularidades

- **Next.js 16.4 (App Router) + React 19.3 + TypeScript strict.** Las APIs difieren de versiones anteriores: consulta `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`) antes de escribir código.
- `next.config.ts` habilita flags que cambian el modelo de render/caché:
  - `cacheComponents: true` — Cache Components / PPR; el contenido dinámico debe ir dentro de `<Suspense>` y el cacheo se declara explícitamente (`"use cache"`).
  - `partialPrefetching: true` y `experimental.agentFeedback: true`.
- **Tailwind CSS v4** cargado vía el loader `@tailwindcss/turbopack` (regla `*.css` en `turbopack.rules`), no vía PostCSS. Los tokens de tema se definen en `app/globals.css` con `@theme inline`; no existe `tailwind.config.*`.
- Los tipos de props de rutas son globales y generados (p. ej. `LayoutProps<"/">` en `app/layout.tsx`); no se importan.
- Alias de imports: `@/*` → raíz del repo.
