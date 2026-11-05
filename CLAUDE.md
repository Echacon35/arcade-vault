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
- `npm run lint` — ESLint 9 flat config (`eslint-config-next` core-web-vitals + typescript)

No hay framework de tests configurado todavía.

## Stack y particularidades

- **Next.js 16.4 (App Router) + React 19.3 + TypeScript strict.** Las APIs difieren de versiones anteriores: consulta `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`) antes de escribir código.
- `next.config.ts` habilita flags que cambian el modelo de render/caché:
  - `cacheComponents: true` — Cache Components / PPR; el contenido dinámico debe ir dentro de `<Suspense>` y el cacheo se declara explícitamente (`"use cache"`).
  - `partialPrefetching: true` y `experimental.agentFeedback: true`.
- **Tailwind CSS v4** cargado vía el loader `@tailwindcss/turbopack` (regla `*.css` en `turbopack.rules`), no vía PostCSS. Los tokens de tema se definen en `app/globals.css` con `@theme inline`; no existe `tailwind.config.*`.
- Los tipos de props de rutas son globales y generados (p. ej. `LayoutProps<"/">` en `app/layout.tsx`); no se importan.
- Alias de imports: `@/*` → raíz del repo.
