# SPEC GJ ranaria 01 — Motor de ranaria

> **Estado:** Aprobado
> **Tema:** RANARIA (id `ranaria`): cruce por carriles con timing; mecánica nueva en el catálogo; da motor real a la entrada simulada existente en `lib/games.ts`
> **Depende de:** SPEC 05, SPEC 06, SPEC 06.5
> **Fecha:** 2026-11-11
> **Objetivo:** Crear desde cero el motor de RANARIA, un juego original de cruce de carriles con timing, y hacerlo jugable en `/juegos/ranaria/jugar` sustituyendo la partida simulada.

---

## Por qué existe esta spec

RANARIA es un juego de cruzar carriles con timing: una rana dorada atraviesa un pantano de neón cuya distribución de carriles se genera en cada nivel, en cruces de **ida y vuelta** contra el reloj, y atrapa luciérnagas que alargan el tiempo y suben un multiplicador. Ningún juego real del catálogo usa esta mecánica: ASTEROIDES es un shooter libre, TETRA un puzle de caída, REBOTE y VIBORITA son arcade de reflejos sobre una sola entidad. RANARIA aporta la lectura de patrones en movimiento y el «esperar el hueco».

Particularidades:

- **Sin original.** No hay código en `references/started-games/`. Todas las constantes de esta spec son decisiones del agente `game-jam` y son la única fuente de verdad del motor.
- **Original dentro del género, no una recreación.** No se reproduce ningún juego comercial: no hay rejilla fija de 13×13, ni carretera de 5 carriles + río fijo, ni troncos, tortugas que se sumergen o cinco casillas de llegada. Los elementos propios son: carriles generados por nivel a partir de «tramos», cables de alta tensión que descargan por ciclos, pistas reversibles, cruces de ida y vuelta, luciérnagas con multiplicador ×1–×5 y un reloj de luz que se recarga.
- **Entrada existente.** `ranaria` ya está en `GAMES` de `lib/games.ts` como partida simulada (`cover-rana`, `green`). Esta spec **modifica esa entrada** (textos, color, portada, `best` y `plays`) en lugar de crear una nueva. La fila de Supabase y la portada van en la spec 02.
- **Primera de dos (tres) fases.** Esta spec crea el motor, lo registra y actualiza la entrada en `GAMES`. `02-ranaria-integracion.md` añade la portada, la fila en Supabase, el guardado, el TOP 10 y el Salón. `03-ranaria-pulido.md` añade sonido y efectos.
- **Encaje con el contrato de motor:**
  - El área de juego ocupa el canvas completo de 800×600: una franja de indicadores de 40 px arriba y una rejilla de 20 columnas × 14 filas de 40 px debajo.
  - Solo teclado; no hay ratón.
  - Vidas como número (`START_LIVES = 3`): no hace falta E1.
  - Sin imágenes ni sonido (vector neón): no hacen falta E2 ni E3 en esta fase. El sonido va en la spec 03.
  - `isTypingTarget` ya está en `games/shared/input.ts`.

---

## Alcance

**Dentro:**

- **Motor TypeScript** en `games/ranaria/`:
  - **Área de juego:**
    - Franja de indicadores: `y ∈ [0, 40)`, `PANEL_H = 40`.
    - Rejilla: `COLS = 20` × `ROWS = 14` celdas de `CELL = 40` px, desde `y = 40` hasta `y = 600`. La fila `r` ocupa `y ∈ [40 + 40r, 80 + 40r)`; la columna `c` tiene su centro en `x = 40c + 20`.
    - Fila 0 = **orilla norte**, fila 13 = **orilla sur**, filas 1–12 = **12 carriles** generados.
  - **Tipos de carril** (`LaneKind`):
    - `islote`: franja segura de tierra. No tiene objetos. Aquí aparecen luciérnagas.
    - `pista`: carril de **rayos**, barras de luz de 1–3 celdas que se desplazan en horizontal. Tocarlas mata.
    - `cienaga`: agua tóxica. Caer en ella mata, salvo que la rana esté sobre un **nenúfar**: plataforma de 2–4 celdas que deriva en horizontal y arrastra a la rana.
    - `cable`: línea de alta tensión sin objetos. Ciclo de `CABLE_PERIOD = 3.2` s: `CABLE_SAFE = 2.0` s inactivo, `CABLE_WARN = 0.6` s de aviso (parpadeo) y `CABLE_ZAP = 0.6` s de descarga. Estar en la fila durante la descarga mata. Cada cable empieza con un desfase aleatorio en `[0, 3.2)`.
    - Una `pista` puede ser **reversible**: cada `REVERSE_EVERY = 6` s invierte su sentido; durante el último `REVERSE_WARN = 1` s antes de invertir, sus flechas parpadean en amarillo. Los rayos conservan su posición al invertir. Desfase inicial aleatorio en `[0, 6)`.
  - **Generación del pantano** (`generateLayout(level, random)`, pura):
    - Los 12 carriles se reparten en **tramos** de carriles peligrosos separados por **un** `islote`.
    - Niveles 1–3: los tramos son una permutación aleatoria de `[3, 2, 2, 2]` (4 tramos + 3 islotes = 12).
    - Nivel 4 en adelante: una permutación aleatoria de `[4, 3, 3]` o de `[4, 4, 2]` (50 % cada conjunto; 3 tramos + 2 islotes = 12).
    - Los tramos se colocan de la fila 12 (abajo) a la fila 1 (arriba), con un islote entre cada dos.
    - Cada tramo es entero de familia `pista` o `cienaga` (50 % cada una). Se repite el sorteo de familias hasta que haya al menos un tramo de cada familia.
    - Desde el nivel 2, en cada tramo de `pista` un carril al azar pasa a `cable` con probabilidad 0.5, con un máximo de `1` cable en el nivel 2–3 y `2` desde el nivel 4.
    - Desde el nivel 3, cada `pista` restante es reversible con probabilidad 0.3, con un máximo de `1` en los niveles 3–4 y `2` desde el nivel 5.
    - Dentro de un tramo, el sentido alterna de un carril al siguiente; el sentido del primer carril de cada tramo es aleatorio.
  - **Objetos de cada carril:**
    - Velocidad del carril: `|v| = base × speedMult(level)`, con `base` aleatoria en `[70, 130]` px/s para `pista` y en `[40, 90]` px/s para `cienaga`.
    - `speedMult(level) = min(1 + 0.1 × (level − 1), 2.0)`. Ejemplo: nivel 1 → 1.0; nivel 5 → 1.4; nivel 11 en adelante → 2.0.
    - Rayos (`pista`): largo en celdas aleatorio en `[1, 2]` en los niveles 1–2 y en `[1, 3]` desde el nivel 3; hueco entre rayos de `[3, 6]` celdas en los niveles 1–3 y de `[2, 5]` desde el nivel 4.
    - Nenúfares (`cienaga`): largo en `[3, 4]` celdas en los niveles 1–2, `[2, 4]` en los niveles 3–5 y `[2, 3]` desde el nivel 6; hueco de `[2, 4]` celdas.
    - Los objetos se colocan de izquierda a derecha desde `x = −160` hasta llenar el ciclo `LOOP = 960` px (800 + 4 celdas). Al moverse, un objeto cuyo borde izquierdo pasa de `x = 880` vuelve a `x − 960`; uno cuyo borde derecho baja de `x = −80` pasa a `x + 960`.
  - **Rana:**
    - Posición `x` en px (centro, continuo) y `row` entera. Empieza en la orilla sur, columna 9 (`x = 380`, `row = 13`).
    - **Salto:** cada pulsación mueve una celda arriba, abajo, izquierda o derecha. El salto dura `HOP_TIME = 0.1` s; durante el salto la rana está **en el aire** y no colisiona. Se admite **un** salto en cola pulsado durante el salto anterior; el resto se descarta.
    - Un salto vertical fuera de las filas 0–13 se ignora. Un salto horizontal se limita a `x ∈ [20, 780]`.
    - Al aterrizar en una fila que no es `cienaga`, `x` se ajusta al centro de columna más cercano.
    - Sobre un nenúfar, la rana se desplaza con él (`x += v × dt`) mientras no está en el aire.
  - **Muertes** (solo con la rana en tierra, no en el aire):
    - **Rayo:** en una `pista`, el intervalo `[x − 14, x + 14]` se solapa con un rayo encogido 4 px por cada lado.
    - **Hundida:** en una `cienaga`, el centro `x` no está dentro de ningún nenúfar (al aterrizar o en cualquier frame).
    - **Arrastrada:** sobre un nenúfar, `x < 0` o `x > 800`.
    - **Descarga:** en una fila `cable` durante la fase de descarga.
    - **Apagada:** el reloj de luz llega a 0.
  - **Cruces de ida y vuelta:**
    - Cada nivel son `CROSSINGS_PER_LEVEL = 3` cruces: **sur → norte**, **norte → sur** y **sur → norte**.
    - Un cruce se completa al aterrizar en la orilla de destino (fila 0 si va al norte, fila 13 si va al sur). El siguiente cruce empieza en ese mismo sitio, con el sentido invertido.
    - Al completar el tercer cruce, el nivel sube, se genera un pantano nuevo con `generateLayout(level + 1)` y la rana vuelve a la orilla sur, columna 9, con sentido norte. Durante `TRANSITION_TIME = 1.2` s (fase `transition`) los carriles nuevos ya se mueven, el teclado se ignora y el reloj no corre.
  - **Reloj de luz:**
    - `TIME_PER_CROSSING = 25` s por cruce. Corre solo en la fase `playing`. Se reinicia a 25 al empezar cada cruce y al reaparecer tras perder una vida.
  - **Luciérnagas** (mecánica distintiva):
    - Se intenta generar una cada `FIREFLY_EVERY = 4` s mientras haya menos de `FIREFLY_MAX = 2`.
    - Aparecen en un `islote` (columna aleatoria) o encima de un nenúfar (celda aleatoria del nenúfar, y viajan con él), 50 % cada caso; nunca en las orillas ni en la fila de la rana. Si no hay ningún nenúfar, siempre en un islote.
    - Duran `FIREFLY_LIFE = 7` s; parpadean los últimos 2 s. Si viajan en un nenúfar, desaparecen con él al salir por el borde del ciclo.
    - Se atrapan con la rana en tierra, en la misma fila y `|rana.x − luciérnaga.x| < 28`.
    - Al atrapar una: se suman `FIREFLY_POINTS × mult` puntos (`FIREFLY_POINTS = 50`, con el multiplicador de antes de subirlo), `mult = min(mult + 1, MULT_MAX)` con `MULT_MAX = 5`, y el reloj suma `FIREFLY_TIME = 3` s sin pasar de 25.
    - Al perder una vida, `mult` vuelve a 1.
  - **Puntuación:**
    - **Avance:** `ROW_POINTS = 10` por cada fila nueva alcanzada hacia el destino del cruce actual (la mejor marca del cruce; perder una vida no la reinicia y volver atrás no suma).
    - **Luciérnaga:** `50 × mult`, como arriba. Ejemplo: la 1.ª vale 50 (y pasa a ×2), la 2.ª 100 (×3), la 3.ª 150 (×4).
    - **Cruce:** `(CROSS_POINTS × level + TIME_POINTS × floor(reloj)) × mult`, con `CROSS_POINTS = 100` y `TIME_POINTS = 10`.
    - **Pantano completo** (tercer cruce): `+ SWAMP_POINTS × level`, con `SWAMP_POINTS = 500`, además del bonus del cruce.
    - Ejemplo: nivel 1, primer cruce sin morir, una luciérnaga atrapada y 15,6 s de reloj al llegar: avance 13 × 10 = 130; luciérnaga 50; cruce (100 + 150) × 2 = 500. Total 680.
    - La puntuación es entera y se limita a `MAX_SCORE = 10_000_000`.
  - **Nivel:** empieza en 1 y sube en 1 al completar los tres cruces. Afecta a `speedMult`, a la composición de tramos, a cables, reversibles y largos de objetos, como se indica arriba.
  - **Vidas:** `START_LIVES = 3`. Vida extra cada `EXTRA_LIFE_EVERY = 10_000` puntos (al cruzar 10 000, 20 000…), con tope `MAX_LIVES = 5`; si ya hay 5, el umbral se consume sin dar vida.
  - **Perder una vida:** se resta una vida, `mult = 1` y la fase pasa a `dying` durante `DYING_TIME = 0.8` s (los carriles siguen moviéndose; el reloj y el teclado no). Después:
    - con vidas > 0, la rana reaparece en la orilla de salida del cruce actual (fila 13 si va al norte, fila 0 si va al sur), columna 9, con el reloj a 25;
    - con vidas = 0, la partida termina.
  - **Fin de partida:** solo al quedarse sin vidas, tras la fase `dying`.
  - **Bucle:** `requestAnimationFrame` con `dt` en segundos, tope `MAX_DT = 0.05` y primer frame con `dt = 0`. `resume()` reinicia `lastTime`.
  - **Sin estado global:** `createRanariaGame(canvas, callbacks)` devuelve `pause`, `resume`, `restart` y `destroy`.
- **Controles:**
  - `ArrowUp`/`KeyW` → salto arriba; `ArrowDown`/`KeyS` → abajo; `ArrowLeft`/`KeyA` → izquierda; `ArrowRight`/`KeyD` → derecha. Un salto por pulsación: los `keydown` con `e.repeat` se ignoran (mantener la tecla no repite).
  - En la fase `waiting`, el primer salto válido arranca la partida (fase `playing`) y cuenta como salto.
  - `KeyP` y `Escape` llaman a `onPauseToggle()`, sin repetición.
  - Las flechas, WASD, `P` y `Esc` hacen `preventDefault()` mientras el juego está montado.
  - El teclado se ignora si el juego está pausado, si la partida terminó, en las fases `dying` y `transition`, o si el foco está en un campo de texto (`isTypingTarget` de `games/shared/input.ts`).
  - Al pausar se vacía el salto en cola; un salto ya empezado termina al reanudar.
- **Visual** con la paleta neón del Vault (`COLORS`):
  - fondo `#000`;
  - orillas e islotes: `#06140c` con puntos de hierba `#00ff88` al 25 % de opacidad;
  - orilla de destino del cruce actual: línea discontinua amarilla `#f5ff00` al 60 % en su borde interior;
  - `pista`: `#0a0a18` con separadores discontinuos cian `#00f5ff` al 20 %; rayos como barras magenta `#ff006e` de 24 px de alto con glow (`shadowBlur = 12`) y la punta delantera en tinta `#e6e9ff`; en las reversibles, flechas `›`/`‹` cada 160 px en cian al 40 %, que parpadean en amarillo `#f5ff00` durante el aviso;
  - `cienaga`: `#001a22` con dos líneas onduladas cian al 15 % que se desplazan a 20 px/s; nenúfares en verde `#00ff88` (rectángulo redondeado de 32 px de alto con una muesca triangular en el extremo delantero y glow suave);
  - `cable`: `#05050f` con una línea cian `#00f5ff` al 35 % en el centro de la fila; aviso: la línea parpadea a 10 Hz; descarga: la fila entera en tinta `#e6e9ff` al 25 % con un zigzag cian que se redibuja cada frame y glow;
  - rana: cuerpo amarillo `#f5ff00` de 28×28 con glow, dos ojos negros hacia el sentido del último salto y patas en arco; en el aire se dibuja un 15 % más grande;
  - luciérnagas: núcleo tinta `#e6e9ff` de radio 4 con halo lima `#b6ff3b` (`shadowBlur = 14`) que pulsa a 2 Hz;
  - muerte (`dying`): en lugar de la rana, un anillo que crece de 6 a 30 px y se desvanece en 0.8 s, magenta para rayo/descarga, cian para hundida/arrastrada y amarillo para apagada;
  - franja de indicadores: fondo `#05050f` con línea inferior cian al 30 %. A la izquierda, **reloj de luz** como barra de 300×10 px en `x = 16` con la etiqueta `LUZ` (amarilla; magenta y parpadeante por debajo de 5 s). En el centro, el **multiplicador** `×N` en cian, `20px monospace`. A la derecha, la flecha `▲`/`▼` del sentido del cruce y **tres pepitas** de cruce (círculos de radio 6: rellenos en amarillo los completados en este nivel, contorno los pendientes);
  - textos dentro de la rejilla en `20px monospace`, centrados en `x = 400`, en cian `#00f5ff` con glow: `▸ SALTA PARA EMPEZAR_` en `waiting` (sobre la fila 12) y `▸ NUEVO PANTANO_` en `transition` (en el centro de la rejilla).
- **Canvas** de 800×600 dentro de `.crt-screen`, con el área completa.
- **HUD en React:** la puntuación, las vidas (`♥ ♥ ♥`, hasta `♥ ♥ ♥ ♥ ♥`, y `—` al terminar) y el nivel salen de `onStats`. En el canvas no se pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`; solo el pantano, la rana, las luciérnagas, la franja (reloj de luz, multiplicador, sentido y pepitas) y los avisos `▸ SALTA PARA EMPEZAR_` y `▸ NUEVO PANTANO_`.
- **Fin de partida:**
  - Sin vidas: tras la fase `dying`, el motor se detiene, emite las estadísticas finales (`lives: 0`) y llama una vez a `onGameOver(score)`. Se abre `FIN DEL JUEGO`.
  - `FIN` abandona sin guardar.
  - `JUGAR DE NUEVO` llama a `restart()`: pantano nuevo de nivel 1, rana en la orilla sur, columna 9, sentido norte, fase `waiting`, `score = 0`, `lives = 3`, `level = 1`, `mult = 1`, reloj 25, sin luciérnagas.
- **Registro** del motor en `GAME_ENGINES` (`games/registry.ts`) con la clave `ranaria`.
- **Catálogo:** se **modifica** la entrada existente `ranaria` de `GAMES` en `lib/games.ts` y se **mueve** justo después de `viborita` (los juegos reales quedan juntos al principio y RANARIA entra en la vista previa de la landing, que muestra `GAMES.slice(0, 6)`):

  | Campo   | Valor                                                                                                                                                                                                                                                                                                                                                     |
  | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `id`    | `"ranaria"` (sin cambios)                                                                                                                                                                                                                                                                                                                                 |
  | `title` | `"RANARIA"` (sin cambios)                                                                                                                                                                                                                                                                                                                                 |
  | `cat`   | `"ARCADE"` (sin cambios)                                                                                                                                                                                                                                                                                                                                  |
  | `color` | `"yellow"` (antes `"green"`)                                                                                                                                                                                                                                                                                                                              |
  | `cover` | `"cover-ranaria"` (antes `"cover-rana"`; la clase se crea en la spec 02)                                                                                                                                                                                                                                                                                  |
  | `best`  | `0` (antes `18900`)                                                                                                                                                                                                                                                                                                                                       |
  | `plays` | `"0"` (antes `"6.4K"`)                                                                                                                                                                                                                                                                                                                                    |
  | `short` | "Cruza el pantano de neón, ida y vuelta."                                                                                                                                                                                                                                                                                                                 |
  | `long`  | "Guía a la rana dorada por un pantano que cambia en cada nivel: esquiva los rayos de las pistas, cruza la ciénaga sobre nenúfares a la deriva y no pises un cable cuando descarga. Cada nivel son tres cruces de ida y vuelta contra el reloj. Atrapa luciérnagas para ganar tiempo y subir el multiplicador hasta ×5; perder una vida lo devuelve a ×1." |

**Fuera de alcance (para futuras specs):**

- La portada `.cover-ranaria` (y el borrado de `.cover-rana`), la fila en la tabla `games` de Supabase, el guardado de la puntuación, el TOP 10 y el Salón: van en `02-ranaria-integracion.md`. Hasta entonces la tarjeta de la landing usa una clase de portada que aún no existe (fondo vacío), la tarjeta no aparece en `/juegos` (se lee de Supabase) y guardar puede fallar.
- Sonido, partículas, sacudida y estela de salto: van en `03-ranaria-pulido.md`.
- Variantes descartadas: scroll vertical infinito, salto largo con carga, enemigos que persiguen, power-ups que paran el tiempo.
- Semilla del pantano compartida entre jugadores (pantano diario): requeriría guardar la semilla con la puntuación, fuera del contrato (requiere spec de plataforma).
- Controles táctiles y soporte móvil jugable.
- Cambios en el esquema de Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- Tests automatizados.

---

## Modelo de datos

```ts
// games/ranaria/swamp.ts — tipos y lógica pura, sin estado de módulo
export type LaneKind = "islote" | "pista" | "cienaga" | "cable";
export type Dir = "up" | "down" | "left" | "right";
export type Heading = "north" | "south"; // sentido del cruce
export type LaneObject = { x: number; len: number }; // x = borde izquierdo en px, len en celdas
export type Lane = {
  row: number; // 1–12
  kind: LaneKind;
  speed: number; // px/s con signo (+ = derecha); 0 en islote y cable
  objects: LaneObject[]; // rayos o nenúfares; [] en islote y cable
  reversible: boolean; // solo pista
  reverseTimer: number; // s hasta la próxima inversión
  cableTimer: number; // s dentro del ciclo de CABLE_PERIOD
};
export type CablePhase = "safe" | "warn" | "zap";
export type Firefly = {
  row: number;
  x: number; // px, centro
  life: number; // s restantes
  lane: number | null; // índice del carril si viaja en un nenúfar
  objectIndex: number | null; // nenúfar al que va pegada
  offset: number; // px desde el borde izquierdo del nenúfar
};
export type DeathCause =
  "rayo" | "hundida" | "arrastrada" | "descarga" | "apagada";
```

```ts
// games/ranaria/engine.ts — estado interno, nunca en el nivel del módulo
type Phase = "waiting" | "playing" | "dying" | "transition" | "gameover";
type State = {
  lanes: Lane[]; // 12 carriles, filas 1–12
  frog: {
    x: number; // px, centro
    row: number; // 0–13
    face: Dir; // último salto, para los ojos
    hop: {
      fromX: number;
      fromRow: number;
      toX: number;
      toRow: number;
      t: number;
    } | null; // t en s
    queued: Dir | null; // un salto en cola
  };
  heading: Heading;
  crossing: number; // 0–2, cruce actual del nivel
  bestProgress: number; // filas avanzadas en el cruce actual
  clock: number; // s de reloj de luz
  fireflies: Firefly[];
  fireflyTimer: number; // s hasta el próximo intento
  mult: number; // 1–5
  nextExtraLife: number; // próximo umbral de vida extra
  phaseTimer: number; // s restantes de dying o transition
  death: { cause: DeathCause; x: number; row: number } | null;
  score: number;
  lives: number;
  level: number;
  phase: Phase;
  paused: boolean;
};
```

Archivos:

- `games/ranaria/constants.ts`:
  - `W = 800`, `H = 600`, `MAX_DT = 0.05`, `PANEL_H = 40`, `CELL = 40`, `COLS = 20`, `ROWS = 14`, `START_COL = 9`;
  - `HOP_TIME = 0.1`, `FROG_HALF = 14`, `HAZARD_INSET = 4`, `LOOP = 960`;
  - `TRAMOS_LOW = [3, 2, 2, 2]`, `TRAMOS_HIGH = [[4, 3, 3], [4, 4, 2]]`, `HIGH_TRAMOS_FROM = 4`;
  - `PISTA_SPEED = [70, 130]`, `CIENAGA_SPEED = [40, 90]`, `SPEED_STEP = 0.1`, `SPEED_MAX = 2.0`;
  - `CABLE_PERIOD = 3.2`, `CABLE_SAFE = 2.0`, `CABLE_WARN = 0.6`, `CABLE_ZAP = 0.6`, `CABLE_FROM = 2`;
  - `REVERSE_EVERY = 6`, `REVERSE_WARN = 1`, `REVERSE_FROM = 3`, `REVERSE_CHANCE = 0.3`;
  - `CROSSINGS_PER_LEVEL = 3`, `TIME_PER_CROSSING = 25`, `TRANSITION_TIME = 1.2`, `DYING_TIME = 0.8`;
  - `FIREFLY_EVERY = 4`, `FIREFLY_MAX = 2`, `FIREFLY_LIFE = 7`, `FIREFLY_BLINK = 2`, `FIREFLY_REACH = 28`, `FIREFLY_TIME = 3`, `MULT_MAX = 5`;
  - `ROW_POINTS = 10`, `FIREFLY_POINTS = 50`, `CROSS_POINTS = 100`, `TIME_POINTS = 10`, `SWAMP_POINTS = 500`, `MAX_SCORE = 10_000_000`;
  - `START_LIVES = 3`, `MAX_LIVES = 5`, `EXTRA_LIFE_EVERY = 10_000`;
  - `COLORS`: `bg "#000"`, `panel "#05050f"`, `land "#06140c"`, `grass "rgba(0, 255, 136, 0.25)"`, `goal "#f5ff00"`, `pista "#0a0a18"`, `ray "#ff006e"`, `rayTip "#e6e9ff"`, `cienaga "#001a22"`, `wave "rgba(0, 245, 255, 0.15)"`, `pad "#00ff88"`, `cableBg "#05050f"`, `cable "#00f5ff"`, `zap "#e6e9ff"`, `frog "#f5ff00"`, `eye "#000"`, `firefly "#e6e9ff"`, `fireflyGlow "#b6ff3b"`, `cyan "#00f5ff"`, `magenta "#ff006e"`, `yellow "#f5ff00"`.
- `games/ranaria/swamp.ts`: funciones puras sin acceso a `window` ni al canvas:
  - `speedMult(level): number`;
  - `generateLayout(level, random): Lane[]`, con las reglas de tramos, familias, cables, reversibles y objetos;
  - `updateLanes(lanes, dt): void`, que mueve los objetos con el envoltorio de `LOOP`, avanza `reverseTimer` (e invierte `speed`) y `cableTimer`;
  - `cablePhase(lane): CablePhase` y `reverseWarning(lane): boolean`;
  - `rayHit(lane, x): boolean`, `padUnder(lane, x): number | null` (índice del nenúfar o `null`);
  - `rowY(row): number`, `colX(col): number`, `snapX(x): number`;
  - `crossingBonus(level, clock, mult): number` y `addScore(score, points): number` (con el tope de `MAX_SCORE`).
- `games/ranaria/engine.ts`: `createRanariaGame`, con el bucle, el input, el dibujado y el ciclo de vida.

Convenciones:

- Coordenadas en el espacio lógico 800×600, con origen arriba a la izquierda. Velocidades en px/s. `dt` en segundos, limitado a `MAX_DT`.
- `generateLayout` recibe `random: () => number` (en el motor, `Math.random`), para poder comprobarla a mano con una función fija.
- `games/` solo se importa desde Client Components. Ningún módulo toca `window` ni `document` al importarse.
- Las teclas se leen de `KeyboardEvent.code`.

---

## Plan de implementación

1. **Constantes y lógica.** Crear `games/ranaria/constants.ts` y `games/ranaria/swamp.ts` con los valores y funciones del modelo de datos. Todavía no se usan. `npm run build` pasa.
2. **Motor y registro.** Crear `games/ranaria/engine.ts` con `createRanariaGame`:
   - **Estado inicial:** `generateLayout(1, Math.random)`, rana en `(380, 13)` mirando arriba, sentido norte, fase `waiting`, reloj 25, `mult = 1`. Emite `onStats({ score: 0, lives: 3, level: 1 })`.
   - **Bucle:**
     - En todas las fases salvo `gameover` se llama a `updateLanes`; los nenúfares arrastran a la rana si está en tierra sobre una `cienaga`.
     - `waiting`: nada más.
     - `playing`: avanza el salto en curso y, al aterrizar, aplica el ajuste de columna, los puntos de avance, la llegada a la orilla de destino y el salto en cola; descuenta el reloj; genera, mueve, envejece y atrapa luciérnagas; comprueba las muertes.
     - `dying`: descuenta `phaseTimer`; al llegar a 0, reaparece o termina la partida.
     - `transition`: descuenta `phaseTimer`; al llegar a 0, pasa a `playing`.
   - **Input:** `keydown` en `window`, con `e.repeat` ignorado en todas las teclas.
   - **Dibujo:** fondo, filas (orillas, islotes, pistas, ciénagas, cables), objetos, luciérnagas, rana o anillo de muerte, franja de indicadores y avisos. Sin HUD ni overlays de React.
   - **Estadísticas y fin:** `onStats` solo cuando cambia algún valor; `onGameOver(score)` una sola vez.
   - **Ciclo de vida:** `pause()` congela todo y vacía el salto en cola; `resume()` reinicia `lastTime`; `restart()` vuelve al estado inicial, emite las estadísticas y reanuda; `destroy()` cancela el rAF y quita los listeners.
   - **Registro:** añadir `ranaria: createRanariaGame` a `GAME_ENGINES`.
3. **Entrada de catálogo.** Modificar la entrada `ranaria` de `GAMES` con los valores de la tabla y moverla después de `viborita`. Comprobación manual: `/juegos/ranaria/jugar` monta el motor real en lugar de la partida simulada.
4. **Verificación.** Jugar varias partidas completas hasta al menos el nivel 4, comprobando cada criterio; comprobar que ASTEROIDES, TETRA, REBOTE y VIBORITA no tienen regresiones; `npm run lint` y `npm run build`.

Reglas transversales:

- Esta spec no toca Supabase.
- No se usa la `service_role` / secret key.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos/ranaria/jugar` muestra el canvas dentro del CRT con la franja de indicadores, el pantano de nivel 1 en movimiento, la rana amarilla en la orilla sur y `▸ SALTA PARA EMPEZAR_`. El HUD muestra `Puntuación 0`, `Vidas ♥ ♥ ♥` y `Nivel 01`. El reloj de luz no baja hasta el primer salto.
- [ ] Cada flecha o WASD hace un salto de una celda en esa dirección; mantener la tecla no repite el salto.
- [ ] Un salto pulsado durante otro se ejecuta al aterrizar; un tercero se descarta.
- [ ] Saltar hacia abajo en la orilla sur (o hacia arriba en la norte) no hace nada; saltar a la izquierda en la columna 0 no saca a la rana del canvas.
- [ ] Pulsar las teclas del juego no desplaza la página.
- [ ] El pantano de los niveles 1–3 tiene 4 tramos de 3, 2, 2 y 2 carriles (en cualquier orden) separados por 3 islotes; desde el nivel 4, 3 tramos (`4-3-3` o `4-4-2`) y 2 islotes. Siempre hay al menos un tramo de pista y uno de ciénaga.
- [ ] En el nivel 1 no hay cables ni pistas reversibles; en el nivel 2 puede haber como máximo 1 cable; desde el nivel 3 puede haber pistas reversibles que invierten su sentido cada 6 s tras 1 s de flechas amarillas parpadeando.
- [ ] Un cable descarga 0.6 s cada 3.2 s, avisando 0.6 s antes; estar en su fila durante la descarga quita una vida, y cruzarlo durante la fase inactiva no.
- [ ] Tocar un rayo, caer en la ciénaga fuera de un nenúfar, salir del canvas sobre un nenúfar o agotar el reloj quita una vida, muestra el anillo de muerte durante 0.8 s y devuelve la rana a la orilla de salida del cruce actual con el reloj a 25.
- [ ] Sobre un nenúfar, la rana se desplaza con él y puede saltar a izquierda y derecha dentro de él.
- [ ] Cada fila nueva hacia el destino suma 10; retroceder y volver a avanzar no suma; perder una vida no reinicia la marca del cruce.
- [ ] Llegar a la orilla norte en el primer cruce suma `(100 × nivel + 10 × segundos enteros de reloj) × mult`, rellena la primera pepita, cambia la flecha a `▼` y marca la orilla sur como destino.
- [ ] Al completar el tercer cruce se suma además `500 × nivel`, el HUD pasa a `Nivel 02`, aparece `▸ NUEVO PANTANO_` durante 1.2 s con un pantano distinto y la rana vuelve a la orilla sur.
- [ ] Atrapar una luciérnaga con ×1 suma 50, pone el multiplicador en ×2 y añade 3 s al reloj (sin pasar de 25); la siguiente suma 100 y pone ×3; el multiplicador no pasa de ×5. Perder una vida lo devuelve a ×1.
- [ ] Nunca hay más de 2 luciérnagas; desaparecen a los 7 s, parpadeando los últimos 2 s; las que van en un nenúfar viajan con él.
- [ ] La velocidad de los carriles en el nivel 5 es 1.4 veces la del nivel 1 para la misma base, y desde el nivel 11 no sube más (×2.0).
- [ ] Al llegar a 10 000 puntos se gana una vida (`♥ ♥ ♥ ♥` si había 3); nunca se pasa de 5 vidas.
- [ ] El canvas no pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`.
- [ ] `P`, `Esc` y el botón `PAUSA` congelan el juego (carriles, reloj, luciérnagas y salto) y muestran `EN PAUSA`; cualquiera de los tres lo reanuda sin saltos. Cambiar de pestaña lo pausa.
- [ ] Perder la última vida abre `FIN DEL JUEGO` tras el anillo de muerte, con la puntuación real, y el HUD pasa a `Vidas —`.
- [ ] `FIN` abre el modal sin campo de nombre, con `▸ PARTIDA ABANDONADA — NO SE GUARDA_`.
- [ ] `JUGAR DE NUEVO` vuelve a un pantano de nivel 1 en espera, con `Puntuación 0`, `Vidas ♥ ♥ ♥`, `Nivel 01`, ×1 y el reloj lleno.
- [ ] Al pulsar `SALIR` y volver a entrar, solo corre un bucle (los rayos del nivel 1 no van más rápido que antes) y no quedan listeners del juego en otras páginas.
- [ ] Escribir el nombre en el modal no mueve la rana ni pausa el juego.
- [ ] ASTEROIDES, TETRA, REBOTE y VIBORITA se juegan igual que antes.
- [ ] Ningún archivo de `games/ranaria/` declara estado mutable en el nivel del módulo.
- [ ] La consola no muestra errores durante una partida completa (cargando la URL directamente).

---

## Decisiones

- **Sí:** juego original creado desde cero en `games/ranaria/`, con el contrato `GameFactory`. Decisión del agente: interpretar «cruce por carriles con timing» como un pantano de neón generado por nivel, cruzado en ida y vuelta.
- **No:** recrear un juego comercial del género. Decisión del agente: nada de rejilla fija 13×13, carretera de 5 carriles + río, troncos, tortugas que se sumergen ni cinco casillas de llegada. La meta es «la otra orilla, en cualquier columna».
- **No:** scroll vertical infinito con terreno procedural. Decisión del agente: es la fórmula de otro comercial muy conocido del género y, además, haría que la puntuación dependiera de la distancia y no del dominio del timing.
- **Sí:** cruces de ida y vuelta (3 por nivel). Decisión del agente: el mismo pantano se lee en los dos sentidos, no hay teletransporte a la salida tras cada llegada y el ritmo es continuo.
- **Sí:** pantano generado por tramos de una sola familia separados por islotes. Decisión del agente: da variedad entre niveles y partidas, pero cada tramo es legible y siempre hay un descanso seguro cada 2–4 carriles. Los conjuntos `[3,2,2,2]` y `[4,3,3]`/`[4,4,2]` cuadran exactamente con los 12 carriles.
- **Sí:** cables de alta tensión. Decisión del agente: un peligro de timing puro (esperar el ciclo) distinto de «esquivar objetos» y de «subirse a plataformas».
- **Sí:** pistas reversibles con aviso. Decisión del agente: obligan a releer un carril que ya se había entendido, sin ser injustas gracias al aviso de 1 s.
- **Sí:** luciérnagas con multiplicador ×1–×5 y +3 s. Decisión del agente: es la mecánica distintiva; premia desviarse hacia el riesgo y separa a los jugadores en el leaderboard. El multiplicador solo afecta a luciérnagas y cruces, no al avance por filas, para que morir cueste puntos sin anular el progreso.
- **Sí:** reloj de luz de 25 s por cruce. Decisión del agente: evita quedarse quieto en un islote y alimenta el bonus de tiempo.
- **Sí:** 3 vidas y vida extra cada 10 000 puntos hasta 5. Decisión del agente: el juego tiene muertes rápidas y frecuentes; con una sola vida (como VIBORITA) las partidas serían demasiado cortas.
- **Sí:** salto discreto con un salto en cola y `e.repeat` ignorado. Decisión del agente: el control del género es «una pulsación, una celda»; la cola de uno evita perder pulsaciones rápidas sin permitir ráfagas.
- **Sí:** reutilizar la entrada `ranaria` existente de `GAMES` y moverla tras `viborita`. Decisión del agente: el id y el título ya existen; moverla agrupa los juegos reales y la muestra en la landing. Los valores falsos `best: 18900` y `plays: "6.4K"` pasan a `0` y `"0"`.
- **Sí:** color `yellow` (antes `green`). Decisión del agente: TETRA y VIBORITA ya usan `green` y ningún motor real usa `yellow`; además la rana es dorada y contrasta con los nenúfares verdes.
- **Sí:** portada nueva `cover-ranaria` en lugar de `cover-rana`. Decisión del agente: sigue la convención `cover-<id>` de los juegos reales; se diseña en la spec 02.
- **Sí:** dividir el juego en fases (`01` motor, `02` integración, `03` pulido). El motor se puede revisar y jugar antes de tocar Supabase.

---

## Riesgos

| Riesgo                                                                                                 | Mitigación                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El Strict Mode monta el efecto dos veces en dev y crea dos bucles.                                     | `destroy()` cancela el rAF y quita los listeners. Un criterio comprueba que solo corre uno.                                                                                              |
| Las teclas del juego interfieren con el input de nombre del modal.                                     | El motor ignora el teclado si está pausado, en game over o con el foco en un campo de texto.                                                                                             |
| Un salto de `dt` al reanudar mueve los carriles de golpe y mata a la rana.                             | `resume()` reinicia `lastTime` y `dt` está limitado a `MAX_DT`.                                                                                                                          |
| Sin código de referencia, una regla queda ambigua al implementar.                                      | Las constantes de esta spec son la única fuente. Si algo no está aquí, se pregunta.                                                                                                      |
| Un pantano generado resulta imposible (ciénaga sin nenúfares alcanzables, cable junto a pista rápida). | Huecos de nenúfares ≤ 4 celdas con largo ≥ 2, carriles adyacentes en sentidos opuestos, islote cada 2–4 carriles y cables con 2 s inactivos. Se juega hasta el nivel 6 para comprobarlo. |
| La rana muere al aterrizar justo en el borde de un nenúfar por redondeo.                               | Se usa el centro `x` frente a `[x, x + len × 40]` del nenúfar, sin margen; los criterios lo comprueban jugando.                                                                          |
| El cambio de color o de portada deja la tarjeta de la landing sin portada hasta la spec 02.            | Aceptado: la spec 02 se implementa a continuación. Se indica en "Fuera de alcance".                                                                                                      |
| Pulsaciones rápidas perdidas o encadenadas sin control.                                                | Un salto en cola como máximo; `e.repeat` ignorado.                                                                                                                                       |

---

## Preguntas abiertas

- ¿Se mantiene el color `yellow` o se prefiere conservar `green`? Por defecto, `yellow`.
- ¿Se mueve la entrada `ranaria` en `GAMES` justo tras `viborita` (entra en la vista previa de la landing y saca a `caida`) o se deja en su posición actual? Por defecto, se mueve.
- ¿3 cruces por nivel y 25 s de reloj son el ritmo deseado, o se prefiere un nivel más corto (2 cruces)? Por defecto, 3 cruces y 25 s.

---

## Lo que **no** está en esta spec

- Portada, fila en Supabase, guardado, TOP 10 y Salón (spec 02).
- Sonido, partículas, sacudida y estela (spec 03).
- Scroll infinito, salto largo, enemigos perseguidores y power-ups de tiempo.
- Pantano diario con semilla compartida (requiere spec de plataforma).
- Controles táctiles.
- Cambios en el esquema de Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
