# SPEC 07 — Juego real de tetra

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06, SPEC 06.5
> **Fecha:** 2026-11-10
> **Objetivo:** Portar a TypeScript el juego de `references/started-games/03-tetris` y hacerlo jugable en `/juegos/tetra/jugar` como TETRA, con su fila en la tabla `games` de Supabase, su TOP 10 y su pestaña en el Salón de la Fama.

---

## Por qué existe esta spec

ASTEROIDES es hoy el único juego real. El siguiente juego de `references/started-games/` es uno de piezas que caen, y esta spec lo integra con la receta de SPEC 05, 06 y 06.5 bajo el nombre TETRA.

Particularidades del original:

- **Fuente:** `references/started-games/03-tetris`: `game.js` (332 líneas), `index.html` (62), `style.css` (236). No tiene assets ni sonido.
- **Por qué no se usa tal cual:**
  - Todo el estado vive en el nivel del módulo (`let board, current, next, score, lines, level…`).
  - El `keydown` está en `document` y nunca se quita.
  - El `requestAnimationFrame` no tiene ciclo de vida.
  - Tiene panel, overlay y botón de reinicio en el DOM, y un tema claro/oscuro guardado en `localStorage`.
- **Diferencias con el contrato de motor:**
  - El tablero de 300×600 cabe centrado en el canvas de 800×600, y la siguiente pieza y las líneas se dibujan en el margen derecho.
  - El juego no tiene vidas. Se resuelve emitiendo 1 vida fija, sin la extensión E1.
  - No necesita E2 (no hay imágenes) ni E3 (no hay sonido).
- **La mecánica no cambia.** Las piezas, la rotación, los wall kicks, la puntuación, los niveles y la velocidad se copian sin modificar.
- **Hay 8 piezas, no 7:** las 7 estándar más la "tuerca" (anillo de 3×3). El README del original dice 7, pero el código usa 8, y se porta el código.

---

## Alcance

**Dentro:**

- **Motor TypeScript** en `games/tetra/`:
  - Tablero `COLS = 10` × `ROWS = 20`, con `BLOCK = 30` px.
  - Las 8 piezas de `PIECES`, elegidas al azar con la misma probabilidad (`floor(random × 8) + 1`).
  - Rotación horaria (`rotateCW`) con wall kicks `[0, -1, 1, -2, 2]`. Si ninguno sirve, la rotación no se aplica.
  - Puntuación por líneas: `LINE_SCORES = [0, 100, 300, 500, 800]` × nivel, usando el nivel **anterior** a la subida.
  - Caída de golpe: +2 por celda recorrida. Bajada rápida: +1 por fila, solo si la pieza baja; si choca, la pieza se fija sin sumar puntos.
  - Nivel `floor(lines / 10) + 1`. Caída automática cada `max(100, 1000 − (level − 1) × 90)` ms, con `dropAccum` puesto a 0 en cada caída.
  - Aparición en `x = floor(COLS / 2) − floor(anchoPieza / 2)`, `y = 0`. Si la pieza nueva choca al aparecer, termina la partida.
  - Pieza fantasma en la posición de aterrizaje, con `globalAlpha = 0.2`.
  - Sin estado global: `createTetraGame(canvas, callbacks)` devuelve `pause`, `resume`, `restart` y `destroy`.
- **Controles** (por `KeyboardEvent.code`):
  - `ArrowLeft`/`ArrowRight` mueven una columna; `ArrowUp` y `KeyX` rotan; `ArrowDown` baja más rápido; `Space` deja caer la pieza de golpe.
  - Mantener pulsada una tecla repite la acción, como en el original.
  - `KeyP` y `Escape` pausan y reanudan, sin repetición.
  - Todas las teclas del juego hacen `preventDefault()` mientras está montado.
- **Visual con la paleta neón** del Vault (`COLORS`):

  | Pieza      | Color              |
  | ---------- | ------------------ |
  | I          | cian `#00f5ff`     |
  | O          | amarillo `#f5ff00` |
  | T          | magenta `#ff006e`  |
  | S          | verde `#00ff88`    |
  | Z          | bronce `#d97a3a`   |
  | J          | plata `#c7d0e0`    |
  | L          | oro `#ffcf3a`      |
  | N (tuerca) | tinta `#e6e9ff`    |
  - Cada bloque mantiene el dibujo del original: relleno con 1 px de margen y franja superior de 4 px con `rgba(255,255,255,0.12)`.
  - Fondo `#000`, con la cuadrícula y el borde del tablero en `#4a4f70`.

- **Canvas** de 800×600 dentro de `.crt-screen`:
  - El tablero (300×600) se dibuja centrado, en `x = 250`, `y = 0`.
  - En el margen derecho, a partir de `x = 590`, van la etiqueta `NEXT` con la vista previa de 4×4 celdas de 30 px (centrada como `drawNext`) y la etiqueta `LÍNEAS` con su contador.
  - El texto se dibuja en `monospace`, con las etiquetas en `#8a8fb5` y los valores en `#e6e9ff`.
  - El margen izquierdo queda vacío.
- **HUD en React:**
  - Puntuación y nivel salen de `onStats`.
  - Vidas: el motor emite `lives: 1` durante la partida (`♥`) y `lives: 0` al terminar (`—`).
  - No se dibujan en el canvas SCORE, LEVEL ni los overlays PAUSA y GAME OVER.
- **Fin de partida:**
  - Si la pieza nueva choca al aparecer, el motor se detiene, emite `lives: 0` y llama a `onGameOver(score)`. Se abre `FIN DEL JUEGO`, con guardado vía `saveScoreAction`.
  - `FIN` abandona sin guardar.
  - `JUGAR DE NUEVO` llama a `restart()`.
  - Se elimina el botón `Reiniciar` del original.
- **Registro** del motor en `GAME_ENGINES` (`games/registry.ts`) con la clave `tetra`.
- **Catálogo:** entrada nueva en `GAMES` de `lib/games.ts`, justo después de `asteroides`:

  | Campo   | Valor                                                                                                                                                     |
  | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `id`    | `"tetra"`                                                                                                                                                 |
  | `title` | `"TETRA"`                                                                                                                                                 |
  | `cat`   | `"PUZZLE"`                                                                                                                                                |
  | `color` | `"green"`                                                                                                                                                 |
  | `cover` | `"cover-tetra"`                                                                                                                                           |
  | `best`  | `0`                                                                                                                                                       |
  | `plays` | `"0"`                                                                                                                                                     |
  | `short` | "Encaja las piezas antes de que el techo te aplaste."                                                                                                     |
  | `long`  | "Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas." |

- **Portada** `.cover-tetra` en `app/globals.css`, en CSS puro: una pila irregular de bloques abajo, una fila a punto de completarse y la tuerca cayendo arriba, en verde neón con acentos de tinta. Se diseña con `/frontend-design`.
- **Supabase:** migración de datos `add_game_tetra` aplicada con `apply_migration`, con `insert` en `games` (`sort_order = 2`) y copia idéntica en `supabase/migrations/`.

**Fuera de alcance (para futuras specs):**

- El tema claro/oscuro del original y su `localStorage` (`tetris-theme`).
- El panel DOM (SCORE, LINES, LEVEL, NEXT, controles), el overlay y el botón `Reiniciar` del original. Los sustituyen el HUD de React, el canvas y el modal.
- La leyenda de controles dentro del canvas.
- Las líneas como dato del HUD de React o de `scores`: requiere spec de plataforma.
- La extensión E1 (vidas opcionales).
- Cambiar o quitar la entrada simulada `caida` (CAÍDA), que sigue en `GAMES` con su partida simulada.
- Pieza de reserva (hold), sonido, controles táctiles y soporte móvil jugable.
- Cambios en el esquema de Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- El 404 tras guardar de SPEC 06.
- Tests automatizados.

---

## Modelo de datos

```ts
// games/tetra/engine.ts — estado interno, nunca en el nivel del módulo
type Cell = number; // 0 = vacía, 1–8 = índice de pieza
type Piece = { type: number; shape: Cell[][]; x: number; y: number };
type Phase = "playing" | "gameover";
type State = {
  board: Cell[][]; // ROWS × COLS
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  level: number;
  dropInterval: number; // ms
  dropAccum: number; // ms
  phase: Phase;
  paused: boolean;
};
```

```sql
-- supabase/migrations/<version>_add_game_tetra.sql
insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values (
  'tetra',
  'TETRA',
  'Encaja las piezas antes de que el techo te aplaste.',
  'Piezas geométricas descienden desde la oscuridad. Rótalas, encástralas y limpia líneas para sobrevivir. La velocidad aumenta sin piedad cada 10 líneas.',
  'PUZZLE',
  'cover-tetra',
  'green',
  2
);
```

Archivos del motor:

- `games/tetra/constants.ts`:
  - `W`, `H`, `COLS`, `ROWS` y `BLOCK`;
  - `BOARD_X = 250` y `BOARD_Y = 0`;
  - `PIECES` (8 matrices copiadas de `game.js`) y `LINE_SCORES`;
  - `ROTATION_KICKS`, `LINES_PER_LEVEL = 10`, `DROP_BASE_MS = 1000`, `DROP_STEP_MS = 90` y `DROP_MIN_MS = 100`;
  - `HARD_DROP_POINTS = 2`, `SOFT_DROP_POINTS = 1` y `GHOST_ALPHA = 0.2`;
  - `COLORS` (fondo, cuadrícula, piezas 1–8, etiquetas y valores).
- `games/tetra/board.ts`: funciones puras sobre el estado (`createBoard`, `randomPiece`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`, `ghostY`), portadas de `game.js` con tipos.
- `games/tetra/engine.ts`: `createTetraGame`, con el bucle, el input, la caída, el dibujado del tablero, NEXT y LÍNEAS, y el ciclo de vida.

Convenciones:

- Coordenadas lógicas en 800×600, con el tablero desplazado a `(BOARD_X, BOARD_Y)`.
- Tiempos en milisegundos, como el original. `dt` no tiene tope, como en el original, y `resume()` reinicia `lastTime` para no acumular el tiempo en pausa.
- `games/` solo se importa desde Client Components. Ningún módulo toca `window` ni `document` al importarse.
- Las teclas se leen de `KeyboardEvent.code`.

---

## Plan de implementación

1. **Constantes y tablero.** Crear `games/tetra/constants.ts` y `games/tetra/board.ts` con las constantes, las 8 piezas y las funciones puras portadas de `game.js`, tipadas y con la paleta neón. Todavía no se usan. `npm run build` pasa.
2. **Motor y registro.** Crear `games/tetra/engine.ts` con `createTetraGame`:
   - bucle `requestAnimationFrame` con `dropAccum`/`dropInterval` en ms;
   - input en `window` con `preventDefault` y repetición de teclas, ignorado si el foco está en un campo de texto (`isTypingTarget`, copiado del motor de ASTEROIDES), si está pausado o si la partida terminó;
   - dibujado del tablero centrado, la cuadrícula, la pieza fantasma, la pieza actual, NEXT y LÍNEAS;
   - `onStats({ score, lives: 1, level })` solo cuando hay cambios;
   - al chocar la pieza nueva al aparecer, `lives: 0` y `onGameOver(score)`;
   - `pause`, `resume` (reinicia `lastTime`), `restart` y `destroy` (cancela el rAF y quita los listeners).

   Registrar `tetra` en `GAME_ENGINES`.

3. **Catálogo y portada.** Añadir la entrada `tetra` en `GAMES`, después de `asteroides`. Diseñar `.cover-tetra` en `app/globals.css` con `/frontend-design`. Comprobación manual: `/juegos/tetra/jugar` monta el motor real.
4. **Fila en Supabase.**
   - Comprobar con `select id, sort_order from games` que solo está `asteroides`.
   - Aplicar `add_game_tetra` con `apply_migration` y guardar el mismo SQL en `supabase/migrations/<version>_add_game_tetra.sql`, con la versión de `list_migrations`.
   - Verificar con `select * from games where id = 'tetra'` y con `get_advisors` (seguridad).
5. **Verificación y limpieza.**
   - Jugar una partida completa en `/juegos/tetra/jugar` y guardar.
   - Comprobar el TOP 10 de `/juegos/tetra` y la pestaña TETRA de `/salon`, cargando las URLs directamente.
   - Comprobar que ASTEROIDES no tiene regresiones.
   - Borrar las puntuaciones de prueba con `execute_sql`.
   - `npm run lint` y `npm run build`.

Reglas transversales:

- Los cambios en Supabase solo con `apply_migration`. `execute_sql` solo para lecturas y para borrar las puntuaciones de prueba.
- No se usa la `service_role` / secret key.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos` muestra dos tarjetas, ASTEROIDES y TETRA, en ese orden. TETRA lleva la portada `.cover-tetra` y acento verde.
- [ ] Sin puntuaciones, `/juegos/tetra` muestra `Mejor puntuación 0`, `Partidas 0` y `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- [ ] `/juegos/tetra/jugar` muestra el canvas dentro del CRT con el tablero de 10×20 centrado, `NEXT` con una pieza y `LÍNEAS 0` a la derecha, y el HUD con `Puntuación 0`, `Vidas ♥` y `Nivel 01`.
- [ ] `←`/`→` mueven la pieza una columna y no la dejan salir del tablero. Mantenerlas pulsadas repite el movimiento.
- [ ] `↑` y `X` rotan en sentido horario. Junto a una pared, la rotación se aplica desplazando la pieza 1 o 2 columnas si hace falta.
- [ ] `↓` baja la pieza una fila y suma 1 punto. `Espacio` la deja en la posición de la pieza fantasma, suma 2 puntos por celda recorrida y la fija.
- [ ] Pulsar las teclas del juego no desplaza la página.
- [ ] Durante la partida aparecen las 8 piezas, incluida la tuerca (anillo de 3×3), cada una con su color neón de la tabla de alcance.
- [ ] La pieza fantasma se dibuja translúcida en la fila donde aterrizaría la pieza actual.
- [ ] En el nivel 1, completar 1, 2, 3 o 4 líneas a la vez suma 100, 300, 500 u 800 puntos. En el nivel 2 suma el doble.
- [ ] Cada línea completada se elimina, las filas de encima bajan y `LÍNEAS` aumenta.
- [ ] Al llegar a 10 líneas, el HUD muestra `Nivel 02` y la caída automática pasa de 1000 ms a 910 ms por fila.
- [ ] El canvas no pinta SCORE, LEVEL, PAUSA ni GAME OVER.
- [ ] `P`, `Esc` y el botón `PAUSA` congelan el juego y muestran `EN PAUSA`; cualquiera de los tres lo reanuda sin que la pieza salte varias filas. Cambiar de pestaña lo pausa.
- [ ] Cuando una pieza nueva no cabe al aparecer, se abre `FIN DEL JUEGO` con la puntuación real y el HUD pasa a `Vidas —`.
- [ ] Tras guardar, el modal muestra `PUNTUACIÓN GUARDADA`. Al cargar `/juegos/tetra` y `/salon`, la fila aparece en el TOP 10 y en la pestaña `TETRA`.
- [ ] `/salon` muestra las pestañas `ASTEROIDES` y `TETRA`, y cambiar de una a otra no produce errores en consola.
- [ ] `FIN` abre el modal sin campo de nombre, con `▸ PARTIDA ABANDONADA — NO SE GUARDA_`.
- [ ] `JUGAR DE NUEVO` empieza con tablero vacío, `Puntuación 0`, `Vidas ♥`, `Nivel 01` y `LÍNEAS 0`.
- [ ] Al pulsar `SALIR` y volver a entrar, solo corre un bucle (la caída no se acelera) y no quedan listeners del juego en otras páginas.
- [ ] `select * from games where id = 'tetra'` devuelve la fila con los textos de `GAMES` y `sort_order = 2`. `supabase/migrations/` coincide con `list_migrations`.
- [ ] ASTEROIDES se juega y guarda igual que antes. `/juegos/caida/jugar` sigue con la partida simulada.
- [ ] Ningún archivo de `games/tetra/` declara estado mutable en el nivel del módulo.
- [ ] La consola no muestra errores durante una partida completa (cargando las URLs directamente).
- [ ] Las puntuaciones de prueba se borran de `scores` al terminar.

---

## Decisiones

- **Sí:** portar a TypeScript modular en `games/tetra/`, con el contrato `GameFactory`. Sobrevive a la navegación SPA.
- **No:** servir el `game.js` original con `<Script>` o en un iframe. Sus globales y listeners chocan con el App Router e impiden integrar el HUD y el modal.
- **Sí:** nombre `TETRA`, id `tetra`. El usuario quería "Tetris"; se usa un nombre propio para no reproducir la marca de un juego concreto.
- **Sí:** entrada nueva aparte, sin tocar `caida`. Decisión del usuario, como con `asteroides` y `rocas`.
- **No:** convertir `caida` en el juego real. El usuario prefirió mantenerla simulada.
- **Sí:** textos `short` y `long` de CAÍDA. Describen con exactitud la mecánica del código. Decisión del usuario, aunque se repitan en las dos entradas.
- **Sí:** las 8 piezas del código, tuerca incluida. La mecánica no cambia; el código manda sobre el README.
- **Sí:** paleta neón del Vault para las 8 piezas. Encaja con ASTEROIDES y con el CRT.
- **No:** colores pastel originales.
- **Sí:** PUZZLE con acento verde. Se distingue de CAÍDA (magenta) y de ASTEROIDES (cian).
- **Sí:** NEXT y LÍNEAS dibujados en el canvas, a la derecha del tablero. Las líneas no tienen sitio en el HUD de React.
- **No:** leyenda de controles en el canvas.
- **Sí:** fingir 1 vida (`♥` en partida, `—` al terminar). Decisión del usuario; evita cambiar la plataforma.
- **No:** extensión E1 (`lives: number | null`).
- **Sí:** `dt` sin tope y en milisegundos, como el original. La pausa de React y el reinicio de `lastTime` en `resume()` evitan el salto tras pausar o cambiar de pestaña.
- **Sí:** repetición de teclas en movimiento, rotación y caídas, como el original. `P`/`Esc` no se repiten.
- **Sí:** copiar `isTypingTarget` en el motor de TETRA.
- **No:** extraerlo a un módulo compartido, porque tocaría el motor de ASTEROIDES. Se hará cuando haya un tercer motor.
- **Sí:** descartar el tema claro/oscuro y su `localStorage`. La plataforma tiene un único aspecto.
- **Sí:** portada nueva `.cover-tetra` (pila, fila a punto de completarse y tuerca cayendo).
- **No:** reutilizar `.cover-tetro`, porque pertenece a CAÍDA.

---

## Riesgos

| Riesgo                                                                                | Mitigación                                                                                                        |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| El 404 tras `updateTag` de SPEC 06 al navegar justo después de guardar.               | Fuera de alcance; los criterios de consola se comprueban cargando la URL directamente.                            |
| El Strict Mode monta el efecto dos veces en dev y crea dos bucles.                    | `destroy()` cancela el rAF y los listeners; un criterio comprueba que la caída no se acelera.                     |
| Las teclas del juego interfieren con el input de nombre del modal (Espacio, flechas). | El motor ignora el teclado si está pausado, en game over o con el foco en un `input`.                             |
| Sin tope de `dt`, un frame muy lento hace que la pieza baje una fila de golpe.        | Igual que el original (como mucho una fila por frame). La pausa por `visibilitychange` cubre la pestaña oculta.   |
| La vida fingida puede confundir: el HUD muestra `♥` en un juego sin vidas.            | Decisión aceptada. Si molesta, la extensión E1 de `.claude/skills/add-game/contract.md` lo resuelve en otra spec. |
| TETRA y CAÍDA comparten textos en `GAMES`.                                            | Aceptado. CAÍDA no está en la tabla `games`, así que en `/juegos` y en `/salon` solo aparece TETRA.               |
| Primer Salón con dos pestañas reales.                                                 | Un criterio comprueba que el cambio de pestaña funciona sin errores.                                              |

---

## Lo que **no** está en esta spec

- Tema claro/oscuro, `localStorage` y la UI DOM del original.
- Leyenda de controles en el canvas.
- Líneas en el HUD de React o en `scores`.
- Extensión E1 (vidas opcionales).
- Cambios en la entrada simulada CAÍDA.
- Pieza de reserva, sonido y controles táctiles.
- Cambios de esquema, de `lib/catalog.ts` o de `saveScoreAction`.
- El arreglo del 404 tras guardar.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
