# SPEC 01 — MVP visual de Arcade Vault

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-11-06
> **Objetivo:** Implementar en Next.js las cinco pantallas del template de `references/Templates` (Biblioteca, Detalle, Reproductor, Acceso y Salón de la Fama) con datos mock y sin ningún juego real.

---

## Por qué existe esta spec

El repo es todavía el scaffold de `create-next-app`, pero el tema visual ya está portado en `app/globals.css` y las fuentes en `app/layout.tsx`. Falta llevar las pantallas del prototipo (React UMD + Babel en el navegador) a componentes del App Router.

Dos particularidades del material de referencia condicionan el trabajo:

- **Los archivos de `references/Templates` tienen el contenido desplazado un lugar.** El nombre del archivo no corresponde a lo que contiene. La tabla real es:

  | Archivo              | Contenido real                          |
  | -------------------- | --------------------------------------- |
  | `Arcade Vault.html`  | `biblioteca.jsx` (Library, GameCard)    |
  | `biblioteca.jsx`     | `data.jsx` (GAMES, CATS, seededScores)  |
  | `data.jsx`           | CSS del tema (ya portado a globals.css) |
  | `auth.jsx`           | `nav.jsx` (Nav + menú móvil)            |
  | `detalle.jsx`        | `auth.jsx` (Auth)                       |
  | `nav.jsx`            | `app.jsx` (router, footer)              |
  | `app.jsx`            | `Arcade Vault.html`                     |
  | `salon.jsx`          | `reproductor.jsx` (GamePlayer)          |
  | `styles.css`         | `salon.jsx` (HallOfFame)                |

- **No existe el JSX de la pantalla Detalle (`GameDetail`).** Solo existe su CSS (`.av-detail`, `.detail-cover`, `.detail-info`, `.detail-tags`, `.stat-strip`, `.detail-actions`, `.leaderboard`, `.lb-row`). Esta spec la reconstruye a partir de esas clases.

---

## Alcance

**Dentro:**

- Layout global con `Nav` (logo, enlaces Biblioteca y Salón de la Fama, contador `CRÉDITOS · 03`, botón de sesión, menú hamburguesa con panel lateral móvil) y footer `© 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0`.
- **Biblioteca** (`/`): hero `ARCADE VAULT` con parpadeo, buscador por nombre, chips de categoría, grilla de tarjetas con efecto tilt y estado vacío `NO HAY RESULTADOS`.
- **Detalle** (`/juegos/[id]`): portada, título, tags, descripción larga, franja de 3 stats, botones `JUGAR` y `VOLVER`, y leaderboard top 10 del juego.
- **Reproductor** (`/juegos/[id]/jugar`): HUD (jugador, puntuación, vidas, nivel), botones `PAUSA`/`REANUDAR`, `FIN` y `SALIR`, arena CRT decorativa, overlay `EN PAUSA` y modal `FIN DEL JUEGO` con guardado de puntuación. El puntaje sube solo mediante un timer (simulación del template).
- **Acceso** (`/acceso`): tarjeta con pestañas `INICIAR SESIÓN` / `CREAR CUENTA`, campos usuario, correo (solo en crear cuenta) y contraseña, botón `JUGAR COMO INVITADO`, botones decorativos `GOOGLE` y `GITHUB`.
- **Salón de la Fama** (`/salon`): pestañas por juego, podio (2º-1º-3º), tabla de 12 filas y fila `TU MEJOR MARCA` cuando hay sesión.
- Página 404 temática (`app/not-found.tsx`) para rutas inexistentes e ids de juego inválidos.
- Sesión mock en `localStorage` y guardado de puntuaciones en `localStorage`.

**Fuera de alcance (para futuras specs):**

- Cualquier juego real (lógica, canvas, controles de teclado).
- Backend, base de datos, API routes o Server Actions.
- Autenticación real, validación de credenciales y login social (Google/GitHub).
- Mostrar las puntuaciones guardadas en `localStorage` dentro del Salón de la Fama o del leaderboard de Detalle.
- Sistema de créditos funcional.
- Menú de cuenta desplegable (el botón con el nombre cierra sesión directo, como en el template).
- Framework de tests.
- Migrar las clases de `globals.css` a utilidades Tailwind.

---

## Modelo de datos

Todos los datos son mock y estáticos. Se copian de la referencia (contenido real en `references/Templates/biblioteca.jsx`).

```ts
// lib/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;          // slug usado en la URL: "bloque-buster"
  title: string;       // "BLOQUE BUSTER"
  short: string;       // descripción de tarjeta
  long: string;        // descripción de Detalle
  cat: GameCategory;
  cover: string;       // clase CSS de portada: "cover-bricks"
  color: GameColor;    // color del botón JUGAR
  best: number;        // mejor puntuación
  plays: string;       // "12.4K"
};

export const GAMES: Game[];                     // los 8 juegos del template
export const CATS = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"] as const;
export function getGame(id: string): Game | undefined;
```

```ts
// lib/scores.ts
export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date "DD/MM/2026"

export function seededScores(seed: number, count?: number): ScoreRow[]; // generador determinista del template
export function seedFor(gameId: string): number; // gameId.length * 23 + 7, igual que el Salón del template
```

```ts
// lib/session.ts
export type SessionUser = { name: string };     // nombre en mayúsculas, máx. 10 caracteres
export type SavedScore = { game: string; score: number; name: string; at: number };

// Claves de localStorage (las mismas del template):
//   "av_user"   → SessionUser | null (JSON)
//   "av_scores" → SavedScore[] (JSON)
```

Convenciones:

- Los números se formatean con `toLocaleString("es-ES")`.
- Detalle y Salón usan la misma semilla `seedFor(game.id)`, así que el top 10 de Detalle coincide con las primeras 10 filas del Salón para ese juego.
- Todo acceso a `localStorage` va envuelto en `try/catch`. Si falla, la app sigue funcionando sin persistir.

---

## Plan de implementación

1. **Datos mock.** Crear `lib/games.ts` y `lib/scores.ts` con el modelo de arriba. `npm run build` pasa.
2. **Sesión.** Crear `lib/session.ts` (lectura/escritura de `av_user` y `av_scores`) y `components/session-provider.tsx` (Client Component con contexto `{ user, login(user), logout() }`). Crear el hook `useSession()`. El valor inicial en servidor es `null` y se hidrata desde `localStorage` en cliente sin warnings de hidratación. Envolver `children` en `app/layout.tsx` con el provider.
3. **Nav y footer.** Crear `components/nav.tsx` (Client Component). El enlace activo se calcula con `usePathname()`: Biblioteca activo en `/` y en `/juegos/*`, Salón activo en `/salon`. Incluye el panel móvil con backdrop. Añadir `Nav`, `<main className="av-main">` y footer en `app/layout.tsx`.
4. **Biblioteca.** Reemplazar `app/page.tsx` por el hero y un Client Component `components/library.tsx` (búsqueda + chips en estado local). Crear `components/game-card.tsx` con el tilt por `onMouseMove`. La tarjeta y su botón `JUGAR` navegan a `/juegos/[id]`.
5. **Detalle.** Crear `app/juegos/[id]/page.tsx` con `generateStaticParams` sobre `GAMES`. Si `getGame` devuelve `undefined`, llamar `notFound()`. Layout de dos columnas `.av-detail`:
   - Izquierda: `.detail-cover` con `.cover-bg` + clase de portada.
   - Derecha: `.detail-info` con título, `.detail-tags` (categoría y `1 JUGADOR`), descripción larga, `.stat-strip` (`Mejor puntuación`, `Partidas`, `Categoría`), `.detail-actions` (`JUGAR` → `/juegos/[id]/jugar`, `VOLVER` ghost → `/`) y `.leaderboard` con título `TOP 10` y filas `.lb-row` (`top1`/`top2`/`top3` en las tres primeras).
6. **404 temático.** Crear `app/not-found.tsx` reutilizando clases existentes: título `GAME OVER` en neón magenta, texto `ERROR 404 · PANTALLA NO ENCONTRADA` y botón `VOLVER A LA BIBLIOTECA`.
7. **Acceso.** Crear `app/acceso/page.tsx` y el Client Component `components/auth-form.tsx`. Enviar el formulario hace `login({ name })` (mayúsculas, máx. 10 caracteres, `PLAYER1` si está vacío) y navega a `/`. `JUGAR COMO INVITADO` hace `logout()` y navega a `/`. Ningún campo se valida.
8. **Reproductor.** Crear `app/juegos/[id]/jugar/page.tsx` (con `generateStaticParams` y `notFound()`) y el Client Component `components/game-player.tsx`. Replica el template:
   - El timer suma 10–99 puntos cada 220 ms mientras no está en pausa ni terminado.
   - El nivel sube al cruzar cada múltiplo de 2.500.
   - `FIN` abre el modal. `GUARDAR PUNTUACIÓN` agrega `SavedScore` a `av_scores` y muestra `▸ PUNTUACIÓN GUARDADA_`.
   - `JUGAR DE NUEVO` reinicia el estado. `VOLVER AL VAULT` va a `/`. `SALIR` va a `/juegos/[id]`.
   - El nombre inicial es `user.name` o `INVITADO`.
   - El timer se limpia al desmontar.
9. **Salón de la Fama.** Crear `app/salon/page.tsx` y el Client Component `components/hall-of-fame.tsx`: pestañas por juego (estado local, inicial `GAMES[0]`), podio, tabla de 12 filas con `animationDelay` escalonado, fila `you` si hay sesión (rango y puntaje calculados como en el template) y botón `VOLVER A LA BIBLIOTECA`.
10. **Limpieza.** Quitar del código los imports y referencias del scaffold que queden sin uso. `npm run lint` y `npm run build` pasan sin errores.

Reglas transversales:

- Las clases de `app/globals.css` se reutilizan tal cual.
- Los `style={{…}}` inline del template se traducen a utilidades Tailwind con los tokens del tema (`text-ink-faint`, `font-pixel`, `text-[11px]`, `tracking-[0.16em]`…).
- La navegación usa `<Link>` de `next/link` o `useRouter()`. Nunca `location.hash`.
- Las páginas siguen las APIs de Next 16 (`params` es una `Promise`, `PageProps<"/juegos/[id]">` global). Antes de escribirlas se consulta `node_modules/next/dist/docs/`.

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] `/` muestra el hero `ARCADE VAULT` y las 8 tarjetas de juegos con su portada CSS.
- [ ] Escribir `ser` en el buscador deja solo `SERPENTINA`.
- [ ] Pulsar el chip `SHOOTER` deja solo `INVASORES` y `ROCAS`.
- [ ] Buscar `zzz` muestra `NO HAY RESULTADOS`.
- [ ] Mover el ratón sobre una tarjeta la inclina y al salir vuelve a su posición.
- [ ] Pulsar una tarjeta navega a `/juegos/<id>` y muestra título, descripción larga, 3 stats y un leaderboard de 10 filas.
- [ ] Las 3 primeras filas del leaderboard de Detalle tienen colores oro, plata y bronce.
- [ ] `/juegos/no-existe` y `/juegos/no-existe/jugar` muestran el 404 temático con botón a la Biblioteca.
- [ ] `/ruta-inventada` muestra el mismo 404 temático.
- [ ] En `/juegos/<id>/jugar` la puntuación sube sola. `PAUSA` la congela y muestra `EN PAUSA`. `REANUDAR` la reanuda.
- [ ] `FIN` abre el modal `FIN DEL JUEGO` con la puntuación final.
- [ ] `GUARDAR PUNTUACIÓN` añade una entrada a `localStorage["av_scores"]` y muestra `▸ PUNTUACIÓN GUARDADA_`.
- [ ] `JUGAR DE NUEVO` deja puntuación en 0, vidas en 3 y nivel en 01.
- [ ] Salir del reproductor no deja el timer corriendo (sin errores ni actualizaciones en consola).
- [ ] En `/acceso`, la pestaña `CREAR CUENTA` muestra el campo de correo y `INICIAR SESIÓN` lo oculta.
- [ ] Iniciar sesión como `px_kai` navega a `/` y el Nav muestra `PX_KAI ▾`.
- [ ] Recargar la página mantiene la sesión.
- [ ] Pulsar `PX_KAI ▾` cierra la sesión y el Nav vuelve a mostrar `Iniciar Sesión`.
- [ ] `/salon` muestra podio y 12 filas. Cambiar de pestaña cambia los nombres y puntuaciones.
- [ ] Con sesión iniciada, `/salon` muestra la fila `▸ TU MEJOR MARCA EN <JUEGO>` en amarillo. Sin sesión no aparece.
- [ ] El enlace activo del Nav es `Biblioteca` en `/` y `/juegos/*`, y `Salón de la Fama` en `/salon`.
- [ ] A menos de 900 px de ancho aparece el botón `≡`, que abre el panel lateral. Pulsar el backdrop lo cierra.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en ninguna de las 5 pantallas.
- [ ] El footer aparece en todas las pantallas.

---

## Decisiones

- **Sí:** reconstruir Detalle a partir de su CSS. El JSX no existe en la referencia y las clases definen la estructura sin ambigüedad.
- **No:** esperar el `detalle.jsx` original. Bloquearía el MVP por una pantalla deducible.
- **Sí:** rutas reales del App Router en español (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/salon`, `/acceso`). URLs compartibles, coherentes con el idioma de la UI y aprovechan el prerender de Next 16.
- **No:** router por hash como el template. No es idiomático en Next y pierde SSR/prefetch.
- **No:** rutas en inglés. La interfaz está en español.
- **Sí:** el Reproductor simula partida con un timer, como el template. Muestra todos los estados visuales (jugando, pausa, fin, guardado) sin implementar ningún juego.
- **No:** reproductor estático o fuera del MVP. Dejaría sin validar el HUD y el modal.
- **Sí:** sesión y puntuaciones mock en `localStorage` con las claves del template (`av_user`, `av_scores`). Permite probar los estados con y sin sesión sin backend.
- **No:** mezclar puntuaciones guardadas en el Salón. Requiere decidir reglas de ranking. Va en otra spec.
- **Sí:** reutilizar las clases de `globals.css` y traducir solo los estilos inline a Tailwind. El CSS ya está portado y verificado.
- **No:** reescribir todo en Tailwind. Mucho trabajo y riesgo de diferencias visuales sin beneficio para el MVP.
- **Sí:** `lib/` para datos y sesión, `components/` para componentes. Coincide con el alias `@/*` y separa datos de UI.
- **Sí:** 404 temático con `notFound()` + `app/not-found.tsx`.
- **No:** redirigir ids inválidos a `/`. Oculta el error al usuario.
- **Sí:** elementos decorativos igual que el template (Google/GitHub sin acción, `CRÉDITOS · 03` fijo, clic en el nombre cierra sesión).
- **Sí:** Detalle y Salón comparten semilla por juego. Los datos mock son coherentes entre pantallas.
- **Sí:** filtros de Biblioteca y pestañas del Salón en estado local, no en `searchParams`. Fidelidad al template y evita marcar las páginas como dinámicas.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Hydration mismatch por leer `localStorage` durante el render (Nav, Salón, Reproductor). | El provider arranca con `user = null` en servidor y primer render de cliente, y lee `localStorage` en un efecto o con `useSyncExternalStore` con `getServerSnapshot` que devuelve `null`. |
| `cacheComponents: true` exige que los datos dinámicos estén dentro de `<Suspense>`. | Todas las páginas usan datos estáticos y `generateStaticParams`. Los Client Components que dependen de `localStorage` no bloquean el prerender. Si el build lo exige, se envuelven en `<Suspense>`. |
| `localStorage` no disponible (modo privado, cookies bloqueadas). | `try/catch` en todo acceso. La app funciona sin persistir. |
| APIs de Next 16 distintas a versiones anteriores (`params` como `Promise`, tipos globales `PageProps`). | Consultar `node_modules/next/dist/docs/01-app/` antes de escribir cada página. |
| Los archivos de referencia tienen nombres cruzados y llevan a portar el componente equivocado. | Usar la tabla de la sección "Por qué existe esta spec". |
| El timer del Reproductor sigue corriendo tras navegar. | Limpiar el `setInterval` en el cleanup del efecto. Está en los criterios de aceptación. |

---

## Lo que **no** está en esta spec

- Ningún juego real.
- Backend, base de datos o autenticación real.
- Login social funcional.
- Puntuaciones guardadas visibles en Salón o Detalle.
- Créditos funcionales.
- Menú de cuenta desplegable.
- Tests automatizados.
- Migración del CSS a Tailwind puro.

Cada una de estas cosas, si llega, irá en su propia spec.
