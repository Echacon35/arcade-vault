# Juegos con skins

Referencia de qué juegos tienen skins (temas visuales). La mantiene el agente `skin-designer` (`.claude/agents/skin-designer.md`): la lee al empezar y la actualiza al terminar.

**Skins obligatorias:** `neon` (NEÓN), `retro` (RETRO), `clasico` (CLÁSICO) y `pastel` (PASTEL).

**Extensión E4 (infraestructura de skins):** aplicada el 2026-11-11 (con ASTEROIDES): `SkinId`/`GameOptions`/`setSkin?` en `games/types.ts`, `games/shared/skins.ts`, `GAME_SKINS` en `games/registry.ts`, prop `skin` en `GameCanvas` y selector `SKIN` en `GamePlayer` (velo de pausa a `bg-black/80` con `pastel`). Documentada en `.claude/skills/add-game/contract.md`.

El código manda: si esta tabla no coincide con `games/<id>/skins.ts` y `GAME_SKINS` de `games/registry.ts`, se corrige la tabla.

## Estado por juego

Estados: `pendiente` (sin skins), `parcial` (faltan skins obligatorias), `completo` (las cuatro).

| Fecha      | ID           | Título     | Skins presentes | Estado    | Notas                                               |
| ---------- | ------------ | ---------- | --------------- | --------- | --------------------------------------------------- |
| 2026-11-11 | `asteroides` | ASTEROIDES | neon, retro, clasico, pastel | completo | Vectorial, sin sprites. RETRO pixelado a 400×300 offscreen. |
| 2026-11-11 | `tetra`      | TETRA      | —               | pendiente | Paleta neón actual en `constants.ts`.               |
| 2026-11-11 | `rebote`     | REBOTE     | neon, retro, clasico, pastel | completo | Sprites (E2) solo en NEÓN; RETRO/CLÁSICO/PASTEL vectoriales. RETRO pixelado a 400×300. Verificado en Playwright (2026-11-11). |
| 2026-11-11 | `viborita`   | VIBORITA   | neon, retro, clasico, pastel | completo | Vectorial, sin sprites. RETRO con manzana pixel-art 7×7. Verificado en Playwright (2026-11-11). |
| 2026-11-12 | `ranaria`    | RANARIA    | neon, retro, clasico, pastel | completo | Vectorial, sin sprites. RETRO pixelado a 400×300. Verificado en Playwright, lint y build (2026-11-12). |

## Notas por juego

Detalle de decisiones por juego (sprites, brillo, fuentes, contraste de PASTEL) cuando aporte.

### `asteroides` (2026-11-11)

- Skins en `games/asteroides/skins.ts`; `COLORS` de `constants.ts` es alias de `SKINS.neon.palette`. Claves añadidas a la paleta neón: `shipFill`, `asteroidFill`, `bulletStroke`, `powerUpFill`, `powerUpText`, `flameFill` (`transparent` en neón/clásico) y `hudText`.
- **NEÓN:** paleta original de la SPEC 05 (cian, tinta, amarillo `#f5ff00`, magenta) + `shadowBlur` 8 en piezas y texto. Decisión: el brillo es nuevo respecto al motor anterior, que no tenía; poner `glow: 0` para volver al aspecto exacto previo.
- **RETRO:** fondo `#0f380f`, rocas rellenas `#306230` con borde `#8bac0f`, nave y balas `#9bbc0f`, balas cuadradas. El mundo se dibuja en un canvas offscreen de 400×300 (creado en la factory) y se escala con `imageSmoothingEnabled = false`. El texto (`3x`, temporizador) se dibuja después a resolución completa en `Press Start 2P`. Sin rejilla.
- **CLÁSICO:** blanco/gris `#c8c8c8`, único acento ámbar `#ffb000` (power-up y HUD), trazo 1 px, sin brillo, uniones en ángulo.
- **PASTEL:** fondo `#fff6e9`; nave menta, rocas lavanda, balas celeste (radio visual 3.5, la colisión es por punto), power-up rosa, llama mantequilla; contorno ciruela `#4a3b5c` de 2 px. Texto ciruela (9.4:1 sobre crema; 6:1 sobre el rombo rosa).
- Sin verificar visualmente: el texto `3x` del HUD en RETRO/CLÁSICO (no salió el power-up en esas skins durante la prueba).

### `rebote` (2026-11-11)

- Skins en `games/rebote/skins.ts`; `COLORS` de `constants.ts` es alias de `SKINS.neon.palette` (mantiene `background`/`loading`/`error`; antes `bg`). Claves vectoriales: `paddle`, `paddleAccent`, `ball`, `outline`, `blockHighlight`, `glow` y un color por `BlockColor` (`blockGray` … `blockGreen`, vía `BLOCK_PALETTE_KEY`). Flag `sprites` en la skin.
- **Sprites (E2): decisión vectorial, no tinte.** El spritesheet tiene 6 colores de bloque con bisel, paleta plateada con franjas rojas y 4 frames de explosión: teñirlo con `source-in` lo deja en siluetas planas casi iguales entre filas y no admite el contorno de 2 px ni las esquinas redondeadas de PASTEL. En vectorial cada skin controla el color de cada fila. La imagen se sigue cargando en todas las skins (la fase `loading` depende de ella y hace falta para volver a NEÓN en caliente).
- **NEÓN:** spritesheet original sin cambios + `shadowBlur` 10 cian solo en paleta y pelota (nuevo; `glow: 0` vuelve al aspecto exacto previo). Carga cian, error magenta, como la SPEC 08.
- **RETRO:** fondo `#0f380f`; bloques rellenos `#9bbc0f`/`#8bac0f`/`#306230` según color, hueco de 2 px y filo superior `#9bbc0f`; paleta `#9bbc0f` con topes `#306230`; pelota `#9bbc0f`. Mundo en canvas offscreen 400×300 escalado sin suavizado (explosión en 4 frames: el bloque se parte en cuartos). Mensajes en `Press Start 2P` 16 px a resolución completa (~6:1). Sin rejilla.
- **CLÁSICO:** escala de grises plana por fila (`#ffffff` → `#5f5f5f`), pelota cuadrada blanca, único acento ámbar `#ffb000` en la paleta y el texto de error; sin brillo ni contorno.
- **PASTEL:** fondo `#fff6e9`; bloques rosa/mantequilla/celeste/lavanda/melocotón `#ffc9a8`/menta/gris lavanda `#ddd5e3` con esquinas de 6 px; paleta celeste en píldora; pelota rosa; contorno ciruela `#4a3b5c` de 2 px en todo. Carga ciruela (9.4:1), error `#a3123f` (~7:1).
- Pendiente de verificación visual (Playwright) y de `npm run build` (solo se pasaron `lint` y `tsc`). En RETRO, filas `#9bbc0f` y `#8bac0f` contiguas se parecen mucho.

### `viborita` (2026-11-11)

- Skins en `games/viborita/skins.ts`; `COLORS` de `constants.ts` es alias de `SKINS.neon.palette`. Claves añadidas: `snakeStroke`, `fruitStroke` (`transparent` salvo en pastel) y `stem` (antes el tallo usaba `leaf`). Brillo por pieza en `glow` (`snake`/`fruit`/`leaf`/`hint`), igual que el motor original en NEÓN.
- **NEÓN:** paleta exacta de la SPEC 09, mismo aspecto que antes.
- **RETRO:** fondo `#0f380f`, rejilla `#306230` al 55 %, cuerpo `#8bac0f`, cabeza `#9bbc0f`, ojos cuadrados 4×4 `#0f380f`. La fruta es una manzana pixel-art 7×7 (píxeles de 3 px) en `#9bbc0f` con tallo/hoja `#8bac0f`: se distingue de la serpiente por la forma. Aviso en `Press Start 2P` 14 px (~6:1). Sin offscreen: las piezas ya son rectángulos alineados a la rejilla.
- **CLÁSICO:** cuerpo `#c8c8c8`, cabeza blanca, rejilla blanca al 6 %, único acento rojo plano `#ff3b30` en la fruta, tallo y hoja gris `#a0a0a0`, aviso blanco.
- **PASTEL:** fondo `#fff6e9`, cuerpo menta, cabeza celeste, fruta rosa, hoja menta; contorno ciruela `#4a3b5c` de 2 px en segmentos y fruta (1.5 px en la hoja), segmentos con esquinas de 5 px, ojos y aviso ciruela en negrita (9.4:1).
- Pendiente de verificación visual (Playwright) y de `npm run build`: quedaron para una pasada aparte (solo se pasaron `lint` y `tsc`).

### `ranaria` (2026-11-12)

- Skins en `games/ranaria/skins.ts`; `COLORS` de `constants.ts` es alias de `SKINS.neon.palette`. El array `carColors` pasa a claves `car0`/`car1`/`car2` (por `Entity.variant`); claves añadidas: `windshield` (antes `bg`), `frogDeadStroke` y `outline` (`transparent` en neón/clásico). Flags: `glow` por grupo (`vehicle`/`frog`/`goal`/`time`/`hint`), `outlineWidth`, `lineWidth`, `cornerRadius`, `pixelated`, `timeFont`, `hintFont`.
- **NEÓN:** paleta exacta de la spec y mismo aspecto que el motor original (mismos `shadowBlur`, trazos y radios).
- **RETRO:** mundo (fondo, barra y tablero) en canvas offscreen 400×300 creado en la factory y escalado sin suavizado; textos (`TIEMPO`, aviso) a resolución completa en `Press Start 2P` (6:1 y 5:1). Carretera `#0f380f`, río `#306230`, filas seguras `#8bac0f`, troncos/tortugas `#8bac0f`, coches `#9bbc0f`/`#8bac0f`, rana `#9bbc0f`; contorno `#0f380f` de 2 px en todas las piezas y también en las patas de la rana (si no, desaparecen sobre la fila segura). Rana muerta `#0f380f` con contorno claro. Tortugas sumergidas en anillo discontinuo. La barra solo distingue 2 tonos (aviso y peligro comparten `#8bac0f`).
- **CLÁSICO:** grises, coches blanco/`#c8c8c8`/`#a0a0a0`, único acento verde `#00d84a` en la rana y bocas ocupadas; trazo 1 px, esquinas rectas, sin brillo. La rana muerta es blanca (se confunde algo con un coche durante los 600 ms).
- **PASTEL:** fondo `#fff6e9`, carretera `#ebe3ee`, río `#cfe8ff`, filas seguras mantequilla, muro lavanda; coches rosa/lavanda/celeste, camión mantequilla con cabina melocotón, troncos `#e6c4a3`, tortugas `#ffd6a5`, rana menta; contorno ciruela `#4a3b5c` de 2 px, esquinas 8 px. Textos ciruela (9.5:1 sobre crema, 8.8:1 sobre la fila segura). Velo de pausa `bg-black/80` verificado.
