# SPEC GJ apila 01 — Juego real de APILA (modo clásico)

> **Estado:** Borrador
> **Tema:** APILA — apilar bloques con recorte; perfectas y combo (sorteado al azar de `references/game-suggestions-todo.md` por el game jam diario)
> **Depende de:** SPEC 05, SPEC 06, SPEC 06.5, SPEC 09 (modelo de motor sin original)
> **Fecha:** 2026-11-12
> **Objetivo:** Crear desde cero APILA, un juego de timing de una sola tecla en el que se apilan bloques de neón que se recortan al caer descentrados, y hacerlo jugable en `/juegos/apila/jugar` con su fila en la tabla `games` de Supabase, su TOP 10 y su pestaña en el Salón de la Fama.

---

## Por qué existe esta spec

APILA es la idea más barata del lote del 2026-11-11 (27/30) y aporta algo que el catálogo real no tiene: un juego de **una sola tecla** basado en timing puro, de partidas cortas (30 s – 3 min) y con mucha dispersión de puntuaciones, ideal para "una más". ASTEROIDES, REBOTE, VIBORITA y RANARIA son de movimiento continuo o por rejilla; TETRA es de colocación con rotación. Esta es la variante **clásica**; la spec `02-apila-grua.md` define una variante con grúa pendular y su propia tabla de puntuaciones.

Particularidades:

- **Sin original.** No hay código en `references/started-games/`. Todas las constantes de esta spec son la única fuente de verdad del motor; si algo no está aquí, se pregunta antes de inventarlo.
- **Original frente al género.** Los juegos comerciales de apilar son 3D isométricos y alternan el eje de entrada. APILA es **2D de perfil**, con bloques en la paleta neón del Vault, velocidad por **escalones de nivel** visibles en el HUD, puntuación por nivel × piso y una regla propia de **recrecimiento** con combos de perfectas. Nombre, arte y reglas son propios.
- **Encaje con el contrato de motor:**
  - El mundo es una columna vertical infinita de 800 px de ancho; la cámara solo se desplaza en vertical y todo se dibuja en el canvas de 800×600.
  - Solo teclado; no hay ratón (el pad táctil lo añade `mobile-porter` después).
  - Una vida, como número (`lives` 1 → 0): no hace falta E1.
  - Sin imágenes ni sonido: no hacen falta E2 ni E3.
  - `isTypingTarget` ya está en `games/shared/input.ts`.

---

## Alcance

**Dentro:**

- **Motor TypeScript** en `games/apila/`:
  - **Mundo y cámara:** coordenadas de mundo con `y` creciente hacia abajo. La base es un bloque fijo de `BASE_W = 300` × `BASE_H = 60` px con `x = 250` (centrado) y su borde superior en `y = 540`. Cada piso mide `BLOCK_H = 30` px; el piso `n` (1, 2, 3…) tiene su borde superior en `y = 540 − n × BLOCK_H`. La cámara tiene un desplazamiento `camY ≤ 0` (`yPantalla = yMundo − camY`). Objetivo: que el borde superior del bloque móvil quede como mínimo en `CAMERA_ANCHOR_Y = 300` de pantalla: `camTarget = min(0, yBloqueMóvil − CAMERA_ANCHOR_Y)`. La cámara se acerca con `camY += (camTarget − camY) × min(1, CAMERA_LERP × dt)`, `CAMERA_LERP = 8`.
  - **Torre:** lista de bloques colocados `{ x, w, floor, hue }`. Solo se dibujan los visibles en pantalla (los que cumplen `yPantalla < 600` y `yPantalla + BLOCK_H > 0`).
  - **Bloque móvil:** mismo ancho que el último bloque de la torre, en el piso siguiente. Se mueve en horizontal en vaivén entre `X_MIN = 40` y `X_MAX = 760 − w` (rebota en los extremos). En pisos impares arranca en `X_MIN` hacia la derecha; en pares, en `X_MAX` hacia la izquierda.
  - **Velocidad:** `px/s = min(BASE_SPEED + (level − 1) × SPEED_PER_LEVEL, MAX_SPEED)`, con `BASE_SPEED = 240`, `SPEED_PER_LEVEL = 30` y `MAX_SPEED = 600` (se alcanza en el nivel 13).
  - **Soltar y recortar** (instantáneo, sin caída lógica). Sea `top = { x, w }` el último bloque y `m = { x, w }` el móvil; `offset = m.x − top.x`:
    - **Perfecta:** si `|offset| ≤ PERFECT_TOL = 5` px, el bloque se coloca con `x = top.x` y ancho `w` (sin recorte).
    - **Recorte:** si no, `overlap = w − |offset|`. Si `overlap ≥ MIN_OVERLAP = 2`, se coloca `{ x: max(m.x, top.x), w: overlap }` y la parte sobrante se convierte en un **fragmento** visual que cae.
    - **Fallo:** si `overlap < MIN_OVERLAP`, el bloque entero cae como fragmento y la partida termina.
  - **Combo y recrecimiento:** `combo` cuenta perfectas consecutivas (un recorte lo pone a 0). Desde la 3.ª perfecta seguida (`combo ≥ GROW_FROM = 3`), cada perfecta ensancha el bloque colocado `GROW_PX = 10` px (5 por lado), hasta `BASE_W = 300`, y se ajusta para quedar dentro de `[X_MIN, 760]`.
  - **Puntuación** (con el `level` de antes de contar el piso):
    - cada piso colocado suma `FLOOR_POINTS × level` (`FLOOR_POINTS = 10`);
    - cada perfecta suma además `PERFECT_POINTS × min(combo, COMBO_CAP)` (`PERFECT_POINTS = 25`, `COMBO_CAP = 10`), con `combo` ya incrementado.
    - Ejemplo: en el nivel 1, una perfecta aislada vale 10 + 25 = 35; la tercera perfecta seguida vale 10 + 75 = 85. La puntuación se limita a 10.000.000.
  - **Nivel:** `level = 1 + floor(floors / FLOORS_PER_LEVEL)`, con `FLOORS_PER_LEVEL = 10`. El piso 10 aún vale 10 puntos (nivel 1) y sube a nivel 2; el piso 11 vale 20.
  - **Vidas:** `START_LIVES = 1`. Al fallar se emite `lives: 0`.
  - **Fragmentos:** rectángulos con la misma tonalidad que el bloque, velocidad inicial `vx = ±60` px/s (hacia el lado del corte), `vy = 0`, gravedad `DEBRIS_G = 1400` px/s², opacidad de 1 a 0 en `DEBRIS_LIFE = 0.8` s. Máximo `DEBRIS_MAX = 12` vivos (se descarta el más antiguo). Son solo visuales.
  - **Bucle:** `requestAnimationFrame` con `dt` en segundos, tope `MAX_DT = 0.05` y primer frame con `dt = 0`. `resume()` reinicia `lastTime`.
  - **Sin estado global:** `createApilaGame(canvas, callbacks, options?)` devuelve `pause`, `resume`, `restart` y `destroy`.
- **Estados del motor:**

  | Fase       | Qué pasa                                                                                                         | Sale a                                   |
  | ---------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
  | `waiting`  | Base + bloque móvil quieto en `X_MIN` (piso 1). Aviso `▸ PULSA ESPACIO_`.                                        | `playing` con la primera tecla de soltar |
  | `playing`  | El bloque se mueve; cada tecla de soltar coloca, recorta o falla.                                                | `gameover` al fallar                     |
  | `gameover` | Sin input. Los fragmentos y la cámara terminan su animación; no se generan bloques. `onGameOver` ya se llamó.    | `waiting` con `restart()`                |

  `paused` es un indicador aparte: congela movimiento, cámara y fragmentos en cualquier fase.
- **Controles:**
  - `Space`, `ArrowDown`/`KeyS` y `Enter` sueltan el bloque. Una pulsación = un bloque: se ignora `keydown` con `e.repeat`.
  - En `waiting`, la primera de esas teclas solo arranca el movimiento (no suelta).
  - `KeyP` y `Escape` llaman a `onPauseToggle()`, sin repetición.
  - `Space`, `ArrowDown`, `KeyS`, `Enter`, `P` y `Esc` hacen `preventDefault()` mientras el juego está montado (salvo con el foco en un campo de texto).
  - El teclado se ignora si el juego está pausado, si la partida terminó o si el foco está en un campo de texto (`isTypingTarget`).
- **Visual** (paleta neón del Vault en un único objeto `COLORS`, para que `skin-designer` pueda derivar skins):
  - fondo `#000` con líneas horizontales cian `rgba(0, 245, 255, 0.06)` cada 30 px que se desplazan con la cámara (sensación de altura);
  - base: rectángulo `#1a1a2e` con borde amarillo `#ffe600` de 2 px;
  - bloques: color `hsl(hue, 100%, 60%)` con `hue = (50 + floor × 14) mod 360` (arranca amarillo y recorre el círculo), borde 1 px más claro y glow (`shadowBlur = 12`);
  - bloque móvil: igual que su piso, más un trazo blanco de 1 px;
  - **perfecta:** el bloque colocado parpadea con un contorno blanco de 3 px durante 0,25 s y aparece `PERFECTO ×n` (n = `combo`) en amarillo `#ffe600`, `bold 20px monospace`, encima del bloque, subiendo 30 px y desvaneciéndose en 0,6 s;
  - **recrecimiento:** el contorno es cian `#00f5ff` en lugar de blanco;
  - aviso `▸ PULSA ESPACIO_` en cian `#00f5ff`, `monospace`, centrado en `y = 200` de pantalla.
- **HUD en React:** puntuación, vidas (`♥` / `—`) y nivel salen de `onStats`. En el canvas no se pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`.
- **Fin de partida:** al fallar, fase `gameover`, `onStats({ …, lives: 0 })` y una sola llamada a `onGameOver(score)`. Se abre `FIN DEL JUEGO` con guardado vía `saveScoreAction`. `FIN` abandona sin guardar. `JUGAR DE NUEVO` llama a `restart()`: torre solo con la base, 0 puntos, nivel 1, 1 vida, combo 0, cámara en 0, fase `waiting`.
- **Registro** del motor en `GAME_ENGINES` (`games/registry.ts`) con la clave `apila`.
- **Catálogo:** entrada nueva en `GAMES` de `lib/games.ts`, justo después de la primera entrada `ranaria`:

  | Campo   | Valor                                                                                                                                                                                                                                                  |
  | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | `id`    | `"apila"`                                                                                                                                                                                                                                              |
  | `title` | `"APILA"`                                                                                                                                                                                                                                              |
  | `cat`   | `"ARCADE"`                                                                                                                                                                                                                                             |
  | `color` | `"yellow"`                                                                                                                                                                                                                                             |
  | `cover` | `"cover-apila"`                                                                                                                                                                                                                                        |
  | `best`  | `0`                                                                                                                                                                                                                                                    |
  | `plays` | `"0"`                                                                                                                                                                                                                                                  |
  | `short` | "Suelta el bloque a tiempo y levanta la torre más alta."                                                                                                                                                                                              |
  | `long`  | "Un bloque de neón va y viene sobre la torre: suéltalo con Espacio. Lo que sobresale se corta y el siguiente bloque es más estrecho. Las caídas perfectas encadenan combo y, desde la tercera seguida, el bloque vuelve a crecer. Cada 10 pisos todo va más rápido." |

- **Portada** `.cover-apila` en `app/globals.css`, en CSS puro y diseñada con `/frontend-design`: cinco barras horizontales apiladas y ligeramente desplazadas en degradado amarillo → magenta con glow, un fragmento recortado cayendo a un lado y líneas horizontales cian tenues de fondo.
- **Supabase:** migración de datos `add_game_apila` aplicada con `apply_migration`, con `insert` en `games` y copia idéntica en `supabase/migrations/`. Las puntuaciones usan la tabla `scores` existente con `game_id = 'apila'`; el TOP 10 de `/juegos/apila` y la pestaña `APILA` de `/salon` salen de la vista `leaderboard` sin cambios de código.

**Fuera de alcance (para futuras specs):**

- La variante con grúa (`02-apila-grua.md`).
- Sonido (E3), imágenes (E2), partículas extra o sacudidas de cámara.
- Skins E4 y pad táctil: los añaden `skin-designer` y `mobile-porter` al implementar con `/spec-impl-game`.
- Ratón o clic para soltar.
- Más de una vida, E1, power-ups u obstáculos.
- Mostrar el número de pisos en el canvas.
- Cambios de esquema en Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- Arreglar la entrada `ranaria` duplicada en `GAMES` (ver Riesgos).
- Tests automatizados.

---

## Modelo de datos

```ts
// games/apila/stack.ts — tipos y lógica pura, sin estado de módulo (la reutiliza la spec 02)
export type Block = { x: number; w: number; floor: number; hue: number };
export type DropResult =
  | { kind: "perfect"; placed: Block }
  | { kind: "trim"; placed: Block; cut: { x: number; w: number } }
  | { kind: "miss"; cut: { x: number; w: number } };
```

```ts
// games/apila/engine.ts — estado interno, nunca en el nivel del módulo
type Phase = "waiting" | "playing" | "gameover";
type Debris = { x: number; y: number; w: number; vx: number; vy: number; hue: number; age: number };
type Flash = { floor: number; kind: "perfect" | "grow"; age: number; combo: number };
type State = {
  tower: Block[]; // [0] = base (floor 0)
  mover: { x: number; w: number; dir: 1 | -1 };
  floors: number; // pisos colocados (sin la base)
  combo: number;
  score: number;
  lives: number; // 1 → 0 al fallar
  level: number; // 1 + floor(floors / 10)
  camY: number;
  debris: Debris[];
  flashes: Flash[];
  phase: Phase;
  paused: boolean;
};
```

```sql
-- supabase/migrations/<version>_add_game_apila.sql
insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values (
  'apila',
  'APILA',
  'Suelta el bloque a tiempo y levanta la torre más alta.',
  'Un bloque de neón va y viene sobre la torre: suéltalo con Espacio. Lo que sobresale se corta y el siguiente bloque es más estrecho. Las caídas perfectas encadenan combo y, desde la tercera seguida, el bloque vuelve a crecer. Cada 10 pisos todo va más rápido.',
  'ARCADE',
  'cover-apila',
  'yellow',
  6
);
```

> Nota: `sort_order = 6` asume que RANARIA ocupa el 5. El paso 5 lo comprueba con `select max(sort_order) from games`; si no coincide, se usa `max + 1` como número literal.

Archivos:

- `games/apila/constants.ts`:
  - `W = 800`, `H = 600`, `MAX_DT = 0.05`;
  - `BASE_W = 300`, `BASE_H = 60`, `BASE_X = 250`, `BASE_TOP = 540`, `BLOCK_H = 30`;
  - `X_MIN = 40`, `X_RIGHT = 760`;
  - `BASE_SPEED = 240`, `SPEED_PER_LEVEL = 30`, `MAX_SPEED = 600`;
  - `PERFECT_TOL = 5`, `MIN_OVERLAP = 2`, `GROW_FROM = 3`, `GROW_PX = 10`;
  - `FLOOR_POINTS = 10`, `PERFECT_POINTS = 25`, `COMBO_CAP = 10`, `FLOORS_PER_LEVEL = 10`, `START_LIVES = 1`, `MAX_SCORE = 10_000_000`;
  - `CAMERA_ANCHOR_Y = 300`, `CAMERA_LERP = 8`;
  - `DEBRIS_G = 1400`, `DEBRIS_LIFE = 0.8`, `DEBRIS_MAX = 12`;
  - `HUE_START = 50`, `HUE_STEP = 14`;
  - `COLORS`: fondo `#000`, líneas `rgba(0, 245, 255, 0.06)`, base `#1a1a2e`, borde base `#ffe600`, perfecta `#ffffff`, recrecimiento `#00f5ff`, texto combo `#ffe600`, aviso `#00f5ff`.
- `games/apila/stack.ts`: funciones puras sin `window` ni canvas:
  - `baseBlock()`;
  - `resolveDrop(top, moverX, moverW, floor)` → `DropResult` (perfecta / recorte / fallo con las reglas de arriba);
  - `grow(block, px, xMin, xMax, maxW)` → bloque ensanchado y ajustado;
  - `hueFor(floor)`, `levelFor(floors)`, `speedFor(level)`;
  - `pointsFor(level, perfect, combo)`.
- `games/apila/engine.ts`: `createApilaGame`, con bucle, input, cámara, fragmentos, dibujo y ciclo de vida.

Convenciones: dibujo en el espacio lógico 800×600; `dt` en segundos; ningún módulo toca `window` ni `document` al importarse; teclas por `KeyboardEvent.code`.

---

## Plan de implementación

1. **Constantes y lógica pura.** Crear `games/apila/constants.ts` y `games/apila/stack.ts`. `npm run build` pasa.
2. **Motor.** Crear `games/apila/engine.ts` con `createApilaGame`:
   - **Estado inicial:** base, `mover = { x: X_MIN, w: BASE_W, dir: 1 }`, fase `waiting`. Emite `onStats({ score: 0, lives: 1, level: 1 })`.
   - **Bucle:** en `playing` mueve el bloque con rebote en `X_MIN` / `X_RIGHT − w`; en todas las fases (salvo pausa) actualiza cámara, fragmentos y destellos.
   - **Soltar:** `resolveDrop`; en perfecta/recorte añade el bloque (con `grow` si toca), suma puntos, recalcula nivel, crea fragmento si hay corte, genera el siguiente móvil según la paridad del piso. En fallo: fragmento con el bloque entero, fase `gameover`, `lives: 0`, `onGameOver(score)` una vez.
   - **Dibujo:** fondo y líneas con cámara, torre visible, móvil, fragmentos, destellos y aviso en `waiting`.
   - **Estadísticas:** `onStats` solo cuando cambia algún valor.
   - **Ciclo de vida:** `pause()` congela; `resume()` reinicia `lastTime`; `restart()` vuelve al estado inicial y emite estadísticas; `destroy()` cancela el rAF y quita el listener.
3. **Registro.** `apila: createApilaGame` en `GAME_ENGINES`. Comprobación manual en `/juegos/apila/jugar` tras el paso 4.
4. **Catálogo y portada.** Entrada `apila` en `GAMES` y `.cover-apila` en `app/globals.css` (junto a las portadas reales) con `/frontend-design`.
5. **Fila en Supabase.**
   - `select id, sort_order from public.games order by sort_order` para confirmar el siguiente `sort_order` y que `apila` no existe.
   - Aplicar `add_game_apila` con `apply_migration`; guardar el mismo SQL en `supabase/migrations/<version>_add_game_apila.sql` con la versión de `list_migrations`.
   - Verificar con `select * from games where id = 'apila'` y `get_advisors` (seguridad) sin avisos nuevos.
   - Borrar `.next/cache/fetch-cache/` (y `.next/server/route-cache` si existe) antes del build y comprobar después que `.next/server/app/juegos.html` contiene `APILA`.
6. **Verificación y limpieza.** Partida completa y guardado; TOP 10 de `/juegos/apila` y pestaña `APILA` de `/salon` cargando las URLs directamente; sin regresiones en los demás juegos reales; borrar las puntuaciones de prueba con `execute_sql`; `npm run lint` y `npm run build`.

Reglas transversales: cambios de Supabase solo con `apply_migration`; `execute_sql` solo para lecturas y borrar puntuaciones de prueba; nunca la `service_role`; no se regeneran tipos (no hay cambio de esquema).

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos` muestra APILA con portada `.cover-apila` y acento amarillo.
- [ ] Sin puntuaciones, `/juegos/apila` muestra `Mejor puntuación 0`, `Partidas 0` y `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- [ ] `/juegos/apila/jugar` muestra la base, un bloque quieto de 300 px a la izquierda y `▸ PULSA ESPACIO_`; HUD `Puntuación 0`, `Vidas ♥`, `Nivel 01`.
- [ ] La primera pulsación de `Espacio` arranca el movimiento sin soltar; las siguientes sueltan un bloque cada una.
- [ ] Mantener `Espacio` pulsado suelta un solo bloque.
- [ ] En el nivel 1 el bloque recorre ~240 px/s y rebota en los bordes; en pisos pares arranca por la derecha.
- [ ] Soltar con un desfase de 20 px deja un bloque 20 px más estrecho, alineado con el borde que se solapa, y un fragmento de 20 px cae por el lado del corte.
- [ ] Soltar dentro de ±5 px no recorta y muestra `PERFECTO ×1`; la puntuación sube exactamente 35 en el nivel 1.
- [ ] Tres perfectas seguidas: la tercera ensancha el bloque 10 px (sin pasar de 300) con contorno cian y suma 85 en el nivel 1. Un recorte reinicia el combo.
- [ ] Tras el piso 10 el HUD muestra `Nivel 02` y el piso 11 suma 20 (sin perfecta).
- [ ] La velocidad no supera 600 px/s (nivel 13 en adelante).
- [ ] La cámara sube con la torre y el bloque móvil nunca queda por encima de `y = 300` de pantalla.
- [ ] Soltar sin solape (o con solape < 2 px) termina la partida: el bloque cae, HUD `Vidas —` y se abre `FIN DEL JUEGO` con la puntuación real.
- [ ] El canvas no pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`.
- [ ] `P`, `Esc` y el botón `PAUSA` congelan bloque, cámara y fragmentos; al reanudar el bloque no salta. Cambiar de pestaña pausa.
- [ ] `Espacio`, `↓`, `P` y `Esc` no desplazan la página.
- [ ] Escribir el nombre en el modal (incluido un espacio) no suelta bloques.
- [ ] Tras guardar, la fila aparece en el TOP 10 de `/juegos/apila` y en la pestaña `APILA` de `/salon`.
- [ ] `JUGAR DE NUEVO` vuelve a la base en espera con `Puntuación 0`, `Vidas ♥` y `Nivel 01`.
- [ ] Al salir y volver a entrar solo corre un bucle (velocidad del nivel 1 igual) y no quedan listeners.
- [ ] `select * from games where id = 'apila'` devuelve la fila con los textos de `GAMES`; `supabase/migrations/` coincide con `list_migrations`.
- [ ] Ningún archivo de `games/apila/` declara estado mutable en el nivel del módulo.
- [ ] La consola no muestra errores durante una partida completa.
- [ ] Las puntuaciones de prueba se borran al terminar.

---

## Casos límite

| Caso                                                                 | Comportamiento                                                                                                       |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Soltar exactamente en el rebote (`x = X_MIN`).                       | Se usa la `x` ya ajustada del frame; no hay posición fuera de `[X_MIN, X_RIGHT − w]`.                                |
| Un `dt` grande desplaza el bloque más allá del borde.                | Se refleja el exceso y se invierte `dir` (`MAX_DT = 0.05` limita el salto a 30 px a 600 px/s).                       |
| Bloque de 2–4 px de ancho.                                           | Sigue siendo jugable. La perfecta compara solo el desfase (±5 px), así que con bloques muy estrechos es algo más permisiva; es intencionado (rescate). |
| Recrecimiento que sacaría el bloque de `[X_MIN, 760]`.               | `grow` desplaza el bloque hacia dentro manteniendo el ancho nuevo.                                                   |
| Dos teclas de soltar en el mismo frame (`Space` + `Enter`).          | Cada `keydown` suelta como máximo un bloque por frame: se marca `dropRequested` y se procesa uno en el `update`.     |
| Pausa con fragmentos en el aire.                                     | Quedan congelados y continúan al reanudar.                                                                           |
| `restart()` durante la animación de fallo.                           | Se vacían fragmentos y destellos; la cámara vuelve a 0 sin interpolar.                                               |
| Puntuación teórica > 10.000.000.                                     | Se limita a `MAX_SCORE` antes de emitirla (CHECK de `scores`).                                                       |
| Torre de cientos de pisos.                                           | Solo se dibujan los bloques visibles; la lista puede recortarse a los últimos 40 sin afectar a la lógica.           |

---

## Decisiones

- **Sí:** 2D de perfil y una sola tecla. Se distingue de los apiladores comerciales 3D y es trivial de portar a táctil.
- **Sí:** soltar instantáneo (sin caída lógica). El timing depende solo del vaivén; la caída sería ruido.
- **Sí:** tolerancia de perfecta ±5 px y recrecimiento desde la 3.ª perfecta seguida. Da techo de habilidad alto sin que la torre sea infinita para jugadores medios.
- **No:** recrecer en cada perfecta (haría la partida casi infinita para jugadores expertos).
- **Sí:** nivel cada 10 pisos, 240 px/s base, +30 por nivel, tope 600.
- **Sí:** 10 × nivel por piso + 25 × combo por perfecta (combo tope 10). La puntuación separa a los que sobreviven a velocidad alta y a los que encadenan perfectas.
- **Sí:** 1 vida (`♥` → `—`), sin E1.
- **Sí:** `yellow`, porque ningún motor real lo usa y las notas del lote recomiendan repartirlo.
- **Sí:** lógica pura en `stack.ts`, reutilizable por la variante GRÚA.
- **No:** ratón en esta spec; el pad táctil va con `mobile-porter`.

---

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                                   |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Space` desplaza la página o activa un botón enfocado del HUD.                               | `preventDefault()` en las teclas del juego; el foco del documento no debe quedar en botones tras pulsar `PAUSA`. |
| Catálogo prerenderizado sin APILA por `.next/cache/fetch-cache`.                             | Paso 5: borrar el fetch-cache y comprobar `juegos.html`.                                                     |
| Strict Mode monta el efecto dos veces y crea dos bucles.                                     | `destroy()` cancela el rAF y quita el listener; criterio de velocidad tras volver a entrar.                  |
| `GAMES` tiene hoy **dos** entradas con `id: "ranaria"` (la real y la simulada antigua).      | Fuera de alcance; se inserta APILA tras la primera. Se recomienda una spec aparte para quitar la duplicada.  |
| Parecido con apiladores comerciales.                                                         | Perfil 2D, reglas de combo/recrecimiento y niveles propios; nombre y arte originales.                        |
| Sin código de referencia, una regla queda ambigua.                                           | Las constantes de esta spec son la única fuente; si falta algo, se pregunta.                                 |

---

## Lo que **no** está en esta spec

- La variante GRÚA (spec 02 de este directorio).
- Sonido, imágenes, skins y pad táctil.
- Ratón, power-ups, más vidas y E1.
- Cambios de esquema o de `saveScoreAction`.
- La limpieza de la entrada `ranaria` duplicada.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
