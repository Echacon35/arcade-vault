# SPEC GJ apila 02 — Juego real de APILA GRÚA (variante con grúa pendular)

> **Estado:** Borrador
> **Tema:** APILA — apilar bloques con recorte; perfectas y combo (variante "twist" del game jam diario del 2026-11-12)
> **Depende de:** `specs/game-jam/apila/01-apila-clasico.md` (reutiliza `games/apila/stack.ts`), SPEC 05, SPEC 06, SPEC 06.5
> **Fecha:** 2026-11-12
> **Objetivo:** Crear APILA GRÚA, una variante de APILA en la que el bloque cuelga de una grúa que avanza por un raíl y se balancea como un péndulo, cae con gravedad al soltarlo y se recorta al aterrizar; hacerla jugable en `/juegos/apila-grua/jugar` con fila propia en `games`, TOP 10 y pestaña en el Salón.

---

## Por qué existe esta spec

El modo clásico (spec 01) es timing sobre **un** movimiento lineal. APILA GRÚA convierte el mismo núcleo (recorte, perfectas, combo) en un reto de **lectura de dos movimientos combinados** — el carro que va y viene y el péndulo del cable — más una **caída con tiempo de vuelo** que obliga a anticipar. Además cambia la economía de la partida: hay **3 vidas** y el combo da **vidas extra** en lugar de recrecer el bloque, así que se juega distinto y tiene su propia tabla de puntuaciones.

Particularidades:

- **Sin original.** Todas las constantes son la única fuente de verdad del motor.
- **Reutiliza la lógica pura** de `games/apila/stack.ts` (`resolveDrop`, `hueFor`, `pointsFor` con constantes propias pasadas por parámetro). Si la spec 01 aún no está implementada, esta spec crea `stack.ts` tal y como la describe la spec 01 antes de empezar.
- **Juego independiente en el catálogo** (`apila-grua`), no un modo dentro de APILA: el contrato de motor no tiene selector de modo y cada leaderboard es por `game_id`.
- **Encaje con el contrato de motor:** canvas 800×600 con cámara vertical; solo teclado; vidas como número (3, con tope 5): no hace falta E1; sin imágenes ni sonido.

---

## Alcance

**Dentro:**

- **Motor TypeScript** en `games/apila-grua/`:
  - **Mundo y torre:** idénticos a la spec 01: base `BASE_W = 300` × `BASE_H = 60` en `x = 250` con su borde superior en `y = 540` (mundo), pisos de `BLOCK_H = 30`.
  - **Cámara:** `camTarget = min(0, yTopeTorre − TOWER_ANCHOR_Y)`, con `TOWER_ANCHOR_Y = 470` de pantalla, y `camY += (camTarget − camY) × min(1, CAMERA_LERP × dt)`, `CAMERA_LERP = 6`. El raíl y la grúa están **fijos en pantalla**; solo se desplaza la torre.
  - **Raíl y carro:** raíl horizontal en `RAIL_Y = 50` de pantalla, de `x = 100` a `x = 700`. El carro (60×16 px) tiene su centro `cx` en vaivén entre `TROLLEY_MIN = 140` y `TROLLEY_MAX = 660`. Velocidad `px/s = min(TROLLEY_BASE + (level − 1) × TROLLEY_PER_LEVEL, TROLLEY_MAX_SPEED)`, con `TROLLEY_BASE = 160`, `TROLLEY_PER_LEVEL = 15` y `TROLLEY_MAX_SPEED = 340` (nivel 13).
  - **Péndulo (cinemático, no físico):** cable desde `(cx, RAIL_Y + 16)` de longitud `CABLE_L = 120`. Ángulo `θ = AMP × sin(2π × swingT / PERIOD)`, con `PERIOD = 1.8` s y `AMP = min(AMP_BASE + (level − 1) × AMP_PER_LEVEL, AMP_MAX)` en grados: `AMP_BASE = 10`, `AMP_PER_LEVEL = 3`, `AMP_MAX = 34` (nivel 9). `swingT` avanza solo mientras hay bloque colgado y el juego no está en pausa.
  - **Gancho y bloque colgado:** gancho en `hx = cx + CABLE_L × sin θ`, `hy = RAIL_Y + 16 + CABLE_L × cos θ`. El bloque cuelga **sin rotar**, centrado bajo el gancho: `x = hx − w/2`, borde superior en `hy + 6`.
  - **Soltar:** el bloque conserva su `x` (sin velocidad horizontal) y cae con `vy₀ = 0` y gravedad `G = 2000` px/s². Aterriza cuando su borde inferior alcanza el borde superior del último bloque de la torre (en mundo); entonces se aplica `resolveDrop` con `PERFECT_TOL = 6` y `MIN_OVERLAP = 2`:
    - **perfecta:** se coloca alineado con el de abajo, sin recorte;
    - **recorte:** se coloca la parte solapada; lo sobrante es un fragmento visual (mismas reglas de fragmentos que la spec 01);
    - **fallo:** el bloque sigue cayendo junto a la torre hasta salir por debajo de la pantalla; entonces se pierde una vida.
  - **Sin recrecimiento:** el ancho solo disminuye. Tras un fallo, el siguiente bloque tiene el ancho del último bloque de la torre.
  - **Vidas:** `START_LIVES = 3`, `MAX_LIVES = 5`. Cada vez que `combo` llega a un múltiplo de `LIFE_EVERY = 3` (3, 6, 9…) se gana una vida, sin pasar de 5. Un fallo resta una vida y pone `combo = 0`; con 0 vidas la partida termina.
  - **Puntuación** (con el `level` de antes de contar el piso): piso colocado `FLOOR_POINTS × level` (`FLOOR_POINTS = 15`); perfecta, además, `PERFECT_POINTS × min(combo, COMBO_CAP)` (`PERFECT_POINTS = 30`, `COMBO_CAP = 10`). Ejemplo: en el nivel 1 una perfecta aislada vale 45 y la tercera seguida 105 (+1 vida). Tope `MAX_SCORE = 10_000_000`.
  - **Nivel:** `level = 1 + floor(floors / FLOORS_PER_LEVEL)`, con `FLOORS_PER_LEVEL = 8`. El piso 8 vale 15 y sube a nivel 2; el piso 9 vale 30.
  - **Reaparición:** tras aterrizar (o tras perder la vida de un fallo), el gancho queda vacío `RESPAWN_DELAY = 0.4` s; luego aparece el bloque nuevo con `swingT = 0` (θ = 0). El carro no se detiene en ningún momento salvo en pausa, `waiting` y `gameover`.
  - **Bucle:** `requestAnimationFrame`, `dt` en segundos, `MAX_DT = 0.05`, primer frame `dt = 0`; `resume()` reinicia `lastTime`.
  - **Sin estado global:** `createApilaGruaGame(canvas, callbacks, options?)` devuelve `pause`, `resume`, `restart` y `destroy`.
- **Estados del motor:**

  | Fase       | Qué pasa                                                                                         | Sale a                                                  |
  | ---------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
  | `waiting`  | Carro en `cx = 400`, bloque colgado con θ = 0, todo quieto. Aviso `▸ PULSA ESPACIO_`.            | `hanging` con la primera tecla de soltar (no suelta)    |
  | `hanging`  | Carro y péndulo en movimiento; la tecla de soltar pasa a `falling`.                              | `falling`                                               |
  | `falling`  | Bloque en caída; teclas de soltar ignoradas.                                                     | `respawn` (colocado o vida perdida) · `gameover`        |
  | `respawn`  | Gancho vacío durante 0,4 s; carro en movimiento.                                                 | `hanging`                                               |
  | `gameover` | Sin input. Fragmentos y cámara terminan su animación. `onGameOver` ya se llamó.                  | `waiting` con `restart()`                               |

  `paused` congela carro, péndulo, caída, cámara, fragmentos y el temporizador de reaparición.
- **Controles:**
  - `Space`, `ArrowDown`/`KeyS` y `Enter` sueltan el bloque (solo en `hanging`). Se ignora `e.repeat`.
  - `KeyP` y `Escape` llaman a `onPauseToggle()`, sin repetición.
  - Estas teclas hacen `preventDefault()` mientras el juego está montado (salvo con foco en un campo de texto).
  - El teclado se ignora en pausa, en `gameover` o con el foco en un campo de texto (`isTypingTarget`).
- **Visual** (un único objeto `COLORS`, para `skin-designer`):
  - fondo `#000` con líneas horizontales cian `rgba(0, 245, 255, 0.06)` cada 30 px que se desplazan con la cámara;
  - raíl: línea cian `#00f5ff` de 3 px con glow y dos topes de 6×14 px en los extremos;
  - carro: rectángulo `#1a1a2e` con borde cian y dos ruedas (círculos de 5 px) sobre el raíl;
  - cable: línea blanca `rgba(255,255,255,0.7)` de 1 px; gancho: arco de 6 px en blanco;
  - bloques: `hsl(hue, 100%, 60%)` con `hue = (185 + floor × 14) mod 360` (arranca cian), glow `shadowBlur = 12`; base como en la spec 01 pero con borde cian;
  - perfecta: contorno blanco 0,25 s y `PERFECTO ×n` en amarillo `#ffe600` (igual que la spec 01);
  - vida extra: texto `+1 ♥` en magenta `#ff006e`, `bold 22px monospace`, sobre el bloque, subiendo 40 px y desvaneciéndose en 0,8 s;
  - fallo con vidas restantes: la base de la torre parpadea en magenta 2 veces en 0,4 s;
  - aviso `▸ PULSA ESPACIO_` en cian, centrado en `y = 300` de pantalla.
- **HUD en React:** puntuación, vidas (`♥♥♥`, hasta 5) y nivel por `onStats`. El canvas no pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`.
- **Fin de partida:** con 0 vidas, fase `gameover`, `onStats({ …, lives: 0 })` y una sola llamada a `onGameOver(score)`. Modal `FIN DEL JUEGO` con `saveScoreAction`. `JUGAR DE NUEVO` → `restart()`: torre solo con la base, carro en el centro, 0 puntos, nivel 1, 3 vidas, combo 0, fase `waiting`.
- **Registro** en `GAME_ENGINES` con la clave `apila-grua`.
- **Catálogo:** entrada en `GAMES`, justo después de `apila` (o tras la primera `ranaria` si la spec 01 no está implementada):

  | Campo   | Valor                                                                                                                                                                                                                                                                  |
  | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `id`    | `"apila-grua"`                                                                                                                                                                                                                                                         |
  | `title` | `"APILA GRÚA"`                                                                                                                                                                                                                                                         |
  | `cat`   | `"ARCADE"`                                                                                                                                                                                                                                                             |
  | `color` | `"cyan"`                                                                                                                                                                                                                                                               |
  | `cover` | `"cover-apila-grua"`                                                                                                                                                                                                                                                   |
  | `best`  | `0`                                                                                                                                                                                                                                                                    |
  | `plays` | `"0"`                                                                                                                                                                                                                                                                  |
  | `short` | "Suelta el bloque desde una grúa que no para de balancearse."                                                                                                                                                                                                          |
  | `long`  | "Una grúa recorre el raíl con un bloque colgando de su cable. Calcula el balanceo y la caída y suéltalo con Espacio: lo que sobresale se corta. Tres perfectas seguidas te dan una vida extra, hasta cinco. Cada 8 pisos la grúa va más rápido y se balancea más." |

- **Portada** `.cover-apila-grua` en `app/globals.css`, CSS puro con `/frontend-design`: raíl cian arriba con un carro, un cable inclinado con un bloque cian colgando y una torre corta de barras escalonadas en degradado cian → magenta abajo. Distinta de `.cover-apila`.
- **Supabase:** migración de datos `add_game_apila_grua` con `apply_migration` y copia idéntica en `supabase/migrations/`. Puntuaciones en `scores` con `game_id = 'apila-grua'`; TOP 10 y pestaña `APILA GRÚA` de `/salon` sin cambios de código.

**Fuera de alcance:**

- Física real del péndulo (inercia del bloque al soltar, rotación, viento).
- Recrecimiento del bloque (es propio del modo clásico).
- Guía de caída (plomada) o sombra de aterrizaje.
- Sonido (E3), imágenes (E2), skins (E4) y pad táctil: skins y táctil los añaden `skin-designer` y `mobile-porter` vía `/spec-impl-game`.
- Ratón, power-ups, cambios de esquema y tests automatizados.

---

## Modelo de datos

```ts
// games/apila-grua/engine.ts — estado interno, nunca en el nivel del módulo
import type { Block } from "../apila/stack";
type Phase = "waiting" | "hanging" | "falling" | "respawn" | "gameover";
type State = {
  tower: Block[];
  trolley: { cx: number; dir: 1 | -1 };
  swingT: number; // s
  hanging: { w: number; hue: number } | null;
  falling: { x: number; y: number; w: number; vy: number; hue: number; missed: boolean } | null; // y en mundo
  respawnT: number;
  floors: number;
  combo: number;
  score: number;
  lives: number; // 3, máx. 5
  level: number; // 1 + floor(floors / 8)
  camY: number;
  debris: Debris[]; // como en la spec 01
  flashes: Flash[]; // perfecta, +1 ♥, fallo
  phase: Phase;
  paused: boolean;
};
```

```sql
-- supabase/migrations/<version>_add_game_apila_grua.sql
insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values (
  'apila-grua',
  'APILA GRÚA',
  'Suelta el bloque desde una grúa que no para de balancearse.',
  'Una grúa recorre el raíl con un bloque colgando de su cable. Calcula el balanceo y la caída y suéltalo con Espacio: lo que sobresale se corta. Tres perfectas seguidas te dan una vida extra, hasta cinco. Cada 8 pisos la grúa va más rápido y se balancea más.',
  'ARCADE',
  'cover-apila-grua',
  'cyan',
  7
);
```

> Nota: `sort_order = 7` asume APILA en el 6. El paso 4 lo comprueba con `select max(sort_order) from games`; si no coincide, se usa `max + 1` como número literal.

Archivos:

- `games/apila-grua/constants.ts`: `W`, `H`, `MAX_DT`; geometría de base y bloque (importada o repetida de `games/apila/constants.ts`); `RAIL_Y = 50`, `TROLLEY_MIN = 140`, `TROLLEY_MAX = 660`, `TROLLEY_BASE = 160`, `TROLLEY_PER_LEVEL = 15`, `TROLLEY_MAX_SPEED = 340`; `CABLE_L = 120`, `PERIOD = 1.8`, `AMP_BASE = 10`, `AMP_PER_LEVEL = 3`, `AMP_MAX = 34`; `G = 2000`; `PERFECT_TOL = 6`, `MIN_OVERLAP = 2`; `START_LIVES = 3`, `MAX_LIVES = 5`, `LIFE_EVERY = 3`; `FLOOR_POINTS = 15`, `PERFECT_POINTS = 30`, `COMBO_CAP = 10`, `FLOORS_PER_LEVEL = 8`, `MAX_SCORE = 10_000_000`; `TOWER_ANCHOR_Y = 470`, `CAMERA_LERP = 6`; `RESPAWN_DELAY = 0.4`; `HUE_START = 185`, `HUE_STEP = 14`; `COLORS`.
- `games/apila-grua/crane.ts`: funciones puras `trolleySpeed(level)`, `amplitude(level)`, `angleAt(swingT, level)`, `hookPos(cx, θ)`, `stepTrolley(trolley, dt, speed)` (vaivén con reflejo del exceso).
- `games/apila-grua/engine.ts`: `createApilaGruaGame`.
- `games/apila/stack.ts`: se reutiliza; si `resolveDrop` y `pointsFor` usan constantes de APILA, se les añaden parámetros (`perfectTol`, `minOverlap`, `floorPoints`, `perfectPoints`, `comboCap`) con los valores de APILA por defecto, sin cambiar su comportamiento en la spec 01.

---

## Plan de implementación

1. **Lógica compartida.** Comprobar que existe `games/apila/stack.ts` (si no, crearlo según la spec 01) y parametrizar `resolveDrop`/`pointsFor`. APILA sigue igual. `npm run build` pasa.
2. **Constantes, grúa y motor.** Crear `constants.ts`, `crane.ts` y `engine.ts`:
   - Estado inicial `waiting`; emite `onStats({ score: 0, lives: 3, level: 1 })`.
   - `hanging`: avanza carro y `swingT`; soltar crea `falling` con la `x` actual del bloque y la `y` de mundo equivalente (`hy + 6 + camY`).
   - `falling`: integra `vy += G·dt`, `y += vy·dt`; al tocar el tope de la torre llama a `resolveDrop`. Perfecta/recorte → coloca, puntúa, combo, vida extra si toca, `respawn`. Fallo → marca `missed` y sigue cayendo; cuando su `y` de pantalla supera 600, resta vida, `combo = 0`, y pasa a `respawn` o a `gameover`.
   - `respawn`: cuenta `RESPAWN_DELAY` y crea el bloque colgado con el ancho del tope de la torre y `swingT = 0`.
   - Dibujo, `onStats` solo con cambios, ciclo de vida igual que la spec 01.
3. **Registro, catálogo y portada.** `"apila-grua": createApilaGruaGame` en `GAME_ENGINES`; entrada en `GAMES`; `.cover-apila-grua` con `/frontend-design`.
4. **Fila en Supabase.** Comprobar `sort_order` e inexistencia de `apila-grua`; `apply_migration` `add_game_apila_grua` + copia en `supabase/migrations/` con la versión de `list_migrations`; `select * from games where id = 'apila-grua'`; `get_advisors`. Borrar `.next/cache/fetch-cache/` (y `route-cache`) antes del build y comprobar que `.next/server/app/juegos.html` contiene `APILA GRÚA`.
5. **Verificación y limpieza.** Partida completa con guardado, TOP 10 y Salón cargando URLs directamente; APILA y el resto sin regresiones; borrar puntuaciones de prueba; `npm run lint` y `npm run build`.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` sin errores.
- [ ] `/juegos` muestra APILA GRÚA con `.cover-apila-grua` y acento cian; `/juegos/apila-grua` sin puntuaciones muestra `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- [ ] `/juegos/apila-grua/jugar` muestra raíl, carro centrado, bloque colgando vertical y `▸ PULSA ESPACIO_`; HUD `Puntuación 0`, `Vidas ♥♥♥`, `Nivel 01`.
- [ ] La primera pulsación arranca carro y péndulo sin soltar; la siguiente suelta.
- [ ] En el nivel 1 el carro va a ~160 px/s y el balanceo es de ±10° con periodo de 1,8 s.
- [ ] Al soltar, el bloque cae en vertical desde la posición donde estaba (sin heredar el balanceo) y acelera.
- [ ] Pulsar durante la caída o con el gancho vacío no hace nada.
- [ ] Aterrizar con 20 px de desfase recorta 20 px; dentro de ±6 px es perfecta, `PERFECTO ×1`, +45 en el nivel 1.
- [ ] La tercera perfecta seguida suma 105 en el nivel 1, muestra `+1 ♥` y el HUD pasa a `♥♥♥♥`. Nunca hay más de 5 vidas.
- [ ] Un fallo deja caer el bloque fuera de la pantalla, resta una vida, reinicia el combo y no cambia la torre; el siguiente bloque tiene el ancho del tope.
- [ ] Tras el piso 8 el HUD muestra `Nivel 02` y el piso 9 suma 30 (sin perfecta). La velocidad del carro no pasa de 340 px/s ni el balanceo de ±34°.
- [ ] Con la última vida perdida: HUD `Vidas —`, se abre `FIN DEL JUEGO` con la puntuación real.
- [ ] El canvas no pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`.
- [ ] La pausa congela carro, péndulo, caída y reaparición; al reanudar nada salta. Cambiar de pestaña pausa.
- [ ] Teclas de juego no desplazan la página; escribir el nombre en el modal no suelta bloques.
- [ ] Tras guardar, la fila aparece en el TOP 10 de `/juegos/apila-grua` y en la pestaña `APILA GRÚA` de `/salon`; las puntuaciones de APILA no se mezclan.
- [ ] `JUGAR DE NUEVO` vuelve a `waiting` con 3 vidas, 0 puntos y nivel 1.
- [ ] Salir y volver a entrar: un solo bucle y sin listeners colgados.
- [ ] APILA (spec 01) se juega igual que antes tras parametrizar `stack.ts`.
- [ ] Ningún archivo de `games/apila-grua/` declara estado mutable en el nivel del módulo; consola sin errores; puntuaciones de prueba borradas.

---

## Casos límite

| Caso                                                                       | Comportamiento                                                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| El péndulo saca el bloque fuera del canvas (carro en 660, θ = +34°).       | Permitido: `hx` máx. ≈ 727 y el bloque puede asomar por el borde; si se suelta ahí, es un fallo normal.            |
| Un `dt` grande durante la caída atraviesa el tope de la torre.             | La colisión se resuelve con la posición anterior y la nueva (si `yAnterior ≤ tope ≤ yNueva`, aterriza en el tope).  |
| El bloque que cae roza el borde del tope con solape < 2 px.                | Es fallo: sigue cayendo por el lado y no se queda apoyado.                                                          |
| Vida extra con 5 vidas.                                                    | No suma vida; se muestra `PERFECTO ×n` sin `+1 ♥`.                                                                  |
| Pausa justo al soltar.                                                     | El bloque queda congelado en el aire; al reanudar sigue con su `vy`.                                                |
| `restart()` con un bloque cayendo o en `respawn`.                          | Se descartan caída, fragmentos y temporizador; cámara a 0 sin interpolar.                                           |
| Torre tan alta que el tope está por encima de 470 sin que la cámara llegue. | La cámara interpola a 6/s; la caída siempre aterriza en coordenadas de mundo, así que el retraso visual no afecta a la lógica. |
| Puntuación teórica > 10.000.000.                                           | Se limita a `MAX_SCORE`.                                                                                             |

---

## Decisiones

- **Sí:** juego aparte `apila-grua` con su propia tabla. Las reglas (vidas, puntos, nivel) son distintas y mezclar puntuaciones con APILA no sería justo.
- **No:** selector de modo dentro de APILA (el contrato de motor y `saveScoreAction` no lo contemplan).
- **Sí:** péndulo cinemático con seno y caída vertical sin inercia horizontal. Predecible y justo; la física real haría el timing caótico.
- **Sí:** 3 vidas y vida extra cada 3 perfectas seguidas (tope 5) en lugar del recrecimiento: la variante premia la constancia, no la torre infinita.
- **Sí:** tolerancia de perfecta 6 px (1 más que el clásico) porque la caída añade incertidumbre.
- **Sí:** nivel cada 8 pisos y puntos más altos (15/30) para compensar la mayor dificultad.
- **Sí:** `cyan` para separarlo visualmente de APILA (`yellow`).
- **No:** plomada o sombra de aterrizaje (quitaría el reto de leer el balanceo). Queda como decisión abierta.

---

## Riesgos

| Riesgo                                                                       | Mitigación                                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Parametrizar `stack.ts` cambia APILA sin querer.                             | Valores por defecto = constantes de APILA; criterio de no regresión.                             |
| Dificultad excesiva en niveles altos (carro rápido + ±34°).                  | Topes explícitos; si en pruebas resulta injusto, se ajustan `AMP_MAX` o `TROLLEY_MAX_SPEED` antes de aprobar. |
| El id con guion (`apila-grua`) en rutas, CSS o migración.                    | Ya existe `bloque-buster` como precedente; el nombre de migración usa guion bajo (`add_game_apila_grua`). |
| Catálogo prerenderizado sin el juego por el fetch-cache.                     | Paso 4: borrar caché y comprobar `juegos.html`.                                                  |
| Strict Mode crea dos bucles.                                                 | `destroy()` cancela rAF y listener; criterio específico.                                         |

---

## Lo que **no** está en esta spec

- Física real, viento, rotación del bloque, plomada.
- Recrecimiento del bloque.
- Sonido, imágenes, skins y pad táctil.
- Cambios de esquema o de `saveScoreAction`.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
