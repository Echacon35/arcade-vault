# SPEC 04 — Conexión de Supabase con Next.js

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-09
> **Objetivo:** Conectar la app de Next.js al proyecto cloud de Supabase que ya existe (dependencias, variables de entorno y clientes listos para usar) sin tocar la base de datos.

---

## Por qué existe esta spec

Hoy la app no habla con Supabase. El catálogo vive en `GAMES` (`lib/games.ts`), y la sesión y las puntuaciones son mocks en `localStorage` (`lib/session.ts`, `lib/scores.ts`).

Esta spec solo deja lista la conexión. Lo que use la base de datos (catálogo, Auth, puntuaciones) irá en specs posteriores, cada una con su propio diseño de datos.

Particularidades:

- **El proyecto cloud ya existe** y está conectado por MCP. Esta spec no lo modifica.
- **Ningún cambio en la base de datos.** No se crean tablas, columnas, políticas, funciones ni migraciones. No se ejecuta SQL de escritura.
- **`cacheComponents: true`.** Los clientes se crean bajo demanda dentro de funciones, nunca en el nivel superior de un módulo. Así importarlos no lee variables ni hace peticiones durante el build.

---

## Alcance

**Dentro:**

- Dependencias: `@supabase/supabase-js`, `@supabase/ssr` y `server-only`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.example`, `.env.local` y `CLAUDE.md`.
- Tres módulos en `lib/supabase/`:
  - `env.ts`: lee y valida las dos variables.
  - `server.ts`: cliente de servidor con cookies (`createServerClient`), para Server Components, Server Actions y Route Handlers.
  - `client.ts`: cliente de navegador (`createBrowserClient`), para Client Components.
- Verificación de la conexión contra el endpoint de salud de Supabase, sin leer ni escribir tablas.

**Fuera de alcance (para futuras specs):**

- Cualquier cambio en la base de datos: tablas, columnas, RLS, funciones, triggers, buckets, seeds o migraciones.
- Supabase CLI (`supabase init`, `link`, `db push`) y la carpeta `supabase/`.
- Mover el catálogo `GAMES` a Supabase. `lib/games.ts` y sus consumidores no cambian.
- Supabase Auth, cambios en `/acceso` y sustitución de `lib/session.ts`.
- `proxy.ts` de refresco de sesión. Sin Auth no tiene nada que refrescar.
- Puntuaciones reales y Salón de la Fama real.
- Tipos generados con `supabase gen types`.
- Páginas o endpoints de diagnóstico de la conexión.
- Tests automatizados.

---

## Modelo de datos

Esta spec no tiene modelo de datos: la base de datos queda tal cual está.

```ts
// lib/supabase/env.ts — seguro para cliente y servidor
export function getSupabaseEnv(): { url: string; publishableKey: string };
// Lanza un Error en español que nombra la variable que falta.

// lib/supabase/server.ts — import "server-only"
export async function createClient(): Promise<SupabaseClient>;
// createServerClient(url, key, { cookies: { getAll, setAll } }) con await cookies().
// setAll va en try/catch: desde un Server Component no se pueden escribir cookies.

// lib/supabase/client.ts — "use client" no hace falta; solo se importa desde Client Components
export function createClient(): SupabaseClient;
// createBrowserClient(url, key).
```

Variables de entorno:

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=                 # https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=     # sb_publishable_...
```

Convenciones:

- Solo `lib/supabase/env.ts` lee `process.env.NEXT_PUBLIC_SUPABASE_*`, con acceso literal (`process.env.NEXT_PUBLIC_SUPABASE_URL`) para que Next las inyecte en el bundle del navegador.
- Ningún módulo de `lib/supabase/` crea un cliente al importarse.
- Ningún archivo `"use client"` importa `lib/supabase/server.ts`. `server-only` lo garantiza en build.
- No se usa la `service_role` / secret key en ningún lado.

---

## Plan de implementación

1. **Dependencias.** `npm install @supabase/supabase-js @supabase/ssr server-only`. `npm run build` pasa.
2. **Variables de entorno.** Añadir las 2 variables a `.env.example` con comentarios, como las de Resend. Obtener sus valores con el MCP (`get_project_url`, `get_publishable_keys`) y escribirlos en `.env.local`. Actualizar la sección `Variables de entorno` de `CLAUDE.md`: estas dos son públicas y llevan `NEXT_PUBLIC_`; las de Resend siguen siendo solo de servidor. El build no depende de ellas.
3. **Clientes.** Antes, leer en `node_modules/next/dist/docs/` las guías de `cookies()` y `environment-variables.md`, y los tipos de `createServerClient` / `createBrowserClient` del `@supabase/ssr` instalado. Crear `lib/supabase/env.ts`, `server.ts` y `client.ts` según el modelo de datos. Todavía no se usan desde ninguna página.
4. **Verificación.** Comprobar la conexión con `GET <NEXT_PUBLIC_SUPABASE_URL>/auth/v1/health` y la cabecera `apikey: <publishable key>`: debe responder `200`. Comprobar con el MCP `list_tables` que el esquema `public` sigue igual que antes de empezar.
5. **Limpieza.** `npm run lint` y `npm run build` pasan sin errores.

Reglas transversales:

- **La base de datos no se toca.** Prohibido `apply_migration`, `execute_sql` de escritura, el dashboard o la CLI para cambiar el esquema o los datos.
- El MCP de Supabase solo se usa para leer: URL, publishable key y listado de tablas.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] `package.json` lista `@supabase/supabase-js`, `@supabase/ssr` y `server-only` en `dependencies`.
- [ ] Existen `lib/supabase/env.ts`, `lib/supabase/server.ts` y `lib/supabase/client.ts`, y `server.ts` importa `server-only`.
- [ ] `GET /auth/v1/health` con la URL y la publishable key de `.env.local` responde `200`.
- [ ] `list_tables` del MCP devuelve lo mismo que antes de implementar la spec.
- [ ] No existe la carpeta `supabase/` ni ningún archivo `.sql` nuevo.
- [ ] `lib/games.ts` no cambia y todas las páginas se ven igual que antes.
- [ ] `npm run build` pasa también sin las variables de Supabase en el entorno.
- [ ] `.env.example` incluye las 2 variables nuevas y `.env.local` no está versionado.
- [ ] Ningún archivo del repo contiene la `service_role` / secret key.

---

## Decisiones

- **Sí:** limitar esta spec a la conexión. El usuario pidió explícitamente no crear tablas ni campos.
- **No:** migrar el catálogo a una tabla `games`. Requiere cambios en la BD; irá en otra spec si se decide.
- **No:** Supabase CLI ni carpeta `supabase/`. Solo hacen falta para gestionar el esquema, y esta spec no lo toca.
- **Sí:** clientes de servidor y navegador con `@supabase/ssr`. Es la forma estándar de conectar Supabase con el App Router y la que usarán Auth y las demás specs.
- **No:** `proxy.ts`. Su función es refrescar la sesión de Auth, que aún no existe.
- **Sí:** nombres `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Son los estándar de Supabase y el cliente de navegador los necesita. La publishable key es pública por diseño. Contradice la nota actual de `CLAUDE.md` ("ninguna lleva `NEXT_PUBLIC_`"), así que el paso 2 la actualiza.
- **Sí:** clientes creados bajo demanda. El build no depende de la red ni de las variables.
- **Sí:** verificar con `/auth/v1/health`. Demuestra que la URL y la key son válidas sin leer ni escribir ninguna tabla.
- **No:** página o endpoint de diagnóstico. Sería código sin uso real que habría que borrar después.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Algún paso termina modificando la BD (migración, SQL, dashboard). | Regla transversal que lo prohíbe y criterio que compara `list_tables` antes y después. |
| `cookies()` cambió de firma en Next 16 o no se puede usar en algún contexto. | El paso 3 obliga a leer la guía local antes de escribir `server.ts`. |
| La API de `@supabase/ssr` (`getAll`/`setAll`) difiere según la versión. | El paso 3 obliga a leer los tipos del paquete instalado. |
| Se importa `lib/supabase/server.ts` desde un Client Component. | `server-only` rompe el build. |
| Se filtra la secret key en el repo o el bundle. | Solo se usa la publishable key. Un criterio lo revisa. |

---

## Lo que **no** está en esta spec

- Tablas, campos, políticas, migraciones o cualquier otro cambio en la base de datos.
- Supabase CLI.
- Catálogo, Auth, puntuaciones o Salón de la Fama con datos reales.
- `proxy.ts`.
- Tipos generados con `supabase gen types`.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
