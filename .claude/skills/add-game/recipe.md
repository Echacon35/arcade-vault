# Receta de integración de un juego

Destilada de SPEC 05 (motor de ASTEROIDES), SPEC 06 (catálogo, leaderboard y `saveScoreAction`) y SPEC 06.5 (Salón de la Fama). El plan de implementación de cada spec de juego sigue estos pasos **en este orden**. Cada paso deja el sistema funcional y `npm run build` pasando.

Una vez que el juego está en `GAME_ENGINES`, en `GAMES` y en la tabla `games`, la plataforma ya lo trata como real **sin tocar más código**:

- `/juegos` y el detalle `/juegos/<id>` lo leen con `getCatalog()`/`getCatalogGame()`.
- `generateStaticParams` incluye su id.
- `GamePlayer` monta su motor y guarda con `saveScoreAction`, que valida, inserta en `scores` e invalida `game-<id>` y `games`.
- El TOP 10 y la pestaña del Salón salen de `getLeaderboard(id, 10)`.

---

## Paso 0 — Extensiones de contrato (solo si hacen falta)

Ver `contract.md`. Cada extensión es un paso propio, **antes** del motor, y debe:

- ser retrocompatible: ASTEROIDES sigue igual, sin cambios de comportamiento;
- tocar solo los archivos que nombra la extensión;
- dejar `npm run build` y `npm run lint` pasando.

## Paso 1 — Constantes y entidades

- `games/<id>/constants.ts`:
  - `W = 800` y `H = 600`, el espacio lógico del canvas.
  - Las constantes de mecánica del original, **con los mismos valores**: puntos, velocidades, tamaños, niveles, probabilidades y tiempos.
  - `COLORS`, con la paleta neón del Vault: fondo `#000`, cian `#00f5ff`, tinta `#e6e9ff`, amarillo `#f5ff00` y magenta `#ff006e`, más los tonos que necesite el juego. Modelo: `games/asteroides/constants.ts`.
- `games/<id>/entities.ts` (si el juego tiene entidades):
  - Clases o funciones tipadas.
  - `draw(ctx)` recibe el contexto, y `update` recibe el estado de entrada; no leen globales.
- Datos del original (por ejemplo `levels.js`) → `games/<id>/levels.ts` o equivalente, tipado y sin cambiar los datos.
- **Todavía no se usan.** `npm run build` pasa.

## Paso 2 — Motor

`games/<id>/engine.ts` exporta `create<Nombre>Game: GameFactory` (`games/types.ts`). Modelo: `games/asteroides/engine.ts`.

- **Sin estado en el nivel del módulo.** Todo el estado vive dentro de la factory (`type State = {…}`), y ningún módulo toca `window` ni `document` al importarse.
- **Bucle** con `requestAnimationFrame`:
  - `dt` en segundos, limitado (`MAX_DT = 0.05`, como el original).
  - El primer frame con `dt = 0`.
- **Teclado:**
  - Listeners en `window`, que se registran en la factory y se quitan en `destroy()`.
  - Se lee `KeyboardEvent.code`.
  - `preventDefault()` solo en las teclas del juego.
  - Se ignora el teclado si el foco está en un campo de texto (`isTypingTarget`), si el juego está pausado o si la partida ha terminado.
  - `KeyP` y `Escape` llaman a `callbacks.onPauseToggle()`, sin auto-repetición.
- **Ratón** (si aplica): listeners en el propio `canvas`, con coordenadas convertidas al espacio 800×600 mediante `getBoundingClientRect()`, y quitados en `destroy()`.
- **Estadísticas:** `callbacks.onStats({ score, lives, level })` **solo cuando cambia algún valor**; nunca cada frame.
- **Fin de partida:** el motor se detiene y llama una vez a `callbacks.onGameOver(score)`. Se elimina el reinicio interno del original (por ejemplo, con Espacio).
- **Interfaz `GameInstance`:**
  - `pause()` congela la lógica (el dibujo puede quedar estático).
  - `resume()` reanuda sin un salto de `dt` acumulado.
  - `restart()` reinicia el estado completo, emite estadísticas nuevas y reanuda.
  - `destroy()` cancela el rAF y quita **todos** los listeners, y en su caso para el sonido (E3).
- **Canvas sin HUD:** se quitan la puntuación, las vidas, el nivel y los overlays de GAME OVER/PAUSA, porque los pinta React. Solo se dejan indicadores efímeros propios del juego (el `3x N.Ns` de ASTEROIDES, la siguiente pieza de Tetris, las líneas…), si la spec lo decide.
- **Pausa por pestaña oculta:** ya la hace `GamePlayer` (`visibilitychange`); el motor no la duplica.
- **Registro:** en este mismo paso se añade el motor a `games/registry.ts`:

```ts
export const GAME_ENGINES: Partial<Record<string, GameFactory>> = {
  asteroides: createAsteroidsGame,
  <id>: create<Nombre>Game,
};
```

Utilidades: `isTypingTarget` vive hoy dentro de `games/asteroides/engine.ts`. La spec decide si se copia o si se extrae a un módulo compartido (por ejemplo `games/shared/input.ts`). En ese caso ASTEROIDES pasa a importarlo, en el mismo paso, sin cambiar su comportamiento.

## Paso 3 — Catálogo y portada

- Entrada nueva en `GAMES` (`lib/games.ts`) con `id`, `title`, `short`, `long`, `cat`, `cover: "cover-<id>"`, `color`, `best: 0` y `plays: "0"`. Hace falta porque `/juegos/[id]/jugar` sigue usando `getGame()` de `GAMES` (SPEC 06).
- Portada `.cover-<id>` en `app/globals.css`, junto a `.cover-asteroides`:
  - se diseña con `/frontend-design`, como pide `CLAUDE.md`;
  - CSS puro, sin imágenes, con un motivo reconocible del juego, distinto de las demás portadas.

## Paso 4 — Fila en Supabase

- `list_tables` y `select id, sort_order from public.games` para confirmar el estado.
- `apply_migration` con nombre `add_game_<id>` (snake_case):

```sql
insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values ('<id>', '<TITLE>', '<short>', '<long>', '<CAT>', 'cover-<id>', '<color>', <n>);
```

- **Textos:** idénticos a los de `GAMES`, con las comillas simples escapadas (`''`).
- **CHECK de la tabla:** `category in ('ARCADE','PUZZLE','SHOOTER','VERSUS')`, `color in ('cyan','magenta','yellow','green')` e `id ~ '^[a-z0-9-]+$'`.
- **Copia en el repo:** el mismo SQL, idéntico, en `supabase/migrations/<version>_add_game_<id>.sql`, donde `<version>` es la que devuelve `list_migrations` tras aplicarla.
- **Tipos:** sin cambio de esquema, así que **no** se regenera `lib/supabase/database.types.ts`.
- **Verificación:** `select * from games where id = '<id>'` y `get_advisors` (seguridad) sin avisos nuevos.

## Paso 5 — Verificación y limpieza

- `npm run build`: `/juegos/<id>` aparece prerenderizado y `/juegos` muestra la tarjeta.
- **Detalle sin puntuaciones:** `Mejor puntuación 0`, `Partidas 0` y `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- **Partida completa** en `/juegos/<id>/jugar` (con `next start` o el `next dev` del usuario):
  - controles y reglas del original;
  - fin de partida → modal → `GUARDAR PUNTUACIÓN` → `PUNTUACIÓN GUARDADA`.
- **Tras guardar:**
  - el TOP 10 del detalle refleja la fila, cargando la URL directamente;
  - la pestaña del juego en `/salon` muestra el podio y la tabla.
- **ASTEROIDES** se juega y guarda igual que antes.
- **Limpieza:** se borran las puntuaciones de prueba con `execute_sql` (`delete … where player_name in (…)`) sin tocar las del usuario, y `npm run lint` y `npm run build` terminan sin errores.

---

## Ficha de análisis (fase 2 de la skill)

Rellénala con datos concretos del código de referencia: nombres de constantes, valores y líneas.

| Aspecto             | Qué anotar                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Archivos            | Lista y líneas de cada `.js`, `.css` y `.html`; carpeta `assets/`                                  |
| Canvas              | Tamaño del `<canvas>` del original; tamaño del tablero o área de juego; ¿cabe centrado en 800×600? |
| Bucle               | `requestAnimationFrame` o `setInterval`; cálculo de `dt`; tope de `dt`; caída por tiempo (Tetris)  |
| Estado global       | Variables `let`/`const` mutables en el nivel del módulo                                            |
| Entrada             | Teclas (`key` o `code`), ratón (`click`/`mousemove`), táctil; dónde se registran los listeners     |
| Estadísticas        | ¿Hay puntuación? ¿Vidas? ¿Nivel? ¿Otras (líneas, combos)? Reglas de puntos                         |
| Fin y reinicio      | Condición de game over; cómo reinicia el original                                                  |
| HUD en canvas       | Textos y overlays que dibuja (SCORE, LIVES, GAME OVER, PAUSA…)                                     |
| UI fuera del canvas | Paneles DOM (siguiente pieza, botones, tema)                                                       |
| Assets              | Imágenes, spritesheets, fuentes y su tamaño                                                        |
| Sonido              | `new Audio`, ficheros, cuándo suenan                                                               |
| Persistencia        | `localStorage`/`sessionStorage` y para qué                                                         |
| Pausa               | Teclas o botones de pausa del original                                                             |
| Niveles/datos       | Ficheros de datos (`levels.js`) y su forma                                                         |
| Extensiones         | E1 / E2 / E3 necesarias y lo que no cabe en el contrato                                            |

---

## Trampas conocidas

- **404 tras guardar (SPEC 06, sin resolver).** En el build de producción, al navegar al detalle justo después de `saveScoreAction`, la petición RSC responde 404 y la página queda con el título del 404. Los criterios de consola se comprueban **cargando la URL directamente**. Debe ir en "Riesgos".
- **`NEXT_PUBLIC_*` se fijan en el build.** El criterio "URL de Supabase rota" solo se prueba con `next dev`. Si el usuario tiene un `next dev` abierto en el puerto 3000, no puede arrancar otro: hay que pedírselo.
- **Inserts por REST no invalidan la caché.** Solo `saveScoreAction` llama a `updateTag`; para ver datos insertados por otra vía hay que recompilar.
- **Hook de formateo.** Tras cada Write/Edit, `.claude/hooks/format-and-lint.mjs` pasa Prettier (`printWidth: 80`) y **borra las líneas en blanco** en JS/TS. Hay que releer el archivo antes de editar zonas reformateadas.
- **`public/` no existe todavía.** La extensión E2 la crea.
- **`next start` en Windows.** Al matar el proceso, el puerto puede quedarse en `FIN_WAIT` y `.next/server/route-cache` bloquea el build siguiente. Conviene usar otro puerto y borrar ese directorio antes de recompilar.
- **`execute_sql`** solo se usa para lecturas y para borrar puntuaciones de prueba. Los cambios de datos o de esquema van por `apply_migration`.
