# SPEC 08 — Juego real de rebote

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06, SPEC 06.5
> **Fecha:** 2026-11-10
> **Objetivo:** Portar a TypeScript el juego de `references/started-games/04-arkanoid` y hacerlo jugable en `/juegos/rebote/jugar` como REBOTE, con su fila en la tabla `games` de Supabase, su TOP 10 y su pestaña en el Salón de la Fama.

---

## Por qué existe esta spec

ASTEROIDES y TETRA son hoy los dos juegos reales. El siguiente de `references/started-games/` es un rompe-ladrillos con sprites y sonido. Esta spec lo integra con la receta de SPEC 05, 06 y 06.5, bajo el nombre REBOTE. Es el primer juego que necesita assets estáticos y sonido.

Particularidades del original:

- **Fuente:** `references/started-games/04-arkanoid`:
  - `game.js` (268 líneas), `levels.js` (50), `assets/spritesheet.js` (66) e `index.html` (18);
  - `assets/spritesheet-breakout.png` (559×337);
  - `assets/sounds/ball-bounce.mp3` y `assets/sounds/break-sound.mp3`.
- **Por qué no se usa tal cual:**
  - Todo el estado vive en el nivel del módulo: `paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `gameState`, `currentLevel`, `isPaused`, `keys` y `lastTime`, más `ssImg`, `ssLoaded` y `ssCallbacks` en `spritesheet.js`.
  - Los `keydown`/`keyup` están en `document` y nunca se quitan.
  - El `requestAnimationFrame` no tiene ciclo de vida.
  - Los `Audio` se crean al cargar el script.
  - Dibuja en el canvas su propio HUD y sus overlays de pausa, game over y victoria.
- **Diferencias con el contrato de motor:**
  - El canvas ya es de 800×600, así que no hace falta recolocar nada.
  - El ratón se usa en el propio canvas (`mousemove`).
  - Las 3 vidas son un número, así que no hace falta E1.
  - Necesita **E2** (spritesheet) y **E3** (sonido).
  - El selector de nivel de la pausa no cabe en el contrato y se descarta.
- **La mecánica no cambia.** Se copian sin modificar la física de la pelota y de la paleta, los 5 niveles, sus multiplicadores de velocidad, la puntuación y las vidas.
- **La paleta mide 81 px de ancho, no 162.** El `CLAUDE.md` del original dice 162 (el ancho del sprite), pero el código la dibuja y la hace colisionar con `w: 81`, y se porta el código.

---

## Alcance

**Dentro:**

- **Utilidad compartida:** `isTypingTarget` se extrae a `games/shared/input.ts`. ASTEROIDES, TETRA y REBOTE lo importan desde ahí.
- **Extensiones de contrato:**
  - **E2:** el spritesheet en `public/games/rebote/spritesheet-breakout.png`, cargado en la factory con pantalla `CARGANDO…`.
  - **E3:** los sonidos en `public/games/rebote/sounds/`, creados en la factory y parados en `pause()` y `destroy()`.
  - Ninguna toca `games/types.ts`, `GameCanvas` ni `GamePlayer`, así que ASTEROIDES y TETRA no cambian.
- **Motor TypeScript** en `games/rebote/`:
  - **Paleta:** `{ y: 560, w: 81, h: 14 }`, centrada al empezar (`x = (800 − 81) / 2`). Se mueve con el teclado a `PADDLE_SPEED = 400` px/s, siempre dentro de 0…800.
  - **Pelota:** 16×16. Aparece centrada sobre la paleta (`y = paddle.y − 16`) y sale al momento, sin saque, con `vx = BASE_BALL_VX × speed` y `vy = BASE_BALL_VY × speed`, donde `BASE_BALL_VX = 200`, `BASE_BALL_VY = −300` y `speed` es el multiplicador del nivel.
  - **Rebotes:**
    - En las paredes izquierda, derecha y superior, la pelota se recoloca en el borde y su componente de velocidad cambia de signo.
    - En la paleta rebota si `vy > 0`, se solapa en horizontal y `ball.y + 16` está entre `paddle.y` y `paddle.y + 14 + 8`. Entonces se recoloca encima y `vy = −|vy|`, sin cambiar de ángulo.
  - **Bloques:**
    - Rejilla `BLOCK_COLS = 10` × `BLOCK_ROWS = 6`, con bloques de `BLOCK_W = 64` × `BLOCK_H = 24` desde `BLOCKS_ORIGIN_X = 80` y `BLOCKS_ORIGIN_Y = 80`.
    - Colisión AABB, con un solo bloque por frame. El bloque muere al instante, `vy` cambia de signo y se suman 10 puntos.
  - **Explosión:** al morir un bloque se reproducen los 4 frames de `EXPLOSION_FRAMES[color]` en `EXPLOSION_DURATION = 150` ms. Las explosiones son ilimitadas y se borran al cargar un nivel.
  - **Niveles:** los 5 de `LEVELS`, con sus patrones y colores sin cambios:

    | Nivel | Patrón                 | Bloques | `speed` |
    | ----- | ---------------------- | ------- | ------- |
    | 1     | Parrilla completa 10×6 | 60      | 1.00    |
    | 2     | Pirámide               | 40      | 1.10    |
    | 3     | Tablero de ajedrez     | 30      | 1.21    |
    | 4     | Filas con huecos       | 39      | 1.33    |
    | 5     | Marco + cruz           | 39      | 1.46    |

  - **Avance:** al romper el último bloque de un nivel se carga el siguiente, con la pelota otra vez sobre la paleta (que se queda donde estaba) y la velocidad del nuevo nivel. La puntuación se acumula. El máximo teórico son 208 bloques, es decir, 2080 puntos.
  - **Vidas:** se empieza con 3. Si `ball.y > 600` se pierde una. Con vidas restantes, la pelota vuelve sobre la paleta con la velocidad del nivel actual; con 0, termina la partida.
  - **Bucle:** `dt` en segundos, con tope `MAX_DT = 0.05` y primer frame con `dt = 0`. `resume()` reinicia `lastTime`.
  - **Sin estado global:** `createReboteGame(canvas, callbacks)` devuelve `pause`, `resume`, `restart` y `destroy`.
- **Controles:**
  - `ArrowLeft`/`ArrowRight` (`KeyboardEvent.code`) mueven la paleta mientras están pulsadas.
  - Mover el ratón sobre el canvas centra la paleta en el cursor (`x = mouseX − 81 / 2`, limitada a 0…719), con las coordenadas convertidas a 800×600 con `getBoundingClientRect()`.
  - El teclado y el ratón funcionan a la vez, como en el original.
  - `KeyP` y `Escape` llaman a `onPauseToggle()`, sin repetición.
  - Las flechas, `P` y `Esc` hacen `preventDefault()` mientras el juego está montado.
  - El teclado y el ratón se ignoran si el juego está pausado, si la partida terminó o, en el caso del teclado, si el foco está en un campo de texto.
  - Al pausar se sueltan las flechas pulsadas, para que la paleta no se mueva sola al reanudar.
- **Visual:**
  - La paleta, la pelota, los bloques y las explosiones se dibujan con los sprites del original:
    - los bloques escalan el sprite de 32×16 a 64×24;
    - la paleta escala el de 162×14 a 81×14;
    - el bloque gris usa los frames de explosión del rojo, como el original.
  - Fondo `#000`.
  - El texto de carga y el de error usan la paleta neón del Vault (`COLORS`): `CARGANDO…` en cian `#00f5ff` y `▸ SEÑAL PERDIDA — REINTENTA_` en magenta `#ff006e`, en `monospace` y centrados.
- **Canvas** de 800×600 dentro de `.crt-screen`, con el área de juego completa y sin paneles auxiliares.
- **HUD en React:**
  - La puntuación, las vidas (`♥ ♥ ♥`) y el nivel salen de `onStats`.
  - Del canvas se quitan `Score:`, `Nivel:`, las pelotas de vidas y los overlays `GAME OVER`, `¡Completaste el juego!` y `PAUSA`.
  - En el canvas solo quedan los elementos del juego (bloques, explosiones, paleta y pelota) y, mientras carga, `CARGANDO…`.
- **Fin de partida:**
  - Al perder la tercera vida, o al superar el nivel 5, el motor se detiene, emite `lives: 0` en el primer caso y llama una vez a `onGameOver(score)`. Se abre `FIN DEL JUEGO`, con guardado vía `saveScoreAction`.
  - `FIN` abandona sin guardar.
  - `JUGAR DE NUEVO` llama a `restart()`, que recentra la paleta, vuelve al nivel 1 con 3 vidas y 0 puntos, y reanuda.
  - Se eliminan los overlays de fin y de victoria del original. El original no tiene reinicio interno.
- **Registro** del motor en `GAME_ENGINES` (`games/registry.ts`) con la clave `rebote`.
- **Catálogo:** entrada nueva en `GAMES` de `lib/games.ts`, justo después de `tetra`:

  | Campo   | Valor                                                                                                                                                                                                                                              |
  | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `id`    | `"rebote"`                                                                                                                                                                                                                                         |
  | `title` | `"REBOTE"`                                                                                                                                                                                                                                         |
  | `cat`   | `"ARCADE"`                                                                                                                                                                                                                                         |
  | `color` | `"magenta"`                                                                                                                                                                                                                                        |
  | `cover` | `"cover-rebote"`                                                                                                                                                                                                                                   |
  | `best`  | `0`                                                                                                                                                                                                                                                |
  | `plays` | `"0"`                                                                                                                                                                                                                                              |
  | `short` | "Rebota la pelota y derriba cinco muros de ladrillos."                                                                                                                                                                                             |
  | `long`  | "Mueve la paleta con el ratón o las flechas y mantén la pelota en juego. Cada ladrillo vale 10 puntos y, al limpiar un muro, llega otro con un patrón distinto y una pelota un 10 % más rápida. Tienes tres vidas para superar los cinco niveles." |

- **Portada** `.cover-rebote` en `app/globals.css`, en CSS puro: un muro de ladrillos magenta con una brecha, la pelota cian saliendo por ella con estela y la paleta abajo. Se diseña con `/frontend-design` y es distinta de `.cover-bricks`.
- **Supabase:** migración de datos `add_game_rebote` aplicada con `apply_migration`, con `insert` en `games` (`sort_order = 3`) y copia idéntica en `supabase/migrations/`.

**Fuera de alcance (para futuras specs):**

- El selector de nivel del overlay de pausa (botones 1–5 y su listener `click`). Requiere spec de plataforma («selector de nivel»).
- El HUD y los overlays dibujados en el canvas del original (`Score:`, `Nivel:`, las pelotas de vidas, `GAME OVER`, `¡Completaste el juego!` y `PAUSA`).
- El control de volumen o silencio. Requiere spec de plataforma.
- La extensión E1 (vidas opcionales): no hace falta.
- Cambiar o quitar la entrada simulada `bloque-buster` (BLOQUE BUSTER), que sigue en `GAMES` con su partida simulada y su `.cover-bricks`.
- Física de ángulo en la paleta, power-ups y más de 5 niveles. Cambiarían la mecánica del original.
- Una página o sección de créditos para el autor del spritesheet.
- Controles táctiles y soporte móvil jugable.
- Cambios en el esquema de Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- El arreglo del `fetch-cache` (`createPublicClient` con `cache: "no-store"`).
- El 404 tras guardar de SPEC 06.
- Tests automatizados.

---

## Modelo de datos

```ts
// games/rebote/engine.ts — estado interno, nunca en el nivel del módulo
type Rect = { x: number; y: number; w: number; h: number };
type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
type Block = Rect & { color: BlockColor; alive: boolean };
type Explosion = Rect & { color: BlockColor; elapsed: number }; // ms
type Ball = Rect & { vx: number; vy: number }; // px/s
type Phase = "loading" | "error" | "playing" | "gameover";
type State = {
  paddle: Rect;
  ball: Ball;
  blocks: Block[];
  explosions: Explosion[];
  keys: { ArrowLeft: boolean; ArrowRight: boolean };
  score: number;
  lives: number;
  level: number; // 1–5
  phase: Phase;
  paused: boolean;
};
```

```ts
// games/rebote/levels.ts — datos de levels.js, sin cambios
type LevelBlock = { col: number; row: number; color: BlockColor };
type Level = { speed: number; blocks: LevelBlock[] };
export const LEVELS: Level[]; // 5 niveles: 1.00, 1.10, 1.21, 1.33, 1.46
```

```ts
// games/rebote/sprites.ts — coordenadas de spritesheet.js
type Frame = { sx: number; sy: number; sw: number; sh: number };
export const SPRITES: {
  paddle: Frame;
  ball: Frame;
  blocks: Record<BlockColor, Frame>;
};
export const EXPLOSION_FRAMES: Record<BlockColor, Frame[]>; // 4 frames cada uno
export const EXPLOSION_DURATION = 150; // ms
```

```sql
-- supabase/migrations/<version>_add_game_rebote.sql
insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values (
  'rebote',
  'REBOTE',
  'Rebota la pelota y derriba cinco muros de ladrillos.',
  'Mueve la paleta con el ratón o las flechas y mantén la pelota en juego. Cada ladrillo vale 10 puntos y, al limpiar un muro, llega otro con un patrón distinto y una pelota un 10 % más rápida. Tienes tres vidas para superar los cinco niveles.',
  'ARCADE',
  'cover-rebote',
  'magenta',
  3
);
```

Archivos:

- `games/shared/input.ts`: `isTypingTarget(target)`, movido sin cambios desde los motores de ASTEROIDES y TETRA.
- `games/rebote/constants.ts`:
  - `W = 800`, `H = 600` y `MAX_DT = 0.05`;
  - `PADDLE_SPEED = 400`, `PADDLE_Y = 560`, `PADDLE_W = 81`, `PADDLE_H = 14`, `PADDLE_CATCH = 8` y `BALL_SIZE = 16`;
  - `BASE_BALL_VX = 200` y `BASE_BALL_VY = −300`;
  - `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`, `BLOCKS_ORIGIN_X = 80` y `BLOCKS_ORIGIN_Y = 80`;
  - `BLOCK_POINTS = 10`, `START_LIVES = 3` y `LAST_LEVEL = 5`;
  - `COLORS`: fondo `#000`, cian `#00f5ff` (carga) y magenta `#ff006e` (error);
  - `SPRITESHEET_SRC = "/games/rebote/spritesheet-breakout.png"`, `BOUNCE_SRC = "/games/rebote/sounds/ball-bounce.mp3"` y `BREAK_SRC = "/games/rebote/sounds/break-sound.mp3"`.
- `games/rebote/levels.ts`: `LEVELS`, generado con los mismos bucles y arrays (`rowColors1`, `rowColors2`, `rowColors4`, `pyStart`, `pyEnd`, `gaps4`) que `levels.js`.
- `games/rebote/sprites.ts`: `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION` y `drawFrame(ctx, img, frame, x, y, w, h)`, que recibe la imagen como parámetro.
- `games/rebote/sounds.ts`: `createSounds()`, que devuelve `{ bounce(), breakBlock(), stopAll(), dispose() }`. Cada llamada reproduce un `cloneNode()` con `.catch(() => {})` y lo guarda en un `Set` de clones activos, que se vacía en `ended`. `stopAll()` pausa los clones activos.
- `games/rebote/engine.ts`: `createReboteGame`, con la carga del spritesheet, el bucle, el input, la física, el dibujado y el ciclo de vida.
- `public/games/rebote/spritesheet-breakout.png`, `public/games/rebote/sounds/ball-bounce.mp3` y `public/games/rebote/sounds/break-sound.mp3`: copias binarias del original (sin los `.DS_Store`).

Convenciones:

- Coordenadas en el espacio lógico 800×600, con origen arriba a la izquierda. Velocidades en px/s. `dt` en segundos, limitado a `MAX_DT = 0.05`.
- La duración de las explosiones va en milisegundos (`elapsed += dt × 1000`), como el original.
- `games/` solo se importa desde Client Components. Ningún módulo toca `window`, `document`, `Image` ni `Audio` al importarse.
- Las teclas se leen de `KeyboardEvent.code`.

---

## Plan de implementación

1. **Extraer `isTypingTarget`.** Crear `games/shared/input.ts` con la función tal como está en `games/asteroides/engine.ts`, y hacer que ASTEROIDES y TETRA la importen en lugar de su copia local. Ninguno de los dos cambia de comportamiento. `npm run build` y `npm run lint` pasan.
2. **Assets (E2).**
   - Crear `public/games/rebote/` y copiar `spritesheet-breakout.png`.
   - Crear `games/rebote/sprites.ts` con `SPRITES`, `EXPLOSION_FRAMES` y `EXPLOSION_DURATION` tipados y con los mismos valores, más `drawFrame` con la imagen como parámetro.
   - Todavía no se usan. `npm run build` pasa.
3. **Sonido (E3).**
   - Copiar `ball-bounce.mp3` y `break-sound.mp3` a `public/games/rebote/sounds/`.
   - Crear `games/rebote/sounds.ts` con `createSounds()` (clones solapables, rechazos de `play()` ignorados, `stopAll()` y `dispose()`).
   - Todavía no se usan. `npm run build` pasa.
4. **Constantes y niveles.** Crear `games/rebote/constants.ts` y `games/rebote/levels.ts`, portados con tipos y sin cambiar ningún valor. Todavía no se usan. `npm run build` pasa.
5. **Motor y registro.** Crear `games/rebote/engine.ts` con `createReboteGame`:
   - **Carga:** `new Image()` con `SPRITESHEET_SRC` dentro de la factory. Mientras carga, la fase es `loading` y el canvas pinta `CARGANDO…`. Si falla, la fase pasa a `error`, el canvas pinta `▸ SEÑAL PERDIDA — REINTENTA_` y no se llama a `onGameOver`. Si se llama a `destroy()` antes de que termine la carga, `onload` no arranca el bucle.
   - **Bucle:** `requestAnimationFrame` con `dt` limitado a `MAX_DT` y `update`/`draw` portados de `game.js`, sin el HUD ni los overlays.
   - **Input:** teclado en `window` (con `isTypingTarget` de `games/shared/input.ts`) y `mousemove` en el canvas.
   - **Sonido:** `createSounds()`. Suena `bounce()` en paredes y paleta, y `breakBlock()` al romper un bloque.
   - **Estadísticas y fin:** `onStats({ score, lives, level })` solo cuando cambia algún valor. Con 0 vidas, o al superar el nivel 5, se llama a `onGameOver(score)` una vez.
   - **Ciclo de vida:**
     - `pause()` congela la lógica, suelta las flechas y llama a `stopAll()`;
     - `resume()` reinicia `lastTime`;
     - `restart()` recentra la paleta, carga el nivel 1 con 3 vidas y 0 puntos, emite las estadísticas y reanuda;
     - `destroy()` cancela el rAF, quita todos los listeners, anula `onload`/`onerror` y llama a `dispose()`.
   - **Registro:** añadir `rebote: createReboteGame` a `GAME_ENGINES`.
6. **Catálogo y portada.** Añadir la entrada `rebote` en `GAMES`, después de `tetra`. Diseñar `.cover-rebote` en `app/globals.css`, junto a `.cover-tetra`, con `/frontend-design`. Comprobación manual: `/juegos/rebote/jugar` monta el motor real.
7. **Fila en Supabase.**
   - Comprobar con `list_tables` y `select id, sort_order from public.games` que solo están `asteroides` (1) y `tetra` (2).
   - Aplicar `add_game_rebote` con `apply_migration` y guardar el mismo SQL en `supabase/migrations/<version>_add_game_rebote.sql`, con la versión de `list_migrations`.
   - Verificar con `select * from games where id = 'rebote'` y con `get_advisors` (seguridad), sin avisos nuevos.
   - Antes de recompilar, borrar el contenido de `.next/cache/fetch-cache/` (y `.next/server/route-cache` si existe). Después del build, comprobar que `.next/server/app/juegos.html` contiene `REBOTE`.
8. **Verificación y limpieza.**
   - Jugar una partida completa en `/juegos/rebote/jugar` y guardar.
   - Comprobar el TOP 10 de `/juegos/rebote` y la pestaña REBOTE de `/salon`, cargando las URLs directamente.
   - Comprobar que ASTEROIDES y TETRA no tienen regresiones.
   - Borrar las puntuaciones de prueba con `execute_sql`, sin tocar las del usuario.
   - `npm run lint` y `npm run build`.

Reglas transversales:

- Los cambios en Supabase solo con `apply_migration`. `execute_sql` solo para lecturas y para borrar las puntuaciones de prueba.
- No se usa la `service_role` / secret key.
- No se regenera `lib/supabase/database.types.ts`, porque no hay cambio de esquema.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos` muestra tres tarjetas reales en este orden: ASTEROIDES, TETRA y REBOTE. REBOTE lleva la portada `.cover-rebote` y acento magenta.
- [ ] Sin puntuaciones, `/juegos/rebote` muestra `Mejor puntuación 0`, `Partidas 0` y `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- [ ] `/juegos/rebote/jugar` muestra brevemente `CARGANDO…` y después la parrilla completa de 60 bloques del nivel 1, la paleta centrada abajo y la pelota ya en movimiento. El HUD muestra `Puntuación 0`, `Vidas ♥ ♥ ♥` y `Nivel 01`.
- [ ] Con el spritesheet inaccesible (por ejemplo, con la petición bloqueada en DevTools), el canvas muestra `▸ SEÑAL PERDIDA — REINTENTA_` y no se abre el modal.
- [ ] `←`/`→` mueven la paleta (400 px/s) sin que salga del canvas.
- [ ] Mover el ratón sobre el canvas centra la paleta en el cursor, también con el CRT escalado, y sin que la paleta salga del canvas.
- [ ] Pulsar las flechas, `P` o `Esc` no desplaza la página.
- [ ] La pelota rebota en las paredes izquierda, derecha y superior, y en la paleta. Cada rebote hace sonar `ball-bounce.mp3`.
- [ ] Al tocar un bloque, el bloque desaparece, se reproduce su explosión de 4 frames, suena `break-sound.mp3` y la puntuación sube exactamente 10.
- [ ] Dos sonidos seguidos se solapan sin cortarse.
- [ ] Al vaciar el nivel 1, el HUD pasa a `Nivel 02`, aparece la pirámide de 40 bloques, la pelota sale de nuevo desde la paleta y la puntuación no se reinicia.
- [ ] Los niveles 3, 4 y 5 muestran el tablero de ajedrez (30 bloques), las filas con huecos (39) y el marco con cruz (39).
- [ ] La pelota del nivel 5 se mueve a ×1.46 de la del nivel 1 (`|vx| = 292`, `|vy| = 438` px/s).
- [ ] Si la pelota cae por debajo del canvas, las vidas bajan de `♥ ♥ ♥` a `♥ ♥` y la pelota vuelve a salir desde la paleta.
- [ ] El canvas no pinta `Score:`, `Nivel:`, las pelotas de vidas, `GAME OVER`, `¡Completaste el juego!` ni `PAUSA`.
- [ ] `P`, `Esc` y el botón `PAUSA` congelan el juego y muestran `EN PAUSA`; cualquiera de los tres lo reanuda sin que la pelota salte. Durante la pausa, el ratón y las flechas no mueven la paleta y no queda ningún sonido sonando. Cambiar de pestaña lo pausa.
- [ ] En la pausa no hay botones de nivel, y hacer clic en el canvas no hace nada.
- [ ] Al perder la tercera vida, el HUD pasa a `Vidas —` y se abre `FIN DEL JUEGO` con la puntuación real.
- [ ] Al vaciar el nivel 5 se abre `FIN DEL JUEGO` con la puntuación real, sin overlay de victoria en el canvas.
- [ ] Tras guardar, el modal muestra `PUNTUACIÓN GUARDADA`. Al cargar `/juegos/rebote` y `/salon`, la fila aparece en el TOP 10 y en la pestaña `REBOTE`.
- [ ] `/salon` muestra las pestañas `ASTEROIDES`, `TETRA` y `REBOTE`, y cambiar de una a otra no produce errores en consola.
- [ ] `FIN` abre el modal sin campo de nombre, con `▸ PARTIDA ABANDONADA — NO SE GUARDA_`.
- [ ] `JUGAR DE NUEVO` empieza con la parrilla del nivel 1, la paleta centrada, `Puntuación 0`, `Vidas ♥ ♥ ♥` y `Nivel 01`.
- [ ] Al pulsar `SALIR` (también durante `CARGANDO…`) y volver a entrar, solo corre un bucle (la pelota no se acelera) y no quedan listeners ni sonidos del juego en otras páginas.
- [ ] La consola no muestra 404 de `/games/rebote/…`.
- [ ] `select * from games where id = 'rebote'` devuelve la fila con los textos de `GAMES` y `sort_order = 3`. `supabase/migrations/` coincide con `list_migrations`.
- [ ] `games/asteroides/engine.ts` y `games/tetra/engine.ts` importan `isTypingTarget` de `games/shared/input.ts` y ya no lo declaran.
- [ ] ASTEROIDES y TETRA se juegan y guardan igual que antes. Escribir el nombre en su modal sigue sin mover el juego.
- [ ] `/juegos/bloque-buster/jugar` sigue con la partida simulada.
- [ ] Ningún archivo de `games/rebote/` ni de `games/shared/` declara estado mutable en el nivel del módulo.
- [ ] La consola no muestra errores durante una partida completa (cargando las URLs directamente).
- [ ] Las puntuaciones de prueba se borran de `scores` al terminar.

---

## Decisiones

- **Sí:** portar a TypeScript modular en `games/rebote/`, con el contrato `GameFactory`. Sobrevive a la navegación SPA.
- **No:** servir el `game.js` original con `<Script>` o en un iframe. Sus globales y listeners chocan con el App Router e impiden integrar el HUD y el modal.
- **Sí:** nombre `REBOTE`, id `rebote`. Es un nombre propio que no reproduce la marca del juego original.
- **Sí:** entrada nueva aparte, sin tocar `bloque-buster`. Decisión del usuario, como con TETRA y CAÍDA.
- **No:** convertir `bloque-buster` en el juego real.
- **Sí:** ARCADE con acento magenta, `sort_order = 3`. Se distingue de ASTEROIDES (cian) y TETRA (verde).
- **Sí:** textos `short` y `long` nuevos, que describen solo la mecánica del código: 10 puntos por bloque, 5 muros, +10 % de velocidad por nivel y 3 vidas.
- **No:** reutilizar los textos de BLOQUE BUSTER, que hablan de una «nave-paleta» y un «núcleo de plasma» que no existen.
- **Sí:** spritesheet original con E2. Conserva la explosión de 4 frames idéntica y era el caso previsto por el contrato.
- **No:** redibujar en neón vectorial. Habría que inventar una animación de explosión nueva. La paleta neón solo se aplica al fondo y a los textos de carga y error.
- **Sí:** sonido con E3, con clones solapables como el original (`cloneNode()`).
- **No:** control de volumen o silencio.
- **Sí:** descartar el selector de nivel de la pausa. Está fuera del contrato y permitiría saltarse niveles en una partida que puntúa.
- **Sí:** `MAX_DT = 0.05`, aunque el original no tiene tope. A 60 fps no cambia nada y evita que la pelota atraviese la paleta o un bloque en un frame lento.
- **No:** `dt` sin tope como en TETRA, porque aquí un salto de `dt` rompe colisiones.
- **Sí:** extraer `isTypingTarget` a `games/shared/input.ts` con este tercer motor, como anunció SPEC 07.
- **No:** una tercera copia.
- **Sí:** al superar el nivel 5, fin directo con `onGameOver(score)` y el modal `FIN DEL JUEGO`. Respeta el final del original sin un overlay propio en el canvas.
- **No:** texto de victoria en el canvas.
- **Sí:** 3 vidas como número, sin E1. El HUD muestra `♥ ♥ ♥` como en ASTEROIDES.
- **Sí:** el ratón y las flechas no mueven la paleta durante la pausa ni tras el fin. En el original el ratón la movía también en pausa, pero el contrato pide que `pause()` congele la lógica.
- **Sí:** paleta de 81 px, la del código, no los 162 px del `CLAUDE.md` del original.
- **Sí:** portada nueva `.cover-rebote` (muro magenta con brecha, pelota cian con estela y paleta).
- **No:** reutilizar `.cover-bricks`, porque pertenece a BLOQUE BUSTER.
- **Sí:** el sonido se gestiona en `games/rebote/sounds.ts`, con una factory sin estado de módulo, para que `pause()` y `destroy()` puedan parar los clones en curso.

---

## Riesgos

| Riesgo                                                                                            | Mitigación                                                                                                                     |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| El 404 tras `updateTag` de SPEC 06 al navegar justo después de guardar.                           | Fuera de alcance. Los criterios de consola se comprueban cargando la URL directamente.                                         |
| El catálogo prerenderizado sale sin REBOTE por `.next/cache/fetch-cache` (SPEC 07, sin resolver). | El paso 7 borra el `fetch-cache` antes de recompilar y comprueba que `.next/server/app/juegos.html` contiene `REBOTE`.         |
| El Strict Mode monta el efecto dos veces en dev: dos cargas de imagen y dos bucles.               | `destroy()` anula `onload`/`onerror`, cancela el rAF y quita los listeners. Un criterio comprueba que la pelota no se acelera. |
| `destroy()` mientras carga el spritesheet arranca un bucle huérfano.                              | `onload` comprueba que la instancia sigue viva antes de arrancar. Hay un criterio que sale durante `CARGANDO…`.                |
| Los navegadores bloquean `play()` antes del primer gesto del usuario.                             | Rechazos ignorados con `.catch(() => {})`. El juego sigue sin sonido hasta el primer gesto.                                    |
| Clones de `Audio` que siguen sonando tras `pause()` o `SALIR`.                                    | `createSounds()` guarda los clones activos en un `Set`, y `stopAll()`/`dispose()` los pausan.                                  |
| Las flechas interfieren con el input de nombre del modal.                                         | El motor ignora el teclado si está pausado, en game over o con el foco en un campo de texto.                                   |
| Una flecha que queda «pulsada» al pausar mueve la paleta al reanudar.                             | `pause()` pone `keys` a `false`.                                                                                               |
| Extraer `isTypingTarget` rompe ASTEROIDES o TETRA.                                                | Es un paso propio. La función se mueve sin cambios, y un criterio comprueba ambos juegos y su modal.                           |
| El spritesheet incluye el crédito «Made by Petraheim — Credits Appreciated».                      | Se copia el PNG intacto, crédito incluido. Una sección de créditos visible queda fuera de alcance.                             |
| Rebote sin ángulo: la pelota puede entrar en trayectorias repetitivas.                            | Es la mecánica del original y no se cambia. La física de ángulo queda fuera de alcance.                                        |

---

## Lo que **no** está en esta spec

- El selector de nivel de la pausa (requiere spec de plataforma).
- El HUD y los overlays del canvas del original.
- El control de volumen o silencio (requiere spec de plataforma).
- La extensión E1 (vidas opcionales).
- Cambios en la entrada simulada BLOQUE BUSTER.
- Física de ángulo, power-ups y más niveles.
- La sección de créditos del spritesheet.
- Controles táctiles y soporte móvil jugable.
- Cambios de esquema, de `lib/catalog.ts` o de `saveScoreAction`.
- El arreglo del `fetch-cache` y del 404 tras guardar.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
