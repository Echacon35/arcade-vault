# SPEC 02 — Landing de inicio

> **Estado:** Implementado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-06
> **Objetivo:** Reemplazar `/` por la landing del template `references/Templates/home-about`, mover la Biblioteca a `/juegos` y añadir al Nav `Inicio` y un `Acerca de` deshabilitado.

---

## Por qué existe esta spec

Hoy `/` es la Biblioteca. El nuevo template agrega una página de inicio (hero, features, juegos, stats, actividad, precios y CTA final) y una página "Acerca de".

Particularidades del material de referencia:

- **`arcade-vault-standalone.html` es un bundle comprimido** (~1,5 MB, cargador `__bundler`). No se lee ni se copia. Su código legible está en los archivos hermanos de la misma carpeta:

  | Archivo       | Contenido                                                                |
  | ------------- | ------------------------------------------------------------------------ |
  | `home.jsx`    | `Home`, `FloatingSilhouettes`, `MiniCard`, `FeatureIcon`, `useReveal`    |
  | `nav.jsx`     | `Nav` con los enlaces `Inicio` y `Acerca de` añadidos                    |
  | `about.jsx`   | `About` (fuera de alcance)                                               |
  | `styles.css`  | Tema completo. Bloques nuevos: `HOME PAGE`, `ACTIVITY`, `PRICING`        |

- En la referencia, la ruta `home` y la ruta `biblioteca` son pantallas distintas. Por eso la Biblioteca necesita una URL propia.

---

## Alcance

**Dentro:**

- **Inicio** (`/`): las seis secciones de `home.jsx` en el mismo orden:
  1. Hero con siluetas pixel flotantes, eyebrow `▸ INSERTA UNA MONEDA_`, título de tres líneas `EL ARCADE / CLÁSICO ESTÁ / DE VUELTA`, subtítulo, botones `▶  EXPLORAR JUEGOS` y `✦  CREAR CUENTA`, e indicador `DESLIZA ▼`.
  2. `// 01 ¿POR QUÉ ARCADE VAULT?` con 4 tarjetas de feature e iconos pixel SVG.
  3. `// 02 JUEGOS DISPONIBLES AHORA` con 6 mini-tarjetas (`GAMES.slice(0, 6)`) y botón `VER TODOS LOS JUEGOS →`.
  4. Franja de stats (`12+ JUEGOS`, `MILES DE PARTIDAS`, `GLOBAL RANKING`).
  5. `// 03 ACTIVIDAD EN VIVO`: ticker `▸ ÚLTIMAS PUNTUACIONES` (7 filas) y `▸ TOP JUGADORES · HOY` (5 filas con barra) con enlace `VER SALÓN →`.
  6. `// 04 PRECIOS`: tarjeta `JUGADOR VAULT $0 / SIEMPRE` con sello `FREE PLAY`, botón `EMPEZAR GRATIS →` y 3 preguntas FAQ.
  7. CTA final `¿LISTO PARA JUGAR?` con botón `INSERTAR MONEDA →`.
- Animación de aparición al hacer scroll (`.reveal` → `.reveal.in`) con `IntersectionObserver`.
- **Biblioteca movida a `/juegos`**: mismo hero `ARCADE VAULT`, buscador, chips y grilla de SPEC 01.
- **Nav** con enlaces `Inicio`, `Biblioteca`, `Salón de la Fama` y `Acerca de` (deshabilitado), en la barra y en el panel móvil.
- `Acerca de` deshabilitado: atenuado, `cursor: not-allowed`, `aria-disabled="true"`, etiqueta `PRÓXIMAMENTE` y sin navegación.
- Pestaña inicial de `/acceso` controlada por `?modo=registro`.
- Actualizar todos los enlaces internos que hoy apuntan a `/` con significado de "Biblioteca".
- Respetar `prefers-reduced-motion`: sin reveal ni siluetas animadas, todo visible.

**Fuera de alcance (para futuras specs):**

- Página `Acerca de` / contacto (`about.jsx`) y su ruta.
- Datos reales o derivados en ticker, top jugadores y stats.
- Reemplazar `12+ JUEGOS` por el número real del catálogo.
- Cambios en las pantallas de SPEC 01 más allá de sus enlaces.
- Bloques de `styles.css` no usados por la landing (`ABOUT PAGE`, `GAMEPAD`, `tweaks`, `spinner`).
- Tests automatizados.

---

## Modelo de datos

Datos mock estáticos copiados de `home.jsx`. Viven en `lib/home.ts`.

```ts
// lib/home.ts
import type { GameColor } from "@/lib/games";

export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export type Feature = { icon: FeatureIconKind; title: string; desc: string; color: GameColor };
export type HomeStat = { n: string; u: string; s: string };
export type TickerRow = { player: string; game: string; score: number; ago: string; color: GameColor };
export type TopPlayer = { rank: number; player: string; score: number };
export type Faq = { q: string; a: string };

export const FEATURES: Feature[];      // 4
export const HOME_STATS: HomeStat[];   // 3
export const TICKER: TickerRow[];      // 7
export const TOP_PLAYERS: TopPlayer[]; // 5
export const PRICING_PERKS: string[];  // 6
export const FAQS: Faq[];              // 3
```

Cambio de texto respecto a la referencia: la feature `JUEGOS CLÁSICOS` dice `Bloque Buster, Caída, Serpentina y muchos más. Los mejores arcades de todos los tiempos en un solo lugar.`

```ts
// components/auth-form.tsx
type Tab = "in" | "up"; // ya existe
// Searchparam: /acceso?modo=registro → pestaña inicial "up". Cualquier otro valor o ausencia → "in".
```

Convenciones:

- Los números se formatean con `toLocaleString("es-ES")`, como en SPEC 01.
- El ancho de la barra de top jugadores es `100 - i * 16` %.
- Retrasos escalonados: features `i * 80` ms, stats `i * 90` ms, filas del ticker `i * 60` ms.

---

## Plan de implementación

1. **CSS.** Copiar a `app/globals.css`, al final, los bloques `HOME PAGE` (líneas 930–1070), `ACTIVITY` (1621–1671) y `PRICING` (1672–1730) de `references/Templates/home-about/styles.css`. Añadir un bloque `@media (prefers-reduced-motion: reduce)` que deja `.reveal` visible sin transición y detiene la animación de `.silo`. Añadir la clase `.nav-disabled` (atenuado, `cursor: not-allowed`) y `.soon` (etiqueta `PRÓXIMAMENTE` pequeña en `font-pixel`). `npm run build` pasa.
2. **Mover la Biblioteca.** Crear `app/juegos/page.tsx` con el contenido actual de `app/page.tsx` (hero `ARCADE VAULT` + `<Library />`) y metadata `Biblioteca · Arcade Vault`. Dejar `app/page.tsx` temporalmente igual. Verificar que `/juegos` y `/juegos/[id]` conviven.
3. **Enlaces a la Biblioteca.** Cambiar a `/juegos`:
   - `app/juegos/[id]/page.tsx` → botón `VOLVER`.
   - `app/not-found.tsx` → `VOLVER A LA BIBLIOTECA`.
   - `components/hall-of-fame.tsx` → `VOLVER A LA BIBLIOTECA`.
   - `components/game-player.tsx` → `VOLVER AL VAULT`.
   - `components/auth-form.tsx` → navegación tras login y tras `JUGAR COMO INVITADO`.
4. **Nav.** En `components/nav.tsx`:
   - `Section` pasa a `"inicio" | "biblioteca" | "salon" | "acceso"`.
   - `sectionFor`: `/` → `inicio`; `/juegos` y `/juegos/*` → `biblioteca`.
   - El logo sigue enlazando a `/`.
   - Barra y panel móvil: `Inicio` → `/`, `Biblioteca` → `/juegos`, `Salón de la Fama` → `/salon`, y `Acerca de` como `<span>` con `.nav-disabled`, `aria-disabled="true"`, `title="Próximamente"` y `<span className="soon">PRÓXIMAMENTE</span>`.
   - El enlace de cuenta del panel móvil se mantiene.
5. **Datos de la landing.** Crear `lib/home.ts` con el modelo de arriba.
6. **Piezas presentacionales.** Crear Server Components en `components/home/`:
   - `floating-silhouettes.tsx`: las 8 siluetas SVG (`s1`–`s8`) con `aria-hidden`.
   - `feature-icon.tsx`: los 4 iconos de `FeatureIcon`.
   - `mini-card.tsx`: `<Link href="/juegos/[id]">` con `.mini-card`, portada CSS, título y categoría.
7. **Reveal.** Crear el Client Component `components/home/reveal-observer.tsx`. Renderiza `null`. En un efecto observa los `.reveal` del documento con `threshold: 0.12`, añade `in` al intersectar y desconecta en el cleanup.
8. **Landing.** Reescribir `app/page.tsx` como Server Component con las siete partes del alcance usando `lib/home.ts` y `components/home/*`. Metadata `Arcade Vault · Portal Retro`. Los `style={{…}}` del template pasan a Tailwind, salvo `transitionDelay`, `animationDelay` y el ancho de `.tp-fill`, que dependen del índice. Destinos de los botones:
   - `EXPLORAR JUEGOS`, `VER TODOS LOS JUEGOS →`, `INSERTAR MONEDA →` → `/juegos`.
   - `CREAR CUENTA`, `EMPEZAR GRATIS →` → `/acceso?modo=registro`.
   - `VER SALÓN →` → `/salon`.
   - Mini-tarjetas → `/juegos/<id>`.
9. **Pestaña de registro.** En `components/auth-form.tsx`, leer `useSearchParams().get("modo")` para el estado inicial de `tab`. En `app/acceso/page.tsx`, envolver `<AuthForm />` en `<Suspense>` con fallback igual al formulario en pestaña `in`. Los enlaces existentes a `/acceso` sin parámetro siguen abriendo `INICIAR SESIÓN`.
10. **Limpieza.** Quitar imports sin uso. `npm run lint` y `npm run build` pasan sin errores.

Reglas transversales (heredadas de SPEC 01):

- Las clases copiadas a `globals.css` se reutilizan tal cual.
- Navegación con `<Link>` o `useRouter()`. Ningún `onClick` con `location`.
- Antes de usar `useSearchParams` con `cacheComponents: true`, consultar `node_modules/next/dist/docs/01-app/`.
- Se usa `/frontend-design` para ajustar los detalles visuales que no estén en la referencia (enlace deshabilitado y etiqueta `PRÓXIMAMENTE`).

---

## Criterios de aceptación

- [ ] `npm run build` termina sin errores ni warnings de tipos.
- [ ] `npm run lint` termina sin errores.
- [ ] `/` muestra el hero `EL ARCADE / CLÁSICO ESTÁ / DE VUELTA` con siluetas flotantes y el indicador `DESLIZA ▼`.
- [ ] `/` muestra en orden las secciones `// 01`, `// 02`, stats, `// 03`, `// 04` y el CTA `¿LISTO PARA JUGAR?`.
- [ ] La tarjeta `JUEGOS CLÁSICOS` menciona `Bloque Buster, Caída, Serpentina` y no menciona Arkanoid, Tetris ni Snake.
- [ ] La sección `// 02` muestra 6 mini-tarjetas con portada CSS y pulsar una navega a `/juegos/<id>`.
- [ ] `EXPLORAR JUEGOS`, `VER TODOS LOS JUEGOS →` e `INSERTAR MONEDA →` navegan a `/juegos`.
- [ ] `CREAR CUENTA` y `EMPEZAR GRATIS →` navegan a `/acceso?modo=registro` con la pestaña `CREAR CUENTA` activa y el campo de correo visible.
- [ ] `/acceso` sin parámetro abre en `INICIAR SESIÓN`.
- [ ] `VER SALÓN →` navega a `/salon`.
- [ ] Las secciones aparecen con animación al entrar en el viewport al hacer scroll.
- [ ] Con `prefers-reduced-motion: reduce` todas las secciones son visibles sin scroll previo y las siluetas no se mueven.
- [ ] El ticker muestra 7 filas y el top jugadores 5 filas, con oro, plata y bronce en las tres primeras.
- [ ] `/juegos` muestra el hero `ARCADE VAULT`, el buscador, los chips y las 8 tarjetas de SPEC 01.
- [ ] El Nav muestra `Inicio`, `Biblioteca`, `Salón de la Fama` y `Acerca de` en barra y panel móvil.
- [ ] `Inicio` está activo en `/`. `Biblioteca` está activo en `/juegos` y `/juegos/<id>`. `Salón de la Fama` está activo en `/salon`.
- [ ] `Acerca de` se ve atenuado con la etiqueta `PRÓXIMAMENTE`, tiene `aria-disabled="true"` y pulsarlo no cambia la URL.
- [ ] El logo navega a `/`.
- [ ] `VOLVER` en Detalle, `VOLVER A LA BIBLIOTECA` en 404 y Salón, y `VOLVER AL VAULT` en el Reproductor navegan a `/juegos`.
- [ ] Iniciar sesión y `JUGAR COMO INVITADO` navegan a `/juegos`.
- [ ] A 375 px de ancho la landing no tiene scroll horizontal.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en `/`, `/juegos` y `/acceso?modo=registro`.

---

## Decisiones

- **Sí:** leer `home.jsx`, `nav.jsx` y `styles.css` como fuente. El standalone es un bundle comprimido y no aporta código legible.
- **Sí:** Biblioteca en `/juegos`. Agrupa la lista con `/juegos/[id]` y `/juegos/[id]/jugar`.
- **No:** `/biblioteca`. Considerada; el usuario eligió `/juegos`.
- **Sí:** `Acerca de` visible pero deshabilitado con `PRÓXIMAMENTE`. Muestra la estructura final del Nav sin desplegar una página.
- **No:** ocultar el enlace. Considerado; el usuario prefirió que se vea.
- **No:** enlace navegable a una ruta que da 404. Parecería un error.
- **Sí:** ticker, top jugadores y stats como mock estático copiado. Fidelidad al template sin inventar reglas de ranking.
- **No:** derivarlos de `seededScores` o de `GAMES.length`. Requiere decisiones de datos que van en otra spec.
- **Sí:** nombres del catálogo propio en la feature `JUEGOS CLÁSICOS`. Coherencia con los juegos reales y sin marcas ajenas.
- **Sí:** `/acceso?modo=registro` abre `CREAR CUENTA`. Los CTA de registro llevan a la pestaña correcta.
- **Sí:** leer el parámetro con `useSearchParams` en cliente dentro de `<Suspense>`. Evita que la página `/acceso` pase a render dinámico por usar `searchParams` en servidor.
- **Sí:** reveal con `IntersectionObserver` y siluetas animadas, respetando `prefers-reduced-motion`.
- **Sí:** copiar los bloques CSS a `globals.css`. Mismo criterio que SPEC 01.
- **No:** `app/home.css` aparte. Rompe la convención de un único archivo de tema.
- **Sí:** landing como Server Component con un único Client Component (`reveal-observer.tsx`). Minimiza el JS en cliente.
- **Sí:** tras login o `JUGAR COMO INVITADO` se navega a `/juegos`. Conserva el comportamiento de SPEC 01, que llevaba a la Biblioteca.
- **Sí:** el logo navega a `/` (Inicio), como en la referencia.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `useSearchParams` con `cacheComponents: true` falla el build si no está dentro de `<Suspense>`. | `app/acceso/page.tsx` envuelve `<AuthForm />` en `<Suspense>`. Consultar la doc de Next 16 antes. |
| `.reveal` oculta las secciones hasta que corre el JS. Sin JS o si el observer falla, la landing queda vacía. | `reveal-observer.tsx` es lo único necesario. Con `prefers-reduced-motion` se muestran sin JS. Se acepta el caso sin JS, igual que la referencia. |
| `.reveal` puede no encontrar elementos si el observer corre antes de que existan en el DOM. | El observer se monta dentro de la misma página que los `.reveal`, así que el efecto corre después de que existen. |
| `app/juegos/page.tsx` y `app/juegos/[id]/page.tsx` en conflicto. | Son segmentos distintos en el App Router (índice y dinámico). Verificado en el paso 2. |
| Algún enlace a `/` con significado de Biblioteca queda sin actualizar. | El paso 3 lista los seis lugares encontrados con `grep`. Hay criterios de aceptación para cada uno. |
| `.home-hero` usa `min-height: calc(100vh - 60px)` y puede no coincidir con la altura real del Nav. | Verificar visualmente. Si no coincide, ajustar solo ese valor. |

---

## Lo que **no** está en esta spec

- Página `Acerca de` / contacto.
- Datos reales en ticker, top jugadores y stats.
- Número real de juegos en la franja de stats.
- Cambios en las pantallas de SPEC 01 más allá de sus enlaces.
- CSS de `ABOUT PAGE`, `GAMEPAD`, `tweaks` y `spinner`.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
