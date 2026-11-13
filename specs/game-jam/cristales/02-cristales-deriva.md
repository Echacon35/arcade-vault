# SPEC GJ cristales 02 — Juego real de CRISTALES DERIVA (variante de filas deslizantes)

> **Estado:** Borrador
> **Tema:** CRISTALES — match-3 8×8 contrarreloj con cascadas (variante "twist" del game jam diario del 2026-11-13)
> **Depende de:** `specs/game-jam/cristales/01-cristales-contrarreloj.md` (reutiliza `games/cristales/board.ts` y `shapes.ts`), SPEC 05, SPEC 06, SPEC 06.5
> **Fecha:** 2026-11-13
> **Objetivo:** Crear CRISTALES DERIVA, una variante de CRISTALES en la que no se intercambian cristales sueltos sino que se **deslizan filas y columnas enteras** que dan la vuelta por los bordes, con una reserva de **energía** en lugar de reloj; hacerla jugable en `/juegos/cristales-deriva/jugar` con fila propia en `games`, TOP 10 y pestaña en el Salón.

---

## Por qué existe esta spec

El modo contrarreloj (spec 01) es velocidad de lectura: mirar, intercambiar, repetir. DERIVA usa el mismo tablero, los mismos cristales y las mismas cascadas, pero cambia el verbo y el recurso:

- **El verbo:** cada movimiento desplaza 8 cristales a la vez, así que una jugada puede formar grupos en varias filas o columnas y preparar cascadas a propósito. Un desplazamiento que no forma nada **no se deshace**: el tablero queda «a la deriva».
- **El recurso:** no hay reloj. Cada movimiento gasta 1 de **energía** y cada grupo eliminado la devuelve; la partida termina cuando se agota. Se juega pensando, sin prisa, y la puntuación premia la planificación (bonus por barrido de 3+ grupos en una jugada).
- **La dificultad:** en lugar de acelerar el tiempo, cada pocos niveles entra un **tipo de cristal nuevo** (5 → 6 → 7), lo que hace los grupos más escasos.

Es un juego distinto con su propia tabla de puntuaciones, no un modo dentro de CRISTALES.

Particularidades:

- **Sin original.** Todas las constantes de esta spec son la única fuente de verdad del motor.
- **Reutiliza la lógica pura** de `games/cristales/board.ts` (`findGroups`, `collapse`, `groupPoints`, `levelFor` parametrizado) y `games/cristales/shapes.ts`. Si la spec 01 aún no está implementada, esta spec crea primero esos dos archivos tal y como la spec 01 los describe.
- **Juego independiente en el catálogo** (`cristales-deriva`): el contrato de motor no tiene selector de modo y cada leaderboard es por `game_id`.
- **Original frente al género.** Los puzles de deslizar filas existen, pero DERIVA combina el deslizamiento con vuelta por los bordes, la economía de energía con devolución por grupo y cadena, y la entrada progresiva de tipos; nombre, arte y reglas son propios.
- **Encaje con el contrato de motor:** tablero 8×8 de 64 px centrado en 800×600 con la barra de energía en el margen derecho; teclado y puntero en el canvas; vida fingida (`lives` 1 → 0) sin E1; sin imágenes ni sonido.

---

## Alcance

**Dentro:**

- **Motor TypeScript** en `games/cristales-deriva/`:
  - **Tablero:** idéntico a la spec 01: `COLS = 8` × `ROWS = 8`, `CELL = 64`, `BOARD_X = 144`, `BOARD_Y = 44`.
  - **Tipos de cristal por nivel:** `typesFor(level)` = 5 en los niveles 1–2 (tipos 0…4), 6 en los niveles 3–4 (añade el violeta, tipo 5) y 7 desde el nivel 5 (añade el blanco, tipo 6). Los cristales nuevos que entran al rellenar usan los tipos del nivel actual; los que ya están en el tablero no cambian.
  - **Tablero inicial:** `createBoard(5, random)` de la spec 01 (sin grupos), con la condición extra de que exista al menos un **deslizamiento** que forme un grupo (`findSlideMove`); si no, se regenera (máx. 100 intentos).
  - **Deslizamiento:** un movimiento desplaza **toda una fila** `k` celdas a la derecha o **toda una columna** `k` celdas hacia abajo, con `k` en 1…7, y con vuelta: lo que sale por un borde entra por el opuesto. Desplazar a la izquierda `j` celdas equivale a `k = 8 − j` a la derecha (igual en vertical).
    - Animación de confirmación: la fila/columna se desliza desde su desplazamiento visual actual hasta el destino en `SLIDE_TIME = 0.1` s.
    - Después se buscan grupos con `findGroups` de la spec 01 en **todo** el tablero (los grupos no dan la vuelta por los bordes).
    - Si no hay grupos, el tablero se queda desplazado (no se deshace) y el movimiento se ha gastado.
  - **Resolución:** igual que la spec 01 (`chain` empieza en 1, eliminación en `CLEAR_TIME = 0.18` s, caída siempre hacia abajo a `FALL_SPEED = 960` px/s, cascadas en bucle).
  - **Energía:** `START_ENERGY = 20`, tope `MAX_ENERGY = 30`.
    - Cada movimiento confirmado cuesta `MOVE_COST = 1` al confirmarse (antes de resolver).
    - Cada grupo eliminado devuelve `energyFor(n, chain) = (n − 2) + (chain − 1)`: un trío en la jugada directa devuelve 1 (el movimiento sale gratis); un trío en la primera cascada, 2; un grupo de 4 en la jugada directa, 2.
    - La energía se limita a `[0, MAX_ENERGY]`.
  - **Puntuación** (con el `level` de antes de contar los cristales de ese paso):
    - cada grupo vale `groupPoints(n) × min(chain, CHAIN_CAP) × level`, con `groupPoints(n) = 10 × n × (n − 2)` y `CHAIN_CAP = 8`, como en la spec 01;
    - **barrido:** si la resolución completa de un movimiento elimina `SWEEP_GROUPS = 3` grupos o más (sumando todos los pasos de cascada), suma además `SWEEP_POINTS × level` (`SWEEP_POINTS = 100`) y muestra `BARRIDO`.
    - Ejemplo: en el nivel 1, un deslizamiento que forma dos tríos (30 + 30) y provoca una cascada con otro trío (30 × 2 = 60) suma 120 + 100 de barrido = 220, y devuelve 1 + 1 + 2 = 4 de energía (neto +3).
    - La puntuación se limita a `MAX_SCORE = 10_000_000`.
  - **Nivel:** `level = 1 + floor(gemsCleared / GEMS_PER_LEVEL)`, con `GEMS_PER_LEVEL = 40`. Ejemplo: con 80 cristales eliminados se llega al nivel 3 y empiezan a entrar cristales violetas.
  - **Sin jugadas:** si tras resolver no existe ningún deslizamiento que forme un grupo (se prueban las 8 × 7 filas y las 8 × 7 columnas = 112 deslizamientos), fase `shuffling` durante `SHUFFLE_TIME = 0.8` s con `▸ SIN JUGADAS — BARAJANDO_` y tablero nuevo con `typesFor(level)` tipos. No cuesta energía ni da puntos.
  - **Vidas:** `START_LIVES = 1` (fingida). Al terminar se emite `lives: 0`.
  - **Fin de partida:** cuando la energía es 0 y la fase vuelve a `idle` (es decir, después de resolver por completo el último movimiento; si sus grupos devuelven energía, la partida sigue).
  - **Sin pista:** a diferencia de la spec 01, no hay pista automática: el juego es de planificación.
  - **Bucle:** `requestAnimationFrame` con `dt` en segundos, tope `MAX_DT = 0.05` y primer frame con `dt = 0`. `resume()` reinicia `lastTime`.
  - **Sin estado global:** `createCristalesDerivaGame(canvas, callbacks, options?)` devuelve `pause`, `resume`, `restart` y `destroy`.
- **Estados del motor:**

  | Fase        | Qué pasa                                                                                                   | Sale a                                        |
  | ----------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
  | `waiting`   | Tablero inicial, energía 20, aviso `▸ ARRASTRA UNA FILA O COLUMNA_`. El cursor se puede mover.             | `aiming` al agarrar                           |
  | `idle`      | El jugador mueve el cursor o agarra una celda.                                                             | `aiming` / `gameover`                         |
  | `aiming`    | Una fila o columna sigue al puntero o a las flechas (vista previa con vuelta). Aún no cuesta nada.         | `sliding` (confirmar) / `idle` (cancelar)     |
  | `sliding`   | Animación de confirmación; se cobra el movimiento.                                                         | `clearing` (hay grupos) / `idle` (no los hay) |
  | `clearing`  | Los grupos se desvanecen; se suman puntos y energía.                                                       | `falling`                                     |
  | `falling`   | Caen los cristales y entran los nuevos.                                                                    | `clearing` / `shuffling` / `idle`             |
  | `shuffling` | Aviso de barajado y tablero nuevo.                                                                         | `idle`                                        |
  | `gameover`  | Sin input; tablero congelado. `onGameOver` ya se llamó.                                                    | `waiting` con `restart()`                     |

  `paused` congela animaciones en cualquier fase; si llega en `aiming`, cancela la vista previa sin coste.
- **Controles:**
  - **Teclado** (`KeyboardEvent.code`; se ignora `e.repeat`):
    - Fuera de `aiming`: `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD` mueven el cursor una celda (sin dar la vuelta). El cursor empieza en `(3, 3)`.
    - `Space`/`Enter` en `waiting`/`idle`: agarra la celda del cursor (entra en `aiming` con desplazamiento 0 y sin eje).
    - En `aiming`: la primera flecha fija el eje (`←`/`→` = fila del cursor, `↑`/`↓` = columna del cursor) y cada flecha de ese eje suma o resta 1 al desplazamiento (de −7 a 7). Las flechas del otro eje se ignoran. `Space`/`Enter` confirma: si `desplazamiento mod 8 = 0` se cancela sin coste; si no, pasa a `sliding`. `KeyX` cancela sin coste.
    - Tras confirmar, el cursor pasa a la nueva posición del cristal agarrado.
  - **Puntero** (`pointerdown` / `pointermove` / `pointerup` / `pointercancel` en el `canvas`, con `setPointerCapture`; ratón y dedo):
    - Coordenadas lógicas como en la spec 01.
    - `pointerdown` sobre una celda en `waiting`/`idle`: mueve el cursor y entra en `aiming` con esa celda.
    - El eje se fija cuando el desplazamiento supera `AXIS_LOCK = 12` px lógicos (el dominante). Desde ahí la fila o columna sigue al puntero en px (con vuelta visual).
    - `pointerup`: `k = round(d / CELL) mod 8`; si `k = 0`, cancela sin coste; si no, confirma con ese `k`. Un toque sin arrastre solo mueve el cursor.
    - `pointercancel` cancela sin coste.
  - `KeyP` y `Escape` llaman a `onPauseToggle()`, sin repetición.
  - Las flechas, WASD, `Space`, `Enter`, `X`, `P` y `Esc` hacen `preventDefault()` mientras el juego está montado (salvo con el foco en un campo de texto).
  - El teclado y el puntero se ignoran si el juego está pausado, si la partida terminó o (teclado) si el foco está en un campo de texto (`isTypingTarget`). En `sliding`, `clearing`, `falling` y `shuffling` solo se puede mover el cursor.
- **Visual** (paleta neón del Vault en `COLORS`, preparada para skins):
  - fondo, tablero, rejilla, cursor y efectos de eliminación, puntos flotantes y `CADENA ×n` como en la spec 01;
  - cristales: los 6 de la spec 01 más el tipo 6 — blanco `#e8e8ff`, **anillo** (dos círculos concéntricos de radio 22 y 12);
  - **vista previa** (`aiming`): la fila o columna agarrada se dibuja desplazada con vuelta (recortada al tablero, de modo que el cristal que sale por un borde aparece por el otro), con un contorno cian `#00f5ff` de 2 px alrededor de toda la fila/columna y flechas `◀ ▶` o `▲ ▼` en cian a los dos lados del tablero; el resto del tablero se oscurece al 70 %;
  - **barra de energía** vertical en `x = 688`, `y` 44…556, 24 px de ancho, con `MAX_ENERGY = 30` segmentos de 15 px y 2 px de separación, de abajo arriba; los llenos en amarillo `#f5ff00` con glow, en rojo `#ff3355` si la energía es ≤ 5 y parpadeando (2 Hz) si es ≤ 3; los vacíos `rgba(255, 255, 255, 0.08)`. Encima, `ENERGÍA` en cian `12px monospace` en `y = 30`; debajo, el número en blanco `14px monospace` en `y = 576`. Cada devolución muestra `+n` en amarillo junto a la barra y cada movimiento `−1` en rojo, subiendo y desvaneciéndose en 0,6 s;
  - **barrido:** `BARRIDO +N` en cian `#00f5ff`, `bold 22px monospace`, centrado en el tablero, creciendo de ×0,8 a ×1 y desvaneciéndose en 0,9 s;
  - **nuevo tipo:** al subir a los niveles 3 y 5, `▸ NUEVO CRISTAL_` en blanco en el margen izquierdo (`x = 72`, `y = 340`) durante 1,5 s, con el cristal nuevo dibujado encima;
  - avisos `▸ ARRASTRA UNA FILA O COLUMNA_` y `▸ SIN JUGADAS — BARAJANDO_` en cian, `16px monospace`, centrados en `x = 400`, `y = 580`.
- **HUD en React:** puntuación, vidas (`♥` / `—`) y nivel salen de `onStats`. En el canvas no se pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`.
- **Fin de partida:** energía 0 en `idle` → fase `gameover`, `onStats({ …, lives: 0 })` y una sola llamada a `onGameOver(score)`. Se abre `FIN DEL JUEGO` con guardado vía `saveScoreAction`. `FIN` abandona sin guardar. `JUGAR DE NUEVO` llama a `restart()`: tablero inicial nuevo con 5 tipos, energía 20, 0 puntos, nivel 1, 1 vida, cursor en `(3, 3)`, fase `waiting`.
- **Registro** del motor en `GAME_ENGINES` con la clave `cristales-deriva`.
- **Catálogo:** entrada nueva en `GAMES` de `lib/games.ts`, justo después de `cristales` (o del último juego real si CRISTALES aún no está):

  | Campo   | Valor                                                                                                                                                                                                                                                                                  |
  | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `id`    | `"cristales-deriva"`                                                                                                                                                                                                                                                                   |
  | `title` | `"CRISTALES DERIVA"`                                                                                                                                                                                                                                                                   |
  | `cat`   | `"PUZZLE"`                                                                                                                                                                                                                                                                             |
  | `color` | `"cyan"`                                                                                                                                                                                                                                                                               |
  | `cover` | `"cover-cristales-deriva"`                                                                                                                                                                                                                                                             |
  | `best`  | `0`                                                                                                                                                                                                                                                                                    |
  | `plays` | `"0"`                                                                                                                                                                                                                                                                                  |
  | `short` | "Desliza filas y columnas enteras para alinear cristales."                                                                                                                                                                                                                            |
  | `long`  | "Arrastra una fila o una columna completa: los cristales que salen por un borde entran por el otro. Alinea tres o más iguales para ganar puntos y recuperar energía; cada movimiento cuesta uno. Las cascadas multiplican la jugada y cada pocos niveles aparece un cristal nuevo. Sin energía, se acabó." |

- **Portada** `.cover-cristales-deriva` en `app/globals.css`, en CSS puro y diseñada con `/frontend-design`: rejilla de cristales de contorno neón con una fila central desplazada media celda (un cristal cortado asomando por cada borde) y flechas `⇄` cian a los lados, y una columna de segmentos amarillos a la derecha. Distinta de `.cover-cristales` (que muestra la barra verde de tiempo y un trío alineado).
- **Supabase:** migración `add_game_cristales_deriva` aplicada con `apply_migration`, `insert` en `games` y copia idéntica en `supabase/migrations/`. Puntuaciones en `scores` con `game_id = 'cristales-deriva'`; TOP 10 y pestaña `CRISTALES DERIVA` sin cambios de código.

**Fuera de alcance (para futuras specs):**

- Deshacer movimientos, vista previa de los grupos que se formarían o pista automática.
- Piezas especiales, obstáculos y tableros con forma.
- Unificar CRISTALES y DERIVA en un único juego con selector de modo (requiere spec de plataforma: el contrato no tiene modos).
- Sonido, imágenes, skins y pad táctil (los añaden `skin-designer` y `mobile-porter`).
- Más vidas, E1, cambios de esquema o de `saveScoreAction`.
- Tests automatizados.

---

## Modelo de datos

```ts
// games/cristales/board.ts — se amplía (sin cambiar el comportamiento de la spec 01)
export type Slide = { axis: "row" | "col"; index: number; k: number }; // k en 1…7 (derecha / abajo)
export function shiftBoard(board: Board, slide: Slide): Board;
export function findSlideMove(board: Board): Slide | null;
```

```ts
// games/cristales-deriva/engine.ts — estado interno, nunca en el nivel del módulo
import type { Board, Cell, Group } from "../cristales/board";
type Phase = "waiting" | "idle" | "aiming" | "sliding" | "clearing" | "falling" | "shuffling" | "gameover";
type State = {
  board: Board;
  cursor: Cell;
  aim: { cell: Cell; axis: "row" | "col" | null; offsetPx: number; pointerId: number | null; x0: number; y0: number } | null;
  slideAnim: { axis: "row" | "col"; index: number; fromPx: number; toPx: number; t: number } | null;
  clearing: { groups: Group[]; t: number } | null;
  falling: Falling[]; // como en la spec 01
  shuffleT: number;
  chain: number;
  moveGroups: number; // grupos eliminados por el movimiento en curso (barrido)
  energy: number; // 0 … 30
  gemsCleared: number;
  types: number; // typesFor(level)
  floaters: Floater[]; // como en la spec 01
  banner: { text: string; t: number } | null; // BARRIDO / NUEVO CRISTAL
  score: number;
  lives: number; // 1 → 0 al terminar
  level: number; // 1 + floor(gemsCleared / 40)
  phase: Phase;
  paused: boolean;
};
```

```sql
-- supabase/migrations/<version>_add_game_cristales_deriva.sql
insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values (
  'cristales-deriva',
  'CRISTALES DERIVA',
  'Desliza filas y columnas enteras para alinear cristales.',
  'Arrastra una fila o una columna completa: los cristales que salen por un borde entran por el otro. Alinea tres o más iguales para ganar puntos y recuperar energía; cada movimiento cuesta uno. Las cascadas multiplican la jugada y cada pocos niveles aparece un cristal nuevo. Sin energía, se acabó.',
  'PUZZLE',
  'cover-cristales-deriva',
  'cyan',
  7
);
```

> Nota: `sort_order = 7` asume CRISTALES en el 6. El paso 4 lo comprueba con `select max(sort_order) from games`; si no coincide, se usa `max + 1` como número literal.

Archivos:

- `games/cristales-deriva/constants.ts`: `W`, `H`, `MAX_DT = 0.05`; geometría del tablero (importada de `games/cristales/constants.ts`); `SLIDE_TIME = 0.1`, `CLEAR_TIME = 0.18`, `FALL_SPEED = 960`, `SHUFFLE_TIME = 0.8`; `START_ENERGY = 20`, `MAX_ENERGY = 30`, `MOVE_COST = 1`; `GEMS_PER_LEVEL = 40`, `CHAIN_CAP = 8`, `SWEEP_GROUPS = 3`, `SWEEP_POINTS = 100`, `START_LIVES = 1`, `MAX_SCORE = 10_000_000`; `AXIS_LOCK = 12`, `CURSOR_START = { col: 3, row: 3 }`; `ENERGY_X = 688`, `ENERGY_W = 24`, `SEG_H = 15`, `SEG_GAP = 2`; `COLORS` (los de la spec 01 más `gems[6] = "#e8e8ff"`, energía `#f5ff00`, energía baja `#ff3355`, vista previa `#00f5ff`, oscurecido `rgba(0, 0, 0, 0.7)`).
- `games/cristales-deriva/drift.ts`: funciones puras `typesFor(level)`, `energyFor(n, chain)`, `sweepBonus(groups, level)`, `offsetToK(offsetPx)` (`round(offsetPx / CELL) mod 8`, normalizado a 0…7).
- `games/cristales/board.ts`: se le añaden `shiftBoard` y `findSlideMove`; `createBoard`, `collapse` y `levelFor` aceptan el número de tipos / cristales por nivel como parámetro, con los valores de la spec 01 por defecto.
- `games/cristales/shapes.ts`: se añade el anillo (tipo 6).
- `games/cristales-deriva/engine.ts`: `createCristalesDerivaGame`.

---

## Plan de implementación

1. **Lógica compartida.** Comprobar que existen `games/cristales/board.ts` y `shapes.ts` (si no, crearlos según la spec 01). Añadir `shiftBoard`, `findSlideMove`, el parámetro de tipos y el anillo. CRISTALES sigue igual. `npm run build` pasa.
2. **Constantes, deriva y motor.** Crear `constants.ts`, `drift.ts` y `engine.ts`:
   - Estado inicial `waiting`; emite `onStats({ score: 0, lives: 1, level: 1 })`.
   - `aiming`: vista previa con teclado o puntero; confirmar cobra `MOVE_COST`, aplica `shiftBoard` al terminar `SLIDE_TIME` y busca grupos.
   - `clearing`/`falling`: como la spec 01, con devolución de energía por grupo, recuento de `moveGroups` y, al terminar la resolución, bonus de barrido. Recalcula nivel y `types`; muestra `▸ NUEVO CRISTAL_` al subir a 3 y 5.
   - Al volver a `idle`: `findSlideMove` (barajado) y fin de partida si `energy = 0`.
   - Dibujo, `onStats` solo con cambios, ciclo de vida como la spec 01 (`pause()` cancela `aiming` sin coste).
3. **Registro, catálogo y portada.** `"cristales-deriva": createCristalesDerivaGame` en `GAME_ENGINES`; entrada en `GAMES`; `.cover-cristales-deriva` con `/frontend-design`.
4. **Fila en Supabase.** Comprobar `sort_order` e inexistencia de `cristales-deriva`; `apply_migration` `add_game_cristales_deriva` + copia en `supabase/migrations/` con la versión de `list_migrations`; `select * from games where id = 'cristales-deriva'`; `get_advisors`. Borrar `.next/cache/fetch-cache/` (y `route-cache`) antes del build y comprobar que `.next/server/app/juegos.html` contiene `CRISTALES DERIVA`.
5. **Verificación y limpieza.** Partida completa con ratón y otra con teclado, con guardado; TOP 10 y Salón cargando URLs directamente; CRISTALES y el resto sin regresiones; borrar puntuaciones de prueba; `npm run lint` y `npm run build`.

Reglas transversales: cambios de Supabase solo con `apply_migration`; `execute_sql` solo para lecturas y borrar puntuaciones de prueba; nunca la `service_role`; no se regeneran tipos.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] `/juegos` muestra CRISTALES DERIVA con portada `.cover-cristales-deriva` y acento cian.
- [ ] Sin puntuaciones, `/juegos/cristales-deriva` muestra `Mejor puntuación 0`, `Partidas 0` y `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- [ ] `/juegos/cristales-deriva/jugar` muestra un tablero 8×8 sin tríos, solo con 5 tipos de cristal, la barra de energía con 20 de 30 segmentos y `▸ ARRASTRA UNA FILA O COLUMNA_`. HUD: `Puntuación 0`, `Vidas ♥`, `Nivel 01`.
- [ ] Arrastrar un cristal en horizontal desplaza toda su fila con vuelta por los bordes; en vertical, toda su columna. El eje no cambia a mitad del gesto.
- [ ] Soltar con menos de media celda de desplazamiento (o tras dar una vuelta completa) no cuesta energía ni cambia el tablero.
- [ ] Con el teclado: `Espacio` agarra la celda del cursor, `→ → →` previsualiza 3 celdas a la derecha, `Espacio` confirma; `X` cancela sin coste; las flechas del otro eje se ignoran mientras se apunta.
- [ ] Cada movimiento confirmado resta 1 de energía (`−1`). Un movimiento que no forma ningún grupo deja el tablero desplazado.
- [ ] En el nivel 1, un trío directo suma 30 puntos y devuelve 1 de energía; un grupo de 4 directo, 80 y 2; un trío en la primera cascada, 60 y 2.
- [ ] Un movimiento que elimina 3 grupos o más (contando cascadas) muestra `BARRIDO +100` en el nivel 1 y suma esos 100.
- [ ] La energía nunca pasa de 30.
- [ ] Con 80 cristales eliminados el HUD muestra `Nivel 03`, aparece `▸ NUEVO CRISTAL_` y empiezan a caer cristales violetas; en el nivel 5 aparecen los anillos blancos.
- [ ] Si no hay ningún deslizamiento que forme un grupo, aparece `▸ SIN JUGADAS — BARAJANDO_` y el tablero se regenera sin coste.
- [ ] Con la energía a 0 tras resolver un movimiento, la partida termina: HUD `Vidas —` y `FIN DEL JUEGO` con la puntuación real. Si el último movimiento devuelve energía, la partida sigue.
- [ ] El canvas no pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`.
- [ ] `P`, `Esc` y el botón `PAUSA` congelan animaciones; pausar mientras se apunta cancela la vista previa sin coste. Cambiar de pestaña pausa.
- [ ] Las teclas del juego no desplazan la página y escribir el nombre en el modal no mueve nada.
- [ ] Tras guardar, la fila aparece en el TOP 10 de `/juegos/cristales-deriva` y en la pestaña `CRISTALES DERIVA` de `/salon`; las puntuaciones de CRISTALES no se mezclan.
- [ ] `JUGAR DE NUEVO` vuelve a un tablero nuevo de 5 tipos con energía 20, `Puntuación 0`, `Vidas ♥` y `Nivel 01`.
- [ ] Al salir y volver a entrar solo corre un bucle y no quedan listeners.
- [ ] `select * from games where id = 'cristales-deriva'` devuelve la fila con los textos de `GAMES`; `supabase/migrations/` coincide con `list_migrations`.
- [ ] CRISTALES sigue jugándose igual que antes (sus tableros siguen teniendo 6 tipos y su lógica no cambia).
- [ ] Ningún archivo de `games/cristales-deriva/` declara estado mutable en el nivel del módulo.
- [ ] La consola no muestra errores durante una partida completa; las puntuaciones de prueba se borran al terminar.

---

## Casos límite

| Caso                                                                          | Comportamiento                                                                                                         |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Desplazamiento de 8 celdas (vuelta completa) o de −8.                         | `k = 0`: se cancela sin coste.                                                                                         |
| Arrastre más allá del borde del tablero o del canvas.                         | El desplazamiento sigue al puntero (capturado) y se limita a ±7 celdas; `pointerup` fuera del canvas confirma igual.   |
| El deslizamiento forma grupos en filas o columnas distintas de la movida.     | Cuentan todos: `findGroups` recorre el tablero entero.                                                                 |
| Un grupo que solo existiría dando la vuelta por el borde.                     | No cuenta: los grupos no dan la vuelta.                                                                                |
| Energía 1, movimiento sin grupos.                                             | Energía 0 → al volver a `idle`, fin de partida.                                                                        |
| Energía 0 durante la resolución de un movimiento con grupos.                  | Se devuelve la energía de sus grupos; si al terminar es > 0, se sigue jugando.                                         |
| Sube de nivel a mitad de una cascada.                                         | Los cristales que entran desde ese paso usan `typesFor` del nivel nuevo; los puntos de ese paso usan el nivel anterior.|
| Barajado en el nivel 5+.                                                      | El tablero nuevo usa 7 tipos y debe tener al menos un deslizamiento con grupo (con 7 tipos puede requerir varios intentos; tope 100, si no, se usa el último y se vuelve a barajar en el siguiente `idle`). |
| Clic con el botón derecho o rueda.                                            | Se ignoran (solo `button === 0` o toque).                                                                              |
| Dos dedos a la vez.                                                           | Solo cuenta el primer `pointerId`.                                                                                     |
| `restart()` en `aiming` o durante una cascada.                                | Se descartan vista previa, animaciones y textos; tablero nuevo en `waiting`.                                           |
| Puntuación teórica > 10.000.000.                                              | Se limita a `MAX_SCORE`.                                                                                               |

---

## Decisiones

- **Sí:** deslizar filas/columnas con vuelta como verbo principal. Es el giro más grande posible sobre el mismo tablero y los mismos cristales, y cambia la forma de pensar la jugada.
- **Sí:** el movimiento sin grupos no se deshace. Es lo que hace que el tablero «derive» y que cada movimiento importe.
- **Sí:** energía (20, tope 30) con devolución `(n − 2) + (chain − 1)`. Un trío directo es neutro; solo crecen la energía los grupos grandes y las cascadas, que es lo que se quiere premiar.
- **No:** reloj. El ritmo pausado diferencia la variante y evita que sea un duplicado del contrarreloj.
- **Sí:** dificultad por tipos de cristal (5 → 6 → 7) en lugar de por velocidad. Encaja con un juego sin tiempo.
- **Sí:** bonus de barrido (3+ grupos en un movimiento). Premia la planificación de deslizamientos múltiples.
- **No:** pista ni vista previa de grupos. El valor competitivo está en ver la jugada.
- **Sí:** juego aparte (`cristales-deriva`) con su leaderboard, como APILA GRÚA.
- **Sí:** `cyan`. `magenta` ya es de CRISTALES y `yellow` está reservado para APILA; cian lo usa ASTEROIDES, pero en otra categoría.
- **Sí:** reutilizar `board.ts` y `shapes.ts` de CRISTALES, ampliándolos sin cambiar su comportamiento.

---

## Riesgos

| Riesgo                                                                                        | Mitigación                                                                                                     |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Balance de energía: partidas demasiado cortas o infinitas.                                    | Constantes centralizadas en `constants.ts`; probar 5 partidas y, si la media dura < 1 min o > 15 min, preguntar antes de ajustar. |
| Con 7 tipos, los tableros sin jugadas se vuelven frecuentes.                                  | Barajado gratuito con `findSlideMove`; criterio específico.                                                     |
| Cambios en `board.ts` rompen CRISTALES.                                                       | Parámetros con valores por defecto de la spec 01; criterio de no regresión.                                    |
| Arrastrar con el dedo desplaza la página en móvil.                                            | `touch-action: none` en el canvas lo resuelve `mobile-porter`.                                                 |
| Catálogo prerenderizado sin CRISTALES DERIVA por `.next/cache/fetch-cache`.                   | Paso 4: borrar el fetch-cache y comprobar `juegos.html`.                                                       |
| Strict Mode monta el efecto dos veces.                                                        | `destroy()` cancela el rAF y quita los listeners.                                                              |
| Título largo (`CRISTALES DERIVA`, 16 caracteres) en tarjetas y pestañas del Salón.            | Comprobar en la verificación que no se corta; si se corta, preguntar antes de renombrar (alternativa: `DERIVA`).|

---

## Preguntas abiertas

- ¿Título `CRISTALES DERIVA` o solo `DERIVA`? Por defecto `CRISTALES DERIVA`, para que se lea como familia en el catálogo.
- ¿`START_ENERGY = 20` es suficiente para que un jugador nuevo aprenda? Por defecto sí; ajustable tras probar.

---

## Lo que **no** está en esta spec

- Deshacer, pistas y vista previa de grupos.
- Piezas especiales, obstáculos y tableros con forma.
- Selector de modo dentro de CRISTALES.
- Sonido, imágenes, skins y pad táctil.
- Más vidas, E1 y cambios de esquema.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
