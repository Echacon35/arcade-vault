# SPEC GJ cristales 01 — Juego real de CRISTALES (modo contrarreloj)

> **Estado:** Borrador
> **Tema:** CRISTALES — match-3 8×8 contrarreloj con cascadas (sorteado al azar de `references/game-suggestions-todo.md` por el game jam diario)
> **Depende de:** SPEC 05, SPEC 06, SPEC 06.5, SPEC 09 (modelo de motor sin original)
> **Fecha:** 2026-11-13
> **Objetivo:** Crear desde cero CRISTALES, un puzle de intercambiar cristales de neón adyacentes para alinear tres o más del mismo tipo contra un reloj que se recarga con cada grupo, y hacerlo jugable en `/juegos/cristales/jugar` con su fila en la tabla `games` de Supabase, su TOP 10 y su pestaña en el Salón de la Fama.

---

## Por qué existe esta spec

El único PUZZLE real del catálogo es TETRA, que es de colocación en tiempo real. CRISTALES aporta un puzle de **lectura de tablero**: partidas cortas (1–4 min), decisiones rápidas, cascadas que premian la suerte preparada y una puntuación con mucha dispersión, ideal para el leaderboard. Es además la primera mecánica del Vault que se juega igual de bien con **ratón** que con teclado. Esta es la variante **contrarreloj**; la spec `02-cristales-deriva.md` define una variante por energía en la que se deslizan filas y columnas enteras, con su propia tabla de puntuaciones.

Particularidades:

- **Sin original.** No hay código en `references/started-games/`. Todas las constantes de esta spec son la única fuente de verdad del motor; si algo no está aquí, se pregunta antes de inventarlo.
- **Original frente al género.** Los match-3 comerciales usan gemas facetadas, piezas especiales (explosivas, de color, de línea) y un minuto fijo. CRISTALES no tiene piezas especiales: los cristales son **contornos geométricos de neón** (cada tipo con forma y color propios, legible para daltónicos), el reloj **se recarga** con cada grupo y **se vacía más rápido** con cada nivel, y la puntuación multiplica por **cadena** de cascadas y por nivel. Nombre, arte y reglas son propios.
- **Encaje con el contrato de motor:**
  - Tablero de 8×8 celdas de 64 px (512×512) centrado en el canvas de 800×600; la barra de tiempo y el texto de cadena se dibujan en los márgenes laterales, dentro del canvas.
  - Teclado **y** puntero (ratón o dedo) sobre el canvas, con las coordenadas convertidas a 800×600 con `getBoundingClientRect()`. Los listeners de puntero van en el propio `canvas`.
  - Sin vidas: una vida fingida (`lives` 1 → 0) sin E1, como TETRA.
  - Sin imágenes ni sonido: no hacen falta E2 ni E3.
  - `isTypingTarget` ya está en `games/shared/input.ts`.

---

## Alcance

**Dentro:**

- **Motor TypeScript** en `games/cristales/`:
  - **Tablero:** `COLS = 8` × `ROWS = 8` celdas de `CELL = 64` px. Origen del tablero en `BOARD_X = 144`, `BOARD_Y = 44` (ocupa `x` 144…656 e `y` 44…556). Celda `(col, row)` con origen arriba a la izquierda; su centro es `(BOARD_X + col × CELL + 32, BOARD_Y + row × CELL + 32)`.
  - **Cristales:** `GEM_TYPES = 6` tipos (0…5), cada uno con color y forma fijos (ver Visual). Cada celda contiene exactamente un cristal cuando el tablero está en reposo.
  - **Tablero inicial:** se rellena celda a celda (filas de arriba abajo, columnas de izquierda a derecha) eligiendo al azar (`random` inyectado, `Math.random` por defecto) entre los tipos que **no** formen un trío con los dos de la izquierda ni con los dos de arriba. Si el tablero resultante no tiene ninguna jugada válida, se regenera (máx. 100 intentos; en la práctica basta uno).
  - **Jugada válida:** intercambiar dos celdas adyacentes en horizontal o vertical de modo que se forme al menos una línea de 3+ cristales iguales.
  - **Intercambio:** dura `SWAP_TIME = 0.12` s (los dos cristales se cruzan con interpolación lineal). Si no forma ninguna línea, se deshace con la misma animación (`SWAP_TIME`) y el tablero queda como estaba. Un intercambio inválido no penaliza más allá del tiempo que pasa.
  - **Detección de grupos** (`findGroups`): se marcan todas las celdas que forman parte de una línea horizontal o vertical de 3+ del mismo tipo. Un **grupo** es cada componente conexa (vecindad de 4) de celdas marcadas del mismo tipo; así una L o una T de 5 cuenta como un solo grupo de 5. Las líneas **no** dan la vuelta por los bordes.
  - **Resolución:** tras un intercambio válido, en bucle:
    1. `chain += 1` (empieza en 1 con la jugada del jugador).
    2. Se puntúan y se eliminan todos los grupos (animación `CLEAR_TIME = 0.18` s).
    3. Caída: los cristales de cada columna caen para rellenar huecos, y por arriba entran cristales nuevos al azar (cualquier tipo, pueden formar cascadas) que nacen en filas negativas (`−1`, `−2`…). Velocidad de caída constante `FALL_SPEED = 960` px/s (≈0,067 s por celda).
    4. Si hay grupos nuevos, vuelve a 1 (cascada). Si no, `chain = 0` y fin de la resolución.
  - **Sin jugadas:** tras resolver, si el tablero no tiene ninguna jugada válida, fase `shuffling` durante `SHUFFLE_TIME = 0.8` s con el aviso `▸ SIN JUGADAS — BARAJANDO_` y se genera un tablero nuevo con las reglas del tablero inicial. No da puntos ni consume tiempo.
  - **Puntuación** (con el `level` de antes de contar los cristales de ese paso de cascada):
    - cada grupo de `n` cristales vale `groupPoints(n) = 10 × n × (n − 2)` → 3: 30, 4: 80, 5: 150, 6: 240, 7: 350…;
    - los puntos de un paso son `Σ groupPoints(n) × min(chain, CHAIN_CAP) × level`, con `CHAIN_CAP = 8`.
    - Ejemplo: en el nivel 1, una jugada que forma un trío (30) y provoca una cascada con un grupo de 4 (80 × 2 = 160) suma 190.
    - La puntuación se limita a `MAX_SCORE = 10_000_000`.
  - **Reloj:** `START_TIME = 60` s, tope `MAX_TIME = 90` s.
    - Se vacía a `drainFor(level) = min(1 + (level − 1) × DRAIN_PER_LEVEL, DRAIN_MAX)` segundos por segundo, con `DRAIN_PER_LEVEL = 0.15` y `DRAIN_MAX = 2.5` (se alcanza en el nivel 11).
    - Solo se vacía en las fases `idle`, `swapping` y `reverting` (mientras el jugador decide y mientras un intercambio se anima). Se **congela** en `clearing`, `falling` y `shuffling`: las cascadas no castigan.
    - Cada grupo eliminado suma `timeBonus(n) = TIME_PER_EXTRA × (n − 2)` s con `TIME_PER_EXTRA = 0.5` (3: +0,5 s; 4: +1 s; 5: +1,5 s), sin multiplicador de cadena, hasta `MAX_TIME`.
    - El reloj se limita a 0; nunca es negativo.
  - **Nivel:** `level = 1 + floor(gemsCleared / GEMS_PER_LEVEL)`, con `GEMS_PER_LEVEL = 30`. Ejemplo: tras eliminar 30 cristales se pasa a nivel 2 y el reloj se vacía a 1,15 s/s.
  - **Vidas:** `START_LIVES = 1` (fingida). Al terminar se emite `lives: 0`.
  - **Fin de partida:** cuando el reloj es 0 y la fase es (o vuelve a ser) `idle`. Si el reloj llega a 0 durante un intercambio válido, la jugada se resuelve completa (con puntos y tiempo extra); si al volver a `idle` el reloj sigue en 0, termina. Si el bonus lo ha sacado de 0, la partida continúa («último aliento»).
  - **Pista:** tras `HINT_DELAY = 5` s en `idle` sin ningún intento de intercambio, los dos cristales de una jugada válida (la primera que encuentra `findMove`) laten (escala 1 → 1,12 → 1 con periodo 0,6 s) hasta el siguiente intento. No cuesta nada.
  - **Bucle:** `requestAnimationFrame` con `dt` en segundos, tope `MAX_DT = 0.05` y primer frame con `dt = 0`. `resume()` reinicia `lastTime`.
  - **Sin estado global:** `createCristalesGame(canvas, callbacks, options?)` devuelve `pause`, `resume`, `restart` y `destroy`.
- **Estados del motor:**

  | Fase        | Qué pasa                                                                                       | Reloj      | Sale a                                       |
  | ----------- | ---------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------- |
  | `waiting`   | Tablero inicial, reloj lleno y aviso `▸ HAZ UN INTERCAMBIO_`. El cursor se puede mover.        | Quieto     | `swapping` con el primer intento             |
  | `idle`      | El jugador mueve el cursor, selecciona e intercambia.                                          | Se vacía   | `swapping` / `gameover`                      |
  | `swapping`  | Animación de intercambio.                                                                      | Se vacía   | `clearing` (válido) / `reverting` (inválido) |
  | `reverting` | Animación de deshacer.                                                                         | Se vacía   | `idle`                                       |
  | `clearing`  | Los grupos se desvanecen; se suman puntos y tiempo.                                            | Congelado  | `falling`                                    |
  | `falling`   | Caen los cristales y entran los nuevos.                                                        | Congelado  | `clearing` (cascada) / `shuffling` / `idle`  |
  | `shuffling` | Aviso de barajado y tablero nuevo.                                                             | Congelado  | `idle`                                       |
  | `gameover`  | Sin input; el tablero queda congelado. `onGameOver` ya se llamó.                               | 0          | `waiting` con `restart()`                    |

  `paused` es un indicador aparte: congela animaciones y reloj en cualquier fase.
- **Controles:**
  - **Teclado** (`KeyboardEvent.code`):
    - `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA`, `ArrowRight`/`KeyD`: sin selección, mueven el cursor una celda (sin dar la vuelta). Con selección, intentan intercambiar la celda seleccionada con la vecina en esa dirección; el cursor pasa a la celda de destino y la selección se borra. Si la vecina está fuera del tablero, solo se borra la selección.
    - `Space`/`Enter`: selecciona la celda del cursor; si ya estaba seleccionada, la deselecciona.
    - `KeyX`: deselecciona.
    - Se ignora `keydown` con `e.repeat` (una pulsación = una acción).
    - El cursor empieza en `(3, 3)` y es visible desde `waiting`.
  - **Puntero** (`pointerdown` / `pointermove` / `pointerup` en el `canvas`, con `setPointerCapture`; cubre ratón y dedo):
    - Coordenadas lógicas: `x = (e.clientX − rect.left) × (800 / rect.width)`, igual para `y`.
    - `pointerdown` sobre una celda: si hay una selección y la celda es adyacente, intenta el intercambio; si no, la selecciona (y el cursor se mueve a ella). Fuera del tablero, deselecciona.
    - Arrastre: si desde el `pointerdown` el puntero se desplaza más de `DRAG_THRESHOLD = 24` px lógicos, se intenta un intercambio con la vecina en el eje dominante, una sola vez por gesto.
  - Los intentos de intercambio solo se aceptan en `waiting` e `idle`; en el resto de fases se ignoran (no se encolan). El cursor se puede mover en cualquier fase salvo `gameover`.
  - `KeyP` y `Escape` llaman a `onPauseToggle()`, sin repetición.
  - Las flechas, WASD, `Space`, `Enter`, `X`, `P` y `Esc` hacen `preventDefault()` mientras el juego está montado (salvo con el foco en un campo de texto).
  - El teclado y el puntero se ignoran si el juego está pausado, si la partida terminó o (teclado) si el foco está en un campo de texto (`isTypingTarget`).
  - Al pausar se borra la selección y se cancela cualquier arrastre en curso.
- **Visual** (paleta neón del Vault en un único objeto `COLORS`, para que `skin-designer` pueda derivar skins):
  - fondo `#000`;
  - tablero: rectángulo `#0a0a14` con borde cian `#00f5ff` de 2 px con glow (`shadowBlur = 10`) y rejilla `rgba(0, 245, 255, 0.08)` cada 64 px;
  - cristales (radio `GEM_R = 22` px, contorno de 3 px con glow `shadowBlur = 14` y relleno del mismo color al 25 % de opacidad):
    - 0 — cian `#00f5ff`, **rombo**;
    - 1 — magenta `#ff006e`, **círculo**;
    - 2 — amarillo `#f5ff00`, **triángulo** con la punta arriba;
    - 3 — verde `#00ff88`, **cuadrado** girado 0°;
    - 4 — naranja `#ff8a00`, **hexágono**;
    - 5 — violeta `#b44dff`, **estrella de 4 puntas**;
  - cursor: cuadrado blanco discontinuo de 2 px, 2 px dentro de la celda;
  - selección: cuadrado blanco sólido de 3 px que late (opacidad 0,6 ↔ 1, periodo 0,5 s);
  - eliminación: el cristal crece a ×1,4 y se desvanece durante `CLEAR_TIME`;
  - puntos flotantes `+N` en blanco, `bold 18px monospace`, en el centro del grupo, subiendo 24 px y desvaneciéndose en 0,6 s;
  - **barra de tiempo** vertical en `x = 688`, `y` 44…556, 24 px de ancho: pista `rgba(255, 255, 255, 0.08)`, relleno de abajo arriba proporcional a `time / MAX_TIME`; verde `#00ff88` por encima de 30 s, amarillo `#f5ff00` entre 10 y 30 s, rojo `#ff3355` por debajo de 10 s y parpadeando (2 Hz) por debajo de 5 s. Encima, `TIEMPO` en cian `12px monospace` centrado en `y = 30`; debajo, los segundos enteros restantes (`Math.ceil`) en blanco `14px monospace` en `y = 576`. Cada bonus muestra `+0.5s` (etc.) en verde junto a la barra, subiendo y desvaneciéndose en 0,6 s;
  - **cadena:** con `chain ≥ 2`, `CADENA ×n` en amarillo `#f5ff00`, `bold 20px monospace`, centrado en el margen izquierdo (`x = 72`, `y = 300`) mientras dure la resolución;
  - avisos `▸ HAZ UN INTERCAMBIO_` (en `waiting`) y `▸ SIN JUGADAS — BARAJANDO_` (en `shuffling`) en cian `#00f5ff`, `16px monospace`, centrados en `x = 400`, `y = 580`.
- **HUD en React:** la puntuación, las vidas (`♥` y `—` al terminar) y el nivel salen de `onStats`. En el canvas no se pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`; solo el tablero, los cristales, cursor y selección, efectos, la barra de tiempo, la cadena y los avisos.
- **Fin de partida:** con el reloj a 0 en `idle`, fase `gameover`, `onStats({ …, lives: 0 })` y una sola llamada a `onGameOver(score)`. El canvas queda congelado con el último frame. Se abre `FIN DEL JUEGO` con guardado vía `saveScoreAction`. `FIN` abandona sin guardar. `JUGAR DE NUEVO` llama a `restart()`: tablero inicial nuevo, 60 s, 0 puntos, nivel 1, 1 vida, cursor en `(3, 3)`, sin selección, fase `waiting`.
- **Registro** del motor en `GAME_ENGINES` (`games/registry.ts`) con la clave `cristales`.
- **Catálogo:** entrada nueva en `GAMES` de `lib/games.ts`, justo después del último juego real (hoy `ranaria`; si APILA ya está implementado, después de él):

  | Campo   | Valor                                                                                                                                                                                                                                                               |
  | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `id`    | `"cristales"`                                                                                                                                                                                                                                                       |
  | `title` | `"CRISTALES"`                                                                                                                                                                                                                                                       |
  | `cat`   | `"PUZZLE"`                                                                                                                                                                                                                                                          |
  | `color` | `"magenta"`                                                                                                                                                                                                                                                         |
  | `cover` | `"cover-cristales"`                                                                                                                                                                                                                                                 |
  | `best`  | `0`                                                                                                                                                                                                                                                                 |
  | `plays` | `"0"`                                                                                                                                                                                                                                                               |
  | `short` | "Alinea tres cristales iguales antes de que se apague el reloj."                                                                                                                                                                                                   |
  | `long`  | "Intercambia cristales de neón vecinos con el ratón o el teclado para formar líneas de tres o más. Cada grupo da puntos y recarga el reloj, y las cascadas multiplican la jugada. Cada 30 cristales subes de nivel y el tiempo corre más deprisa. Cuando se apaga, se acabó." |

- **Portada** `.cover-cristales` en `app/globals.css`, en CSS puro y diseñada con `/frontend-design`: una rejilla 4×3 de cristales de contorno neón (rombo cian, círculo magenta, triángulo amarillo, hexágono naranja…) con tres rombos cian alineados que brillan más que el resto y una barra vertical de tiempo verde en el borde derecho. Distinta de `.cover-tetra` y de las portadas simuladas.
- **Supabase:** migración de datos `add_game_cristales` aplicada con `apply_migration`, con `insert` en `games` y copia idéntica en `supabase/migrations/`. Las puntuaciones usan la tabla `scores` existente con `game_id = 'cristales'`; el TOP 10 de `/juegos/cristales` y la pestaña `CRISTALES` de `/salon` salen de la vista `leaderboard` sin cambios de código.

**Fuera de alcance (para futuras specs):**

- La variante DERIVA (`02-cristales-deriva.md`).
- Piezas especiales (explosivas, de línea, de color), obstáculos y objetivos por nivel.
- Sonido (E3), imágenes (E2), partículas extra o sacudidas.
- Skins E4 y pad táctil (`GAME_TOUCH`): los añaden `skin-designer` y `mobile-porter` al implementar con `/spec-impl-game`. El puntero ya permite jugar tocando el canvas; `touch-action: none` sobre el canvas, si hace falta, es cosa de `mobile-porter`.
- Más de una vida y la extensión E1.
- Cambios de esquema en Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- El arreglo del `fetch-cache` y del 404 tras guardar de SPEC 06.
- Tests automatizados.

---

## Modelo de datos

```ts
// games/cristales/board.ts — tipos y lógica pura, sin estado de módulo (la reutiliza la spec 02)
export type Gem = number; // 0 … types − 1
export type Board = Gem[][]; // board[row][col]
export type Cell = { col: number; row: number };
export type Group = { type: Gem; cells: Cell[] };
export type Move = { a: Cell; b: Cell };
```

```ts
// games/cristales/engine.ts — estado interno, nunca en el nivel del módulo
type Phase = "waiting" | "idle" | "swapping" | "reverting" | "clearing" | "falling" | "shuffling" | "gameover";
type Falling = { col: number; fromY: number; toRow: number; y: number; gem: Gem }; // y en px lógicos
type Floater = { x: number; y: number; text: string; color: string; age: number };
type State = {
  board: Board;
  cursor: Cell;
  selected: Cell | null;
  swap: { a: Cell; b: Cell; t: number } | null; // t en s
  clearing: { groups: Group[]; t: number } | null;
  falling: Falling[];
  shuffleT: number;
  chain: number;
  time: number; // s restantes
  idleT: number; // s en idle sin intentos (pista)
  hint: Move | null;
  gemsCleared: number;
  floaters: Floater[];
  drag: { pointerId: number; x0: number; y0: number; cell: Cell; used: boolean } | null;
  score: number;
  lives: number; // 1 → 0 al terminar
  level: number; // 1 + floor(gemsCleared / 30)
  phase: Phase;
  paused: boolean;
};
```

```sql
-- supabase/migrations/<version>_add_game_cristales.sql
insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values (
  'cristales',
  'CRISTALES',
  'Alinea tres cristales iguales antes de que se apague el reloj.',
  'Intercambia cristales de neón vecinos con el ratón o el teclado para formar líneas de tres o más. Cada grupo da puntos y recarga el reloj, y las cascadas multiplican la jugada. Cada 30 cristales subes de nivel y el tiempo corre más deprisa. Cuando se apaga, se acabó.',
  'PUZZLE',
  'cover-cristales',
  'magenta',
  6
);
```

> Nota: `sort_order = 6` asume que RANARIA (5) es el último juego en `games`. Las specs de APILA reservan el 6 y el 7; el paso 5 lo comprueba con `select max(sort_order) from games` y, si no coincide, usa `max + 1` como número literal.

Archivos:

- `games/cristales/constants.ts`:
  - `W = 800`, `H = 600`, `MAX_DT = 0.05`;
  - `COLS = 8`, `ROWS = 8`, `CELL = 64`, `BOARD_X = 144`, `BOARD_Y = 44`, `GEM_R = 22`;
  - `GEM_TYPES = 6`;
  - `SWAP_TIME = 0.12`, `CLEAR_TIME = 0.18`, `FALL_SPEED = 960`, `SHUFFLE_TIME = 0.8`;
  - `START_TIME = 60`, `MAX_TIME = 90`, `DRAIN_PER_LEVEL = 0.15`, `DRAIN_MAX = 2.5`, `TIME_PER_EXTRA = 0.5`;
  - `GEMS_PER_LEVEL = 30`, `CHAIN_CAP = 8`, `START_LIVES = 1`, `MAX_SCORE = 10_000_000`;
  - `HINT_DELAY = 5`, `DRAG_THRESHOLD = 24`, `CURSOR_START = { col: 3, row: 3 }`;
  - `TIMER_X = 688`, `TIMER_W = 24`;
  - `COLORS`: fondo `#000`, tablero `#0a0a14`, borde `#00f5ff`, rejilla `rgba(0, 245, 255, 0.08)`, `gems: ["#00f5ff", "#ff006e", "#f5ff00", "#00ff88", "#ff8a00", "#b44dff"]`, cursor y selección `#ffffff`, tiempo alto `#00ff88`, medio `#f5ff00`, bajo `#ff3355`, pista del reloj `rgba(255, 255, 255, 0.08)`, cadena `#f5ff00`, aviso `#00f5ff`.
- `games/cristales/board.ts`: funciones puras sin `window` ni canvas:
  - `createBoard(types, random)` → tablero sin grupos y con al menos una jugada;
  - `findGroups(board)` → `Group[]`;
  - `swapCells(board, a, b)` → tablero nuevo;
  - `isAdjacent(a, b)`;
  - `findMove(board)` → `Move | null` (primera jugada válida, recorriendo filas y columnas en orden);
  - `collapse(board, cleared, types, random)` → `{ board, falls: { col, fromRow, toRow, gem }[] }`, con `fromRow` negativo para los cristales nuevos;
  - `groupPoints(n)`, `timeBonus(n)`, `levelFor(gemsCleared)`, `drainFor(level)`.
- `games/cristales/shapes.ts`: `drawGem(ctx, type, cx, cy, r, color)` (las 6 formas; la spec 02 añade una 7.ª).
- `games/cristales/engine.ts`: `createCristalesGame`, con el bucle, la máquina de fases, el input (teclado y puntero), el dibujo y el ciclo de vida.

Convenciones: lógica en celdas; dibujo en el espacio lógico 800×600 con origen arriba a la izquierda; `dt` en segundos; ningún módulo toca `window` ni `document` al importarse; teclas por `KeyboardEvent.code`; `games/` solo se importa desde Client Components.

---

## Plan de implementación

1. **Constantes y lógica pura.** Crear `games/cristales/constants.ts`, `board.ts` y `shapes.ts`. Todavía no se usan. `npm run build` pasa.
2. **Motor.** Crear `games/cristales/engine.ts` con `createCristalesGame`:
   - **Estado inicial:** `createBoard(6, Math.random)`, `time = 60`, cursor en `(3, 3)`, fase `waiting`. Emite `onStats({ score: 0, lives: 1, level: 1 })`.
   - **Bucle:** máquina de fases de la tabla de estados. El reloj solo se vacía en `idle`, `swapping` y `reverting`; tras cada `clearing` suma puntos, tiempo y cristales eliminados y recalcula el nivel. Al volver a `idle` comprueba `findMove` (barajado) y el fin de partida.
   - **Input:** `keydown` en `window`; `pointerdown`/`pointermove`/`pointerup`/`pointercancel` en el `canvas` con `setPointerCapture`.
   - **Dibujo:** fondo, tablero y rejilla, cristales en reposo, cristales en intercambio / caída (con recorte al rectángulo del tablero para que los nuevos no se vean por encima), pista, cursor, selección, puntos flotantes, barra de tiempo, cadena y avisos.
   - **Estadísticas:** `onStats` solo cuando cambia algún valor.
   - **Ciclo de vida:** `pause()` congela y borra selección y arrastre; `resume()` reinicia `lastTime`; `restart()` vuelve al estado inicial, emite estadísticas y reanuda; `destroy()` cancela el rAF y quita todos los listeners.
3. **Registro.** `cristales: createCristalesGame` en `GAME_ENGINES`. Comprobación manual en `/juegos/cristales/jugar` tras el paso 4.
4. **Catálogo y portada.** Entrada `cristales` en `GAMES` y `.cover-cristales` en `app/globals.css` (junto a las portadas reales) con `/frontend-design`.
5. **Fila en Supabase.**
   - `select id, sort_order from public.games order by sort_order` para confirmar el siguiente `sort_order` y que `cristales` no existe.
   - Aplicar `add_game_cristales` con `apply_migration`; guardar el mismo SQL en `supabase/migrations/<version>_add_game_cristales.sql` con la versión de `list_migrations`.
   - Verificar con `select * from games where id = 'cristales'` y `get_advisors` (seguridad) sin avisos nuevos.
   - Borrar `.next/cache/fetch-cache/` (y `.next/server/route-cache` si existe) antes del build y comprobar después que `.next/server/app/juegos.html` contiene `CRISTALES`.
6. **Verificación y limpieza.** Partida completa con ratón y otra con teclado, con guardado; TOP 10 de `/juegos/cristales` y pestaña `CRISTALES` de `/salon` cargando las URLs directamente; sin regresiones en los demás juegos reales; borrar las puntuaciones de prueba con `execute_sql`; `npm run lint` y `npm run build`.

Reglas transversales: cambios de Supabase solo con `apply_migration`; `execute_sql` solo para lecturas y borrar puntuaciones de prueba; nunca la `service_role`; no se regeneran tipos (no hay cambio de esquema).

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos` muestra CRISTALES con portada `.cover-cristales` y acento magenta.
- [ ] Sin puntuaciones, `/juegos/cristales` muestra `Mejor puntuación 0`, `Partidas 0` y `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- [ ] `/juegos/cristales/jugar` muestra un tablero 8×8 centrado sin ningún trío ya formado, la barra de tiempo llena (`60`), el cursor en la 4.ª columna y 4.ª fila y `▸ HAZ UN INTERCAMBIO_`. HUD: `Puntuación 0`, `Vidas ♥`, `Nivel 01`.
- [ ] Cada tipo de cristal se distingue por su forma además de por su color.
- [ ] El reloj no corre hasta el primer intento de intercambio.
- [ ] Con el ratón: clic en un cristal lo selecciona; clic en un vecino intenta el intercambio; arrastrar un cristal 24 px o más hacia un lado lo intercambia con ese vecino; clic fuera del tablero deselecciona.
- [ ] Con el teclado: las flechas/WASD mueven el cursor; `Espacio` selecciona; una flecha con selección intenta el intercambio en esa dirección; `X` o un segundo `Espacio` deselecciona.
- [ ] Mantener pulsada una flecha mueve el cursor una sola celda.
- [ ] Un intercambio que no forma línea se deshace y el tablero queda igual.
- [ ] Un intercambio entre celdas no adyacentes (clic en un cristal lejano) no intercambia: cambia la selección.
- [ ] En el nivel 1, un trío suma exactamente 30 puntos y +0,5 s; un grupo de 4 en línea, 80 y +1 s; una L o T de 5, 150 y +1,5 s.
- [ ] Una cascada muestra `CADENA ×2` y su grupo vale el doble (un trío en cascada en el nivel 1 suma 60).
- [ ] El reloj no supera 90 s y no corre durante las cascadas.
- [ ] Tras eliminar 30 cristales el HUD muestra `Nivel 02` y el reloj se vacía visiblemente más rápido (1,15 s por segundo); el reloj nunca se vacía a más de 2,5 s por segundo.
- [ ] Tras 5 s sin intentos, dos cristales de una jugada válida laten.
- [ ] Si el tablero se queda sin jugadas, aparece `▸ SIN JUGADAS — BARAJANDO_` y a los 0,8 s hay un tablero nuevo sin tríos y con jugadas, sin perder tiempo.
- [ ] Con el reloj a 0, la partida termina: HUD `Vidas —` y se abre `FIN DEL JUEGO` con la puntuación real.
- [ ] Un intercambio válido iniciado en el último instante se resuelve y suma sus puntos; si su bonus deja tiempo, la partida sigue.
- [ ] El canvas no pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`.
- [ ] `P`, `Esc` y el botón `PAUSA` congelan reloj y animaciones y borran la selección; al reanudar no hay saltos. Cambiar de pestaña pausa.
- [ ] Las flechas, `Espacio`, `Enter`, `P` y `Esc` no desplazan la página.
- [ ] Escribir el nombre en el modal (incluidos `W`, `A`, `S`, `D`, `X` y espacio) no mueve el cursor ni intercambia.
- [ ] Tras guardar, la fila aparece en el TOP 10 de `/juegos/cristales` y en la pestaña `CRISTALES` de `/salon`.
- [ ] `JUGAR DE NUEVO` vuelve a un tablero nuevo en espera con `Puntuación 0`, `Vidas ♥`, `Nivel 01` y el reloj lleno.
- [ ] Al salir y volver a entrar solo corre un bucle (el reloj del nivel 1 baja 1 s por segundo) y no quedan listeners ni en `window` ni en el canvas.
- [ ] `select * from games where id = 'cristales'` devuelve la fila con los textos de `GAMES`; `supabase/migrations/` coincide con `list_migrations`.
- [ ] ASTEROIDES, TETRA, REBOTE, VIBORITA y RANARIA se juegan y guardan igual que antes.
- [ ] Ningún archivo de `games/cristales/` declara estado mutable en el nivel del módulo.
- [ ] La consola no muestra errores durante una partida completa (cargando la URL directamente).
- [ ] Las puntuaciones de prueba se borran al terminar.

---

## Casos límite

| Caso                                                                          | Comportamiento                                                                                                                         |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Un intercambio forma dos grupos a la vez (uno por cada cristal movido).       | Ambos se eliminan en el mismo paso con `chain = 1`; puntúan y suman tiempo por separado.                                               |
| Una línea de 3 y otra de 3 del mismo tipo que se cruzan (L, T, +).            | Es un solo grupo de 5 (o 6 en un +, donde el centro se cuenta una vez).                                                                |
| Dos líneas del mismo tipo paralelas y pegadas (p. ej. 2 filas de 3).          | Son conexas: un solo grupo de 6 (240 puntos). Es intencionado y raro.                                                                  |
| Cascada infinita teórica.                                                     | Imposible en un tablero finito sin generación determinista; aun así, `chain` se limita a `CHAIN_CAP` en el multiplicador.              |
| El reloj llega a 0 durante `reverting`.                                       | Al volver a `idle` termina la partida.                                                                                                 |
| El reloj llega a 0 en `waiting`.                                              | No puede: en `waiting` no corre.                                                                                                       |
| Clic durante una cascada.                                                     | Se ignora el intento; el cursor sí se mueve a la celda.                                                                                |
| Arrastre que sale del canvas.                                                 | `setPointerCapture` sigue entregando eventos; si `pointercancel`, se cancela el gesto sin intercambio.                                 |
| Dos dedos a la vez.                                                           | Solo cuenta el primer `pointerId` activo; el resto se ignora hasta que se suelta.                                                      |
| Pausa a mitad de caída.                                                       | Los cristales quedan congelados en el aire y siguen al reanudar.                                                                       |
| `restart()` durante una cascada o un barajado.                                | Se descartan animaciones, puntos flotantes y arrastre; tablero nuevo en `waiting`.                                                     |
| `createBoard` no encuentra tablero con jugada en 100 intentos.                | Se usa el último generado y se fuerza el barajado al entrar en `idle` (no debería ocurrir con 6 tipos y 8×8).                          |
| Puntuación teórica > 10.000.000.                                              | Se limita a `MAX_SCORE` antes de emitirla (CHECK de `scores`).                                                                         |

---

## Decisiones

- **Sí:** match-3 clásico de intercambio con reloj que se recarga y se acelera. Es la lectura más directa de la nota del lote (8×8, contrarreloj, cascadas) y da partidas cortas y competitivas.
- **No:** piezas especiales. Encarecen el motor y son lo más característico de los match-3 comerciales; la profundidad sale de la cadena y del reloj.
- **No:** minuto fijo sin recarga. Con recarga y aceleración la partida dura según la habilidad y la puntuación separa mejor a los jugadores.
- **Sí:** el reloj se congela durante las cascadas. Una cascada larga nunca castiga al jugador.
- **Sí:** el reloj sí corre durante los intercambios y al deshacerlos, para que los intercambios inválidos tengan coste.
- **Sí:** `10 × n × (n − 2)` por grupo, × cadena (tope 8) × nivel. Premia grupos grandes de forma cuadrática y hace que los niveles altos valgan mucho más.
- **Sí:** nivel cada 30 cristales y vaciado +0,15 s/s por nivel (tope 2,5 en el nivel 11).
- **Sí:** formas distintas por tipo (rombo, círculo, triángulo, cuadrado, hexágono, estrella). Accesibilidad para daltónicos y estética vectorial propia.
- **Sí:** ratón/dedo **y** teclado con cursor. El cursor hace el juego compatible con el pad táctil (cruceta + A/B) que añadirá `mobile-porter`.
- **Sí:** pista tras 5 s, gratis. Evita bloqueos; en contrarreloj, esperar 5 s ya es su propio coste.
- **Sí:** 1 vida fingida (`♥` → `—`), sin E1, como TETRA.
- **Sí:** `PUZZLE` y `magenta`. Es el segundo PUZZLE real (TETRA es verde) y entre los motores reales solo REBOTE usa magenta.
- **Sí:** lógica pura en `board.ts` y formas en `shapes.ts`, reutilizables por la variante DERIVA.

---

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                                       |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| La máquina de fases (8 fases) es más compleja que la de los motores actuales.                | Tabla de estados explícita en esta spec; toda la lógica de tablero es pura en `board.ts` y se revisa sin canvas. |
| Parecido con match-3 comerciales.                                                            | Sin piezas especiales, cristales de contorno con formas propias, reloj recargable y acelerado, nombre propio.    |
| `Space` activa un botón enfocado del HUD (p. ej. `PAUSA` tras pulsarlo).                     | `preventDefault()` en las teclas del juego; el foco no debe quedarse en botones del HUD.                          |
| El arrastre con el dedo desplaza la página en móvil.                                         | Fuera de alcance: `touch-action: none` en el canvas lo resuelve `mobile-porter`.                                 |
| Catálogo prerenderizado sin CRISTALES por `.next/cache/fetch-cache`.                         | Paso 5: borrar el fetch-cache y comprobar `juegos.html`.                                                         |
| Strict Mode monta el efecto dos veces y crea dos bucles.                                     | `destroy()` cancela el rAF y quita los listeners; criterio de velocidad del reloj tras volver a entrar.          |
| `sort_order` ocupado por APILA / APILA GRÚA si se implementan antes.                         | El paso 5 usa `max + 1`.                                                                                         |
| Sin código de referencia, una regla queda ambigua.                                           | Las constantes de esta spec son la única fuente; si falta algo, se pregunta.                                     |

---

## Preguntas abiertas

- ¿Pista automática a los 5 s o sin pista? Por defecto: con pista (no da puntos ni tiempo).
- ¿Color de portada `magenta` o `yellow`? Por defecto `magenta`, porque APILA ya reserva `yellow`.

---

## Lo que **no** está en esta spec

- La variante DERIVA (spec 02 de este directorio).
- Piezas especiales, obstáculos y objetivos por nivel.
- Sonido, imágenes, skins y pad táctil.
- Más vidas y E1.
- Cambios de esquema o de `saveScoreAction`.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
