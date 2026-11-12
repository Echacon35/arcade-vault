# Sugerencias de juegos (memoria de `game-planner`)

Registro que mantiene el agente `game-planner` (`.claude/agents/game-planner.md`). Cada idea propuesta queda aquí con su estado para no repetir sugerencias.

Estados: `sugerido` · `elegido` · `descartado` · `en-spec` · `implementado`.

## Sugerencias

| Fecha      | ID           | Título     | Categoría | Puntuación | Estado       | Motivo / notas               |
| ---------- | ------------ | ---------- | --------- | ---------- | ------------ | ---------------------------- |
| —          | `asteroides` | ASTEROIDES | SHOOTER   | —          | implementado | SPEC 05, previo a la memoria |
| —          | `tetra`      | TETRA      | PUZZLE    | —          | implementado | SPEC 07, previo a la memoria |
| —          | `rebote`     | REBOTE     | ARCADE    | —          | implementado | SPEC 08, previo a la memoria |
| —          | `viborita`   | VIBORITA   | ARCADE    | —          | implementado | SPEC 09, previo a la memoria |
| 2026-11-11 | `ranaria`    | RANARIA    | ARCADE    | 28/30      | implementado | Spec de game jam `specs/game-jam/frogger/01-frogger-core.md`; migración `add_game_ranaria` (2026-11-12) |
| 2026-11-11 | `invasores`  | INVASORES  | SHOOTER   | 25/30      | sugerido     | Alternativa: shooter fijo por oleadas; barato y competitivo, pero repite categoría SHOOTER |
| 2026-11-11 | `gloton`     | GLOTÓN     | ARCADE    | 25/30      | sugerido     | Alternativa: laberinto con perseguidores; muy competitivo, pero coste alto (IA de 4 espectros + laberinto) |
| 2026-11-11 | `enjambre`   | ENJAMBRE   | SHOOTER   | 29/30      | sugerido     | Twin-stick con teclado (WASD mueve, flechas disparan) en arena; multiplicador por gemas. Riesgo: ghosting de teclas |
| 2026-11-11 | `baluarte`   | BALUARTE   | SHOOTER   | 28/30      | sugerido     | Defensa antimisiles: mira con flechas, 3 torretas, explosiones en cadena. Muy barato. Duda: ¿ratón? |
| 2026-11-11 | `tormenta`   | TORMENTA   | SHOOTER   | 27/30      | sugerido     | Shmup vertical con foco lento, cadena ×1–×8 y jefes cada 5 oleadas. Coste medio (pool de balas) |
| 2026-11-11 | `vortice`    | VÓRTICE    | SHOOTER   | 25/30      | sugerido     | Shooter de túnel pseudo-3D por carriles. Coste alto; geometrías propias para no copiar a un comercial |
| 2026-11-11 | `caverna`    | CAVERNA    | SHOOTER   | 23/30      | sugerido     | Scroll horizontal en cueva procedural con semilla; combustible y bombas. Riesgo: pasos imposibles |
| 2026-11-11 | `inverso`    | INVERSO    | ARCADE    | 28/30      | sugerido     | Runner con inversión de gravedad suelo/techo; distancia + orbes. 1 vida (lives 1/0) |
| 2026-11-11 | `orbita`     | ÓRBITA     | ARCADE    | 28/30      | sugerido     | Girar alrededor de un núcleo y pasar por huecos de anillos que se cierran; puntos por centésimas. Propuesto como `vortice`, renombrado por choque de id. Riesgo: parecido a un comercial |
| 2026-11-11 | `apila`      | APILA      | ARCADE    | 27/30      | sugerido     | Apilar bloques con recorte; perfectas y combo. El más barato del lote |
| 2026-11-11 | `descenso`   | DESCENSO   | ARCADE    | 26/30      | sugerido     | Bajar entre plataformas que suben con techo de pinchos; plataformas especiales. 3 vidas |
| 2026-11-11 | `pendulo`    | PÉNDULO    | ARCADE    | 24/30      | sugerido     | Balanceo con cuerda entre anclajes. Física delicada; el más original y arriesgado |
| 2026-11-11 | `burbujas`   | BURBUJAS   | PUZZLE    | 27/30      | sugerido     | Lanzador de burbujas en rejilla hexagonal, grupos de 3+, caídas en cadena. Riesgo: precisión del encaje |
| 2026-11-11 | `cristales`  | CRISTALES  | PUZZLE    | 27/30      | sugerido     | Match-3 8×8 contrarreloj con cascadas. Barato; sin vidas (lives 1/0) |
| 2026-11-11 | `eco`        | ECO        | PUZZLE    | 26/30      | sugerido     | Memoria de secuencias en 4 paneles; 3 vidas. Muy barato; poca dispersión de puntuaciones |
| 2026-11-11 | `gotas`      | GOTAS      | PUZZLE    | 25/30      | sugerido     | Parejas de gotas que revientan en grupos de 4+ con cadenas. Se parece a "bloques que caen" junto a TETRA |
| 2026-11-11 | `caneria`    | CAÑERÍA    | PUZZLE    | 24/30      | sugerido     | Construir tubería antes de que llegue el flujo; 3 vidas. Riesgo: cola de piezas injusta |
| 2026-11-11 | `estiba`     | ESTIBA     | PUZZLE    | ~20/30     | descartado   | Empuje de cajas: niveles fijos compiten mal; procedural es caro |
| 2026-11-11 | `turbo-ruta` | TURBO RUTA | ARCADE*   | 28/30      | sugerido     | Carrera vertical por carriles con combustible y bonus por rozar. *Categoría ideal CARRERAS (no existe en `GameCategory`) |
| 2026-11-11 | `pulso`      | PULSO      | ARCADE*   | 27/30      | sugerido     | Ritmo en 4 columnas, combo ×1–×8, barra de energía (lives 1/0). *Ideal RITMO. Riesgo: precisión de timing |
| 2026-11-11 | `anzuelo`    | ANZUELO    | ARCADE*   | 27/30      | sugerido     | Pesca por capas de profundidad, peligros que cortan la línea; 3 líneas. *Ideal DEPORTES |
| 2026-11-11 | `hoyo-neon`  | HOYO NEÓN  | ARCADE*   | 24/30      | sugerido     | Minigolf cenital de 9 hoyos propios. Coste medio-alto; techo de puntuación bajo con hoyos fijos |
| 2026-11-11 | `bastion`    | BASTIÓN    | ARCADE*   | 23/30      | sugerido     | Tower defense ligero con oleadas infinitas. Coste alto; riesgo de balance |

## Notas por idea

### Lote de 20 (2026-11-11, cuatro agentes en paralelo por nicho)

- Todas van por `/spec` (no hay código en `references/started-games/`).
- `GameCategory` solo admite `ARCADE | PUZZLE | SHOOTER | VERSUS`: las marcadas `ARCADE*` necesitarían ampliar el tipo y el filtro de `/juegos` (y revisar la columna en Supabase) si se quiere su categoría propia.
- Varias no tienen vidas (inverso, cristales, gotas, burbujas, pulso): emiten `lives` 1/0 mientras E1 no esté aplicada; valorar aplicar E1 antes.
- Colores: `yellow` no lo usa ningún motor; repartirlo entre las nuevas para no saturar `green`.

### `ranaria` — RANARIA (sugerido 2026-11-11, implementado 2026-11-12)

- Ya existe como entrada simulada en `lib/games.ts` (`cover-rana`, color `green`) y probablemente en la tabla `games`: la spec daría motor real a una entrada existente en lugar de crear una nueva. Verificar la fila en Supabase.
- Mecánica: rejilla de 13 columnas × 13 filas (celdas de ~48 px, centrada en 800×600). Mitad inferior, carretera con 5 carriles de vehículos; mitad superior, río con troncos y tortugas que se sumergen; arriba, 5 nenúfares. Salto de una celda por pulsación (flechas/WASD), sin repetición automática.
- Puntuación propuesta: +10 por cada fila nueva alcanzada en la vida actual; +50 por nenúfar; bonus de tiempo restante (×10 por segundo); +1000 al llenar los 5 nenúfares (sube el nivel, velocidad de carriles +10 %). 3 vidas; temporizador por vida de ~30 s dibujado en el canvas.
- Riesgos: el arrastre sobre troncos y la salida por los bordes; el input por pulsación debe ignorar `keydown` repetido (`e.repeat`); color: los tres implementados con verde son ya dos (TETRA, VIBORITA), valorar pasar a `yellow` (no lo usa ningún juego con motor).

### `invasores` — INVASORES (sugerido 2026-11-11)

- Entrada simulada existente. Formación de 5×11 que avanza y baja, cañón horizontal, escudos destructibles, nave bonus. Puntuación por tipo de alien y oleadas sin fin con más velocidad. Coste bajo; poca variedad frente a ASTEROIDES.

### `gloton` — GLOTÓN (sugerido 2026-11-11)

- Entrada simulada existente. Laberinto en rejilla, puntos, píldoras de poder y 4 perseguidores con comportamientos distintos. Muy competitivo (combo de espectros), pero la IA y el diseño del laberinto lo hacen el más caro; único que usaría `yellow` sin cambiar el catálogo.
