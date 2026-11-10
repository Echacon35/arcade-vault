# SPEC 09 — Juego real de la viborita

> **Estado:** Aprobado
> **Depende de:** SPEC 05, SPEC 06, SPEC 06.5
> **Fecha:** 2026-11-10
> **Objetivo:** Crear desde cero un juego de la viborita (snake) con arte vectorial neón original y hacerlo jugable en `/juegos/viborita/jugar` como VIBORITA, con su fila en la tabla `games` de Supabase, su TOP 10 y su pestaña en el Salón de la Fama.

---

## Por qué existe esta spec

ASTEROIDES, TETRA y REBOTE son hoy los tres juegos reales, y los tres se portaron desde `references/started-games/`. VIBORITA es el primer juego sin código de referencia: la mecánica se definió en las preguntas de esta spec y la integración sigue la receta de SPEC 05, 06 y 06.5 (`.claude/skills/add-game/recipe.md`).

Particularidades:

- **Sin original.** No hay `game.js` que portar. Todas las constantes de esta spec son decisiones del usuario y son la única fuente de verdad del motor.
- **Arte original.** `games/snake/` contiene `fruits.png` y `sprites.js` recortados de Google Snake (spriters-resource). No se usan: la serpiente y la fruta se dibujan con primitivas de canvas en la paleta neón del Vault, y la carpeta se borra.
- **Encaje con el contrato de motor:**
  - El tablero de 32×24 celdas de 25 px ocupa exactamente el canvas de 800×600.
  - Solo teclado; no hay ratón.
  - Una vida, como número: no hace falta E1.
  - Sin imágenes ni sonido: no hacen falta E2 ni E3.
  - `isTypingTarget` ya está en `games/shared/input.ts`.

---

## Alcance

**Dentro:**

- **Borrar `games/snake/`** (`fruits.png` y `sprites.js`, sin commitear).
- **Motor TypeScript** en `games/viborita/`:
  - **Tablero:** `COLS = 32` × `ROWS = 24` celdas de `CELL = 25` px, que llenan el canvas de 800×600. Celda `(col, row)` con origen arriba a la izquierda.
  - **Serpiente inicial:** longitud `START_LENGTH = 3`, con la cabeza en `(16, 12)` y el cuerpo en `(15, 12)` y `(14, 12)`, mirando a la derecha.
  - **Espera inicial:** la serpiente está quieta hasta la primera tecla de dirección válida (arriba, abajo o derecha; la izquierda se ignora porque es el giro de 180°). Mientras espera, el canvas muestra `▸ PULSA UNA FLECHA_`. La fruta ya está visible.
  - **Movimiento por pasos:** la serpiente avanza una celda por paso. Velocidad `steps/s = min(BASE_SPEED + (level − 1) × SPEED_PER_LEVEL, MAX_SPEED)`, con `BASE_SPEED = 8`, `SPEED_PER_LEVEL = 1` y `MAX_SPEED = 20` (se alcanza en el nivel 13). El motor acumula `dt` y ejecuta un paso cada `1 / steps/s` segundos.
  - **Giros:** cola de hasta `TURN_QUEUE_MAX = 2` direcciones pendientes. Una dirección entra en la cola solo si no es igual ni opuesta a la última de la cola (o a la dirección actual, si la cola está vacía). Cada paso consume como máximo una. Si la cola está llena, la pulsación se ignora.
  - **Fruta:** una sola a la vez, en una celda libre elegida al azar (`Math.random`) entre las que no ocupa la serpiente. Al comerla:
    - la serpiente crece un segmento (ese paso no se quita la cola);
    - se suman `FRUIT_POINTS × level` puntos (`FRUIT_POINTS = 10`), con el nivel de antes de contar la fruta;
    - aparece otra fruta.
  - **Nivel:** `level = 1 + floor(fruits / FRUITS_PER_LEVEL)`, con `FRUITS_PER_LEVEL = 5`. Ejemplo: las frutas 1–5 valen 10 cada una; con la 5.ª se pasa a nivel 2 (50 puntos), y la 6.ª vale 20.
  - **Muerte:** si la siguiente cabeza sale del tablero (`col` fuera de 0…31 o `row` fuera de 0…23) o cae en una celda del cuerpo, la partida termina. Entrar en la celda de la cola que se libera en ese mismo paso está permitido, salvo que en ese paso se coma fruta.
  - **Tablero lleno:** si tras comer no queda ninguna celda libre (768 segmentos), la partida termina con la puntuación acumulada.
  - **Vidas:** `START_LIVES = 1`. Al morir se emite `lives: 0`.
  - **Bucle:** `requestAnimationFrame` con `dt` en segundos, tope `MAX_DT = 0.05` y primer frame con `dt = 0`. `resume()` reinicia `lastTime`.
  - **Sin estado global:** `createViboritaGame(canvas, callbacks)` devuelve `pause`, `resume`, `restart` y `destroy`.
- **Controles:**
  - `ArrowUp`/`KeyW`, `ArrowDown`/`KeyS`, `ArrowLeft`/`KeyA` y `ArrowRight`/`KeyD` (`KeyboardEvent.code`) giran la serpiente según la regla de la cola.
  - `KeyP` y `Escape` llaman a `onPauseToggle()`, sin repetición.
  - Las flechas, WASD, `P` y `Esc` hacen `preventDefault()` mientras el juego está montado.
  - El teclado se ignora si el juego está pausado, si la partida terminó o si el foco está en un campo de texto (`isTypingTarget` de `games/shared/input.ts`).
  - Al pausar se vacía la cola de giros.
- **Visual** con la paleta neón del Vault (`COLORS`):
  - fondo `#000`;
  - rejilla tenue: líneas cian `#00f5ff` con opacidad 0.08 cada 25 px;
  - cuerpo: cuadrados verdes `#00ff88` de 21×21 (2 px de margen por lado), con glow (`shadowBlur`);
  - cabeza: el mismo verde más brillante, con dos ojos negros orientados en la dirección de avance;
  - fruta: manzana neón magenta `#ff006e` (círculo con glow) con un tallo y una hoja verdes, dibujada con arcos;
  - aviso `▸ PULSA UNA FLECHA_` en cian `#00f5ff`, `monospace`, centrado en horizontal y por debajo de la serpiente.
- **Canvas** de 800×600 dentro de `.crt-screen`, con el tablero completo y sin paneles auxiliares.
- **HUD en React:** la puntuación, las vidas (`♥`, y `—` al morir) y el nivel salen de `onStats`. En el canvas no se pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`; solo la rejilla, la serpiente, la fruta y, antes de empezar, `▸ PULSA UNA FLECHA_`.
- **Fin de partida:**
  - Al chocar, o con el tablero lleno, el motor se detiene, emite las estadísticas finales y llama una vez a `onGameOver(score)`. El canvas queda congelado con el último frame. Se abre `FIN DEL JUEGO`, con guardado vía `saveScoreAction`.
  - `FIN` abandona sin guardar.
  - `JUGAR DE NUEVO` llama a `restart()`: serpiente inicial, fruta nueva, 0 puntos, nivel 1, 1 vida y espera de la primera tecla.
- **Registro** del motor en `GAME_ENGINES` (`games/registry.ts`) con la clave `viborita`.
- **Catálogo:** entrada nueva en `GAMES` de `lib/games.ts`, justo después de `rebote`:

  | Campo   | Valor                                                                                                                                                                                                                                  |
  | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `id`    | `"viborita"`                                                                                                                                                                                                                           |
  | `title` | `"VIBORITA"`                                                                                                                                                                                                                           |
  | `cat`   | `"ARCADE"`                                                                                                                                                                                                                             |
  | `color` | `"green"`                                                                                                                                                                                                                              |
  | `cover` | `"cover-viborita"`                                                                                                                                                                                                                     |
  | `best`  | `0`                                                                                                                                                                                                                                    |
  | `plays` | `"0"`                                                                                                                                                                                                                                  |
  | `short` | "Come fruta, crece y no te muerdas la cola."                                                                                                                                                                                           |
  | `long`  | "Guía a la víbora por la rejilla con las flechas o WASD. Cada fruta la alarga un segmento y vale 10 puntos por nivel. Cada 5 frutas subes de nivel y avanza más rápido. Chocar con un muro o con tu propio cuerpo termina la partida." |

- **Portada** `.cover-viborita` en `app/globals.css`, en CSS puro: una serpiente verde neón de bloques con un giro en L y glow, una manzana magenta delante de la cabeza y una rejilla tenue cian. Se diseña con `/frontend-design` y es distinta de `.cover-snake`.
- **Supabase:** migración de datos `add_game_viborita` aplicada con `apply_migration`, con `insert` en `games` (`sort_order = 4`) y copia idéntica en `supabase/migrations/`.

**Fuera de alcance (para futuras specs):**

- Los sprites de Google Snake (`games/snake/`): se borran y no se usan.
- Cambiar o quitar la entrada simulada `serpentina` (SERPENTINA), que sigue en `GAMES` con su partida simulada y su `.cover-snake`.
- Bordes que atraviesan, obstáculos, varias frutas, frutas con valores distintos y power-ups.
- Más de una vida y la extensión E1.
- Sonido (E3) y control de volumen. El volumen requiere spec de plataforma.
- Spritesheet o imágenes (E2).
- Indicadores extra en el canvas (contador de frutas, longitud).
- Controles táctiles, swipe y soporte móvil jugable. Requiere spec de plataforma.
- Cambios en el esquema de Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- El arreglo del `fetch-cache` (`createPublicClient` con `cache: "no-store"`).
- El 404 tras guardar de SPEC 06.
- Tests automatizados.

---

## Modelo de datos

```ts
// games/viborita/snake.ts — tipos y lógica pura, sin estado de módulo
export type Dir = "up" | "down" | "left" | "right";
export type Cell = { col: number; row: number };
export type StepResult = "moved" | "ate" | "dead" | "full";
```

```ts
// games/viborita/engine.ts — estado interno, nunca en el nivel del módulo
type Phase = "waiting" | "playing" | "gameover";
type State = {
  snake: Cell[]; // [0] = cabeza
  dir: Dir;
  turns: Dir[]; // cola de giros, máx. TURN_QUEUE_MAX
  fruit: Cell;
  fruits: number; // frutas comidas en la partida
  acc: number; // segundos acumulados hacia el siguiente paso
  score: number;
  lives: number; // 1 → 0 al morir
  level: number; // 1 + floor(fruits / 5)
  phase: Phase;
  paused: boolean;
};
```

```sql
-- supabase/migrations/<version>_add_game_viborita.sql
insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values (
  'viborita',
  'VIBORITA',
  'Come fruta, crece y no te muerdas la cola.',
  'Guía a la víbora por la rejilla con las flechas o WASD. Cada fruta la alarga un segmento y vale 10 puntos por nivel. Cada 5 frutas subes de nivel y avanza más rápido. Chocar con un muro o con tu propio cuerpo termina la partida.',
  'ARCADE',
  'cover-viborita',
  'green',
  4
);
```

Archivos:

- `games/viborita/constants.ts`:
  - `W = 800`, `H = 600` y `MAX_DT = 0.05`;
  - `COLS = 32`, `ROWS = 24` y `CELL = 25`;
  - `START_LENGTH = 3`, `START_HEAD = { col: 16, row: 12 }` y `START_DIR = "right"`;
  - `BASE_SPEED = 8`, `SPEED_PER_LEVEL = 1` y `MAX_SPEED = 20` (pasos/s);
  - `TURN_QUEUE_MAX = 2`;
  - `FRUIT_POINTS = 10`, `FRUITS_PER_LEVEL = 5` y `START_LIVES = 1`;
  - `COLORS`: fondo `#000`, rejilla `rgba(0, 245, 255, 0.08)`, serpiente `#00ff88`, cabeza (verde más claro), fruta `#ff006e`, aviso `#00f5ff`.
- `games/viborita/snake.ts`: funciones puras sin acceso a `window` ni al canvas:
  - `initialSnake()`;
  - `isOpposite(a, b)`;
  - `enqueueTurn(turns, dir, current)`, con la regla de la cola;
  - `step(snake, dir, fruit)`, que devuelve la serpiente nueva y un `StepResult`;
  - `spawnFruit(snake, random)`, que devuelve una celda libre o `null` si el tablero está lleno;
  - `levelFor(fruits)` y `speedFor(level)`.
- `games/viborita/engine.ts`: `createViboritaGame`, con el bucle, el input, el dibujado y el ciclo de vida.

Convenciones:

- Lógica en celdas; dibujo en el espacio lógico 800×600 (`x = col × CELL`, `y = row × CELL`), con origen arriba a la izquierda. `dt` en segundos, limitado a `MAX_DT = 0.05`. Con `MAX_SPEED = 20` hay como máximo un paso por frame.
- `games/` solo se importa desde Client Components. Ningún módulo toca `window` ni `document` al importarse.
- Las teclas se leen de `KeyboardEvent.code`.

---

## Plan de implementación

1. **Borrar `games/snake/`.** Eliminar `fruits.png` y `sprites.js` (no están en git). `npm run build` pasa.
2. **Constantes y lógica.** Crear `games/viborita/constants.ts` y `games/viborita/snake.ts` con los valores y funciones del modelo de datos. Todavía no se usan. `npm run build` pasa.
3. **Motor y registro.** Crear `games/viborita/engine.ts` con `createViboritaGame`:
   - **Estado inicial:** fase `waiting`, serpiente inicial y fruta con `spawnFruit`. Emite `onStats({ score: 0, lives: 1, level: 1 })`.
   - **Bucle:** `requestAnimationFrame` con `dt` limitado a `MAX_DT`. En `playing` acumula `dt` y, al llegar a `1 / speedFor(level)`, consume un giro de la cola y llama a `step`. En `waiting` y `gameover` solo dibuja.
   - **Input:** `keydown` en `window`. La primera dirección válida pasa de `waiting` a `playing`. `P`/`Esc` llaman a `onPauseToggle()` sin repetición.
   - **Dibujo:** rejilla, fruta, cuerpo, cabeza con ojos y, en `waiting`, `▸ PULSA UNA FLECHA_`. Sin HUD ni overlays.
   - **Estadísticas y fin:** `onStats` solo cuando cambia algún valor. Con `dead` o `full`, fase `gameover`, `lives: 0` si es `dead`, y `onGameOver(score)` una sola vez.
   - **Ciclo de vida:**
     - `pause()` congela la lógica y vacía la cola de giros;
     - `resume()` reinicia `lastTime` y `acc`;
     - `restart()` vuelve al estado inicial (fase `waiting`), emite las estadísticas y reanuda;
     - `destroy()` cancela el rAF y quita el listener.
   - **Registro:** añadir `viborita: createViboritaGame` a `GAME_ENGINES`.
4. **Catálogo y portada.** Añadir la entrada `viborita` en `GAMES`, después de `rebote`. Diseñar `.cover-viborita` en `app/globals.css`, junto a `.cover-rebote`, con `/frontend-design`. Comprobación manual: `/juegos/viborita/jugar` monta el motor real.
5. **Fila en Supabase.**
   - Comprobar con `list_tables` y `select id, sort_order from public.games` que solo están `asteroides` (1), `tetra` (2) y `rebote` (3).
   - Aplicar `add_game_viborita` con `apply_migration` y guardar el mismo SQL en `supabase/migrations/<version>_add_game_viborita.sql`, con la versión de `list_migrations`.
   - Verificar con `select * from games where id = 'viborita'` y con `get_advisors` (seguridad), sin avisos nuevos.
   - Antes de recompilar, borrar el contenido de `.next/cache/fetch-cache/` (y `.next/server/route-cache` si existe). Después del build, comprobar que `.next/server/app/juegos.html` contiene `VIBORITA`.
6. **Verificación y limpieza.**
   - Jugar una partida completa en `/juegos/viborita/jugar` y guardar.
   - Comprobar el TOP 10 de `/juegos/viborita` y la pestaña VIBORITA de `/salon`, cargando las URLs directamente.
   - Comprobar que ASTEROIDES, TETRA y REBOTE no tienen regresiones.
   - Borrar las puntuaciones de prueba con `execute_sql`, sin tocar las del usuario.
   - `npm run lint` y `npm run build`.

Reglas transversales:

- Los cambios en Supabase solo con `apply_migration`. `execute_sql` solo para lecturas y para borrar las puntuaciones de prueba.
- No se usa la `service_role` / secret key.
- No se regenera `lib/supabase/database.types.ts`, porque no hay cambio de esquema.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `games/snake/` ya no existe y ningún archivo del repo referencia `fruits.png` ni `SPRITE_ATLAS`.
- [ ] `/juegos` muestra cuatro tarjetas reales en este orden: ASTEROIDES, TETRA, REBOTE y VIBORITA. VIBORITA lleva la portada `.cover-viborita` y acento verde.
- [ ] Sin puntuaciones, `/juegos/viborita` muestra `Mejor puntuación 0`, `Partidas 0` y `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- [ ] `/juegos/viborita/jugar` muestra la rejilla, una serpiente quieta de 3 segmentos en el centro mirando a la derecha, una manzana magenta y `▸ PULSA UNA FLECHA_`. El HUD muestra `Puntuación 0`, `Vidas ♥` y `Nivel 01`.
- [ ] Pulsar `←` o `A` en la espera no arranca la partida; `↑`, `↓`, `→` o `W`/`S`/`D` la arrancan en esa dirección y el aviso desaparece.
- [ ] Las flechas y WASD giran la serpiente. Un giro de 180° se ignora.
- [ ] Pulsar `↑` y `←` muy rápido yendo a la derecha hace los dos giros en pasos consecutivos y la serpiente no se muerde.
- [ ] Pulsar las flechas, WASD, `P` o `Esc` no desplaza la página.
- [ ] En el nivel 1 la serpiente avanza 8 celdas por segundo.
- [ ] Comer una fruta alarga la serpiente un segmento, la fruta reaparece en una celda libre y la puntuación sube exactamente 10 en el nivel 1.
- [ ] Tras la 5.ª fruta el HUD muestra `Puntuación 50` y `Nivel 02`, la serpiente avanza 9 celdas por segundo y la 6.ª fruta suma exactamente 20.
- [ ] La velocidad no pasa de 20 celdas por segundo (nivel 13 en adelante).
- [ ] Salir del tablero por cualquier borde termina la partida.
- [ ] Chocar con el propio cuerpo termina la partida. Entrar en la celda que deja la cola en ese mismo paso no la termina.
- [ ] El canvas no pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`.
- [ ] `P`, `Esc` y el botón `PAUSA` congelan el juego y muestran `EN PAUSA`; cualquiera de los tres lo reanuda sin que la serpiente salte celdas. Un giro pulsado antes de pausar no se aplica al reanudar. Cambiar de pestaña lo pausa.
- [ ] Al chocar, el HUD pasa a `Vidas —`, el canvas queda congelado y se abre `FIN DEL JUEGO` con la puntuación real.
- [ ] Tras guardar, el modal muestra `PUNTUACIÓN GUARDADA`. Al cargar `/juegos/viborita` y `/salon`, la fila aparece en el TOP 10 y en la pestaña `VIBORITA`.
- [ ] `/salon` muestra las pestañas `ASTEROIDES`, `TETRA`, `REBOTE` y `VIBORITA`, y cambiar de una a otra no produce errores en consola.
- [ ] `FIN` abre el modal sin campo de nombre, con `▸ PARTIDA ABANDONADA — NO SE GUARDA_`.
- [ ] `JUGAR DE NUEVO` vuelve a la serpiente inicial en espera, con `Puntuación 0`, `Vidas ♥` y `Nivel 01`.
- [ ] Al pulsar `SALIR` y volver a entrar, solo corre un bucle (la serpiente sigue a 8 celdas por segundo en el nivel 1) y no quedan listeners del juego en otras páginas.
- [ ] Escribir el nombre en el modal no mueve la serpiente ni pausa el juego.
- [ ] `select * from games where id = 'viborita'` devuelve la fila con los textos de `GAMES` y `sort_order = 4`. `supabase/migrations/` coincide con `list_migrations`.
- [ ] ASTEROIDES, TETRA y REBOTE se juegan y guardan igual que antes.
- [ ] `/juegos/serpentina/jugar` sigue con la partida simulada.
- [ ] Ningún archivo de `games/viborita/` declara estado mutable en el nivel del módulo.
- [ ] La consola no muestra errores durante una partida completa (cargando las URLs directamente).
- [ ] Las puntuaciones de prueba se borran de `scores` al terminar.

---

## Decisiones

- **Sí:** `/spec` en lugar de `/add-game`, porque no hay código de referencia en `references/started-games/`. La mecánica se define en esta spec y la integración sigue la receta de `/add-game`.
- **Sí:** arte vectorial neón dibujado en canvas, sin assets.
- **No:** los sprites de Google Snake de `games/snake/`. Son arte de un juego comercial concreto. Se borra la carpeta.
- **No:** un spritesheet propio con E2. El vector neón encaja con la estética del Vault y evita la pantalla de carga.
- **Sí:** entrada nueva `viborita` aparte. Decisión del usuario, como con TETRA/CAÍDA y REBOTE/BLOQUE BUSTER.
- **No:** convertir `serpentina` en el juego real. Su texto promete "núcleos magenta" y una mecánica que no es esta.
- **Sí:** VIBORITA, ARCADE, verde y `sort_order = 4`. Verde como TETRA, pero en otra categoría.
- **Sí:** tablero de 32×24 celdas de 25 px, que llena el 800×600 sin márgenes.
- **Sí:** los muros matan.
- **No:** bordes que atraviesan.
- **Sí:** nivel cada 5 frutas, 8 pasos/s de base, +1 por nivel y tope de 20. El nivel tiene sentido en el HUD y la dificultad crece por escalones visibles.
- **No:** acelerar con cada fruta ni velocidad fija.
- **Sí:** 10 × nivel por fruta, con el nivel de antes de contar la fruta. Premia sobrevivir a velocidad alta.
- **No:** puntos fijos ni frutas con valores distintos.
- **Sí:** 1 vida (`♥` → `—`), sin E1.
- **No:** 3 vidas con reaparición.
- **Sí:** flechas y WASD, con una cola de 2 giros validada contra el último giro encolado. Así no se pierden las pulsaciones rápidas y se evita el auto-mordisco por un doble giro dentro de un mismo paso.
- **No:** ratón ni un solo giro por paso.
- **Sí:** espera a la primera tecla, con `▸ PULSA UNA FLECHA_`. La izquierda no arranca porque sería un giro de 180°.
- **No:** arranque automático al montar.
- **Sí:** el canvas no dibuja nada más que el tablero (sin contador de frutas).
- **Sí:** el tablero lleno termina la partida con `onGameOver`. Es el único final posible además de chocar, y evita un `spawnFruit` sin celdas libres.
- **Sí:** lógica pura en `games/viborita/snake.ts`, separada del motor. Las reglas de giro, colisión y crecimiento se pueden revisar sin canvas.
- **Sí:** `MAX_DT = 0.05` y acumulador. Con el tope de 20 pasos/s hay como máximo un paso por frame y no se saltan celdas.
- **Sí:** portada nueva `.cover-viborita` (serpiente en L, manzana magenta y rejilla cian).
- **No:** reutilizar `.cover-snake`, porque pertenece a SERPENTINA.

---

## Riesgos

| Riesgo                                                                                              | Mitigación                                                                                                                  |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| El 404 tras `updateTag` de SPEC 06 al navegar justo después de guardar.                             | Fuera de alcance. Los criterios de consola se comprueban cargando la URL directamente.                                      |
| El catálogo prerenderizado sale sin VIBORITA por `.next/cache/fetch-cache` (SPEC 07, sin resolver). | El paso 5 borra el `fetch-cache` antes de recompilar y comprueba que `.next/server/app/juegos.html` contiene `VIBORITA`.    |
| El Strict Mode monta el efecto dos veces en dev y crea dos bucles.                                  | `destroy()` cancela el rAF y quita el listener. Un criterio comprueba que la velocidad del nivel 1 sigue siendo 8 celdas/s. |
| Dos giros rápidos dentro de un paso producen un 180° y la serpiente se muerde.                      | La cola valida cada giro contra el último encolado, no contra la dirección actual. Hay un criterio específico.              |
| Las teclas del juego interfieren con el input de nombre del modal.                                  | El motor ignora el teclado si está pausado, en game over o con el foco en un campo de texto.                                |
| Un giro pulsado justo antes de pausar se aplica al reanudar.                                        | `pause()` vacía la cola de giros.                                                                                           |
| Un salto de `dt` al reanudar avanza varias celdas de golpe.                                         | `resume()` reinicia `lastTime` y `acc`, y `dt` está limitado a `MAX_DT`.                                                    |
| Sin código de referencia, una regla queda ambigua al implementar.                                   | Las constantes y reglas de esta spec son la única fuente. Si algo no está aquí, se pregunta antes de inventarlo.            |
| Con la serpiente casi llena, `spawnFruit` tarda en encontrar una celda libre.                       | `spawnFruit` elige entre la lista de celdas libres (máx. 768), no reintenta al azar.                                        |

---

## Lo que **no** está en esta spec

- Los sprites de Google Snake (`games/snake/`, que se borra).
- Cambios en la entrada simulada SERPENTINA.
- Bordes que atraviesan, obstáculos, varias frutas, frutas con valores distintos y power-ups.
- Más de una vida y la extensión E1.
- Sonido, volumen e imágenes (E2/E3).
- Indicadores extra en el canvas.
- Controles táctiles y soporte móvil jugable.
- Cambios de esquema, de `lib/catalog.ts` o de `saveScoreAction`.
- El arreglo del `fetch-cache` y del 404 tras guardar.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
