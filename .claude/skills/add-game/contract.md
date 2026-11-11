# Contrato de motor y extensiones permitidas

Antes de escribir una spec, comprueba que lo que dice este archivo sigue coincidiendo con el código. Si el código cambió, manda el código y avisa al usuario.

---

## Contrato actual

### `games/types.ts`

```ts
export type GameStats = { score: number; lives: number; level: number };

export type GameCallbacks = {
  onStats: (stats: GameStats) => void; // solo cuando cambia algún valor
  onGameOver: (finalScore: number) => void;
  onPauseToggle: () => void; // P / Esc dentro del juego
};

export type SkinId = "neon" | "retro" | "clasico" | "pastel"; // E4
export type GameOptions = { skin?: SkinId }; // E4

export type GameInstance = {
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
  setSkin?(skin: SkinId): void; // E4, opcional
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions, // E4, opcional
) => GameInstance;
```

### `games/registry.ts`

`GAME_ENGINES: Partial<Record<string, GameFactory>>`, indexado por el `id` del catálogo. Un juego sin motor usa la partida simulada de `GamePlayer`.

`GAME_SKINS: Partial<Record<string, readonly SkinId[]>>` (E4): skins que soporta cada motor. Sin entrada, no hay selector de skin.

### `components/game-canvas.tsx`

- `<canvas width={800} height={600}>` escalado por CSS al 100 % de `.crt-screen`, que es 4:3.
- Crea la instancia en un `useEffect` y llama a `destroy()` en el cleanup. El doble montaje del Strict Mode queda limpio.
- Traduce `paused || over` a `pause()`/`resume()` y expone `restart()` al padre.

### `components/game-player.tsx`

- **HUD de React:** `Jugador`, `Puntuación`, `Vidas` (`"♥ ".repeat(lives)` o `—`) y `Nivel` (dos dígitos).
- **Botones:** `PAUSA`/`REANUDAR`, `FIN` (abandona sin guardar) y `SALIR`.
- **Pausa automática:** con `visibilitychange`.
- **Overlay `EN PAUSA`:** dentro del CRT.
- **Modal `FIN DEL JUEGO`:**
  - Muestra la puntuación final y el campo de nombre (mayúsculas, máximo 10).
  - `GUARDAR PUNTUACIÓN` llama a `saveScoreAction` y pasa por `GUARDANDO…`, `PUNTUACIÓN GUARDADA` o `▸ NO SE PUDO GUARDAR — REINTENTA_`.
  - Botones `JUGAR DE NUEVO` y `VOLVER AL VAULT`.
- **Validación del nombre:** `saveScoreAction` y el CHECK de `scores` exigen `^[A-Z0-9_]{1,10}$` y una puntuación entera entre 0 y 10.000.000.

---

## Reglas sin cambio de plataforma

Estas situaciones **no** necesitan extensión: se resuelven dentro del motor del juego.

- **Canvas de 800×600 siempre.** Un área de juego que no es 4:3 se dibuja centrada; por ejemplo, Tetris de 10×20 con bloques de 30 px ocupa 300×600. Los paneles auxiliares del original (siguiente pieza, líneas, nivel del tablero) se dibujan **dentro** del canvas, en los márgenes laterales.
- **Ratón.** Listeners en el propio `canvas`, nunca en `document`. Las coordenadas se convierten al espacio lógico: `x = (e.clientX - rect.left) * (800 / rect.width)`, e igual para `y`. Se quitan en `destroy()`. Cuando el original usa ratón y teclado a la vez, se mantienen los dos.
- **Sin UI DOM propia.** Los botones, paneles y temas del `index.html` original no se portan, y el reinicio y la pausa los da `GamePlayer`.
- **Sin `localStorage`.** Las preferencias del original (por ejemplo, el tema claro u oscuro de Tetris) se descartan. Las puntuaciones van a Supabase.
- **Estadísticas extra.** El HUD de React solo tiene puntuación, vidas y nivel. Cualquier otra cifra (líneas, combo) se dibuja en el canvas o se descarta.
- **Velocidad por nivel.** Si el original acelera con el nivel (la caída de Tetris), el motor emite `level` en `onStats` como hace ASTEROIDES.

---

## Extensiones permitidas

Cada extensión es un **paso propio al principio del plan** de la spec. Debe dejar ASTEROIDES igual y `npm run build` pasando. Si un juego ya integrado aplicó una extensión, el siguiente juego la reutiliza sin repetirla. Antes de incluirla en la spec, comprueba en el código si ya existe.

### E1 — Vidas opcionales

**Cuándo hace falta:** juegos sin vidas, como Tetris.

**Cambios:**

- `games/types.ts`: `GameStats.lives` pasa de `number` a `number | null`.
- `components/game-player.tsx`:
  - El estado `lives` pasa a `number | null`.
  - El HUD muestra `—` cuando es `null`; hoy `"♥ ".repeat(lives).trim() || "—"` ya da `—` con 0, pero el tipo debe admitir `null` de forma explícita.
  - `restart()` vuelve al valor inicial que dicte el motor: el `onStats` que emite `restart()` lo corrige.
- `games/asteroides/engine.ts` no cambia: sigue emitiendo un número.

**Criterio:** ASTEROIDES muestra `♥ ♥ ♥` como antes, y el juego sin vidas muestra `—`.

### E2 — Assets estáticos

**Cuándo hace falta:** spritesheets, imágenes o fuentes, como el `spritesheet-breakout.png` de Arkanoid.

**Cambios:**

- Se copian a `public/games/<id>/…`. La carpeta `public/` no existe todavía: la crea la primera spec que lo necesite.
- Se cargan dentro de la factory con `new Image()` (`src = "/games/<id>/…"`), **nunca** al importar el módulo.
- El motor no arranca el bucle de juego hasta que cargan. Mientras tanto dibuja `CARGANDO…` en el canvas con la paleta neón. Si falla la carga, dibuja `▸ SEÑAL PERDIDA — REINTENTA_` y no emite `onGameOver`.
- Las coordenadas de los sprites (por ejemplo `spritesheet.js`) se portan a `games/<id>/sprites.ts`, tipadas.

**Criterio:** la consola no muestra 404 de assets, y `destroy()` durante la carga no deja el bucle vivo.

### E3 — Sonido

**Cuándo hace falta:** efectos de sonido, como `ball-bounce.mp3` y `break-sound.mp3` de Arkanoid.

**Cambios:**

- Los ficheros se copian a `public/games/<id>/sounds/…`, lo que también aplica E2 para la carpeta.
- Se crean con `new Audio("/games/<id>/sounds/…")` dentro de la factory.
- No suenan antes del primer gesto del usuario: se ignora el rechazo de `play()` con `.catch(() => {})`.
- `pause()` y `destroy()` paran cualquier sonido en curso, y `destroy()` libera las referencias.
- No hay control de volumen ni silencio en la interfaz: queda fuera de alcance salvo que el usuario lo pida en su propia spec.

**Criterio:** al pausar o al salir con `SALIR` no queda ningún sonido sonando.

### E4 — Skins (temas visuales)

**Cuándo hace falta:** siempre que un juego con motor reciba skins. La aplica el agente `skin-designer` (`.claude/agents/skin-designer.md`) juego a juego; su registro está en `references/games-with-themes.md`. **Ya está aplicada en la plataforma** (primera vez con ASTEROIDES): los juegos nuevos solo añaden sus skins.

**Infraestructura (compartida):**

- `games/types.ts`: `SkinId` (`neon`, `retro`, `clasico`, `pastel`), `GameOptions = { skin?: SkinId }`, tercer parámetro opcional `options` en `GameFactory` y método opcional `setSkin?(skin)` en `GameInstance`. Los motores sin skins compilan sin cambios.
- `games/shared/skins.ts`: `SKIN_IDS`, `DEFAULT_SKIN = "neon"`, `SKIN_LABELS` (`NEÓN`, `RETRO`, `CLÁSICO`, `PASTEL`), `SKIN_SWATCHES` (muestra del selector) e `isSkinId`.
- `games/registry.ts`: `GAME_SKINS`.
- `components/game-canvas.tsx`: prop `skin`; se pasa en `options` al crear la instancia (sin ser dependencia del efecto, para no reiniciar) y un efecto aparte llama a `instance.setSkin?.(skin)` cuando cambia.
- `components/game-player.tsx`: selector `SKIN` entre el HUD y `PAUSA`/`FIN`/`SALIR`, solo si `GAME_SKINS[game.id]` existe. Arranca en `DEFAULT_SKIN`, se conserva en `JUGAR DE NUEVO`, y sus botones no toman el foco (`onMouseDown` con `preventDefault`) para que flechas y espacio sigan llegando al juego. Con `pastel` el velo de `EN PAUSA` pasa de `bg-black/60` a `bg-black/80`.

**Por juego:**

- `games/<id>/skins.ts` con `SKINS: Record<SkinId, Skin>`; `Skin` lleva la paleta (mismas claves en las cuatro, derivadas de la neón) y flags de estilo (brillo, trazo, fuentes, pixelado…).
- `COLORS` de `constants.ts` queda como alias de `SKINS.neon.palette`.
- El motor lee `SKINS[options?.skin ?? DEFAULT_SKIN]`; ningún color, `shadowBlur`, `lineWidth` ni fuente literal fuera de `skins.ts`. `setSkin` reasigna la skin y redibuja si el bucle está parado.
- Sprites (E2): `neon` usa los originales; las demás dibujan vectores o tiñen en un canvas offscreen creado dentro de la factory.
- Se añade el `id` a `GAME_SKINS`.

**Criterio:** cambiar de skin en mitad de la partida (también en pausa) no reinicia ni altera puntuación, vidas, nivel ni posiciones; los juegos fuera de `GAME_SKINS` se ven y juegan igual y sin selector.

---

## Fuera del contrato (requiere spec de plataforma)

Si el juego necesita algo de esta lista, la spec del juego lo deja en "Fuera de alcance" con la nota "requiere spec de plataforma". La alternativa es adaptar la parte afectada sin cambiar la mecánica, siempre con la decisión explícita del usuario.

- **Canvas de otro tamaño o proporción**, o resolución HiDPI.
- **Más indicadores en el HUD de React** además de puntuación, vidas y nivel.
- **Varios jugadores**, local o en línea.
- **Controles táctiles** o gamepad.
- **Guardar partidas** a medias.
- **Puntuaciones con datos extra** (líneas, tiempo) en `scores`, porque requieren cambiar el esquema.
- **Control de volumen o silencio.**
- **Más de una pantalla** fuera del canvas (menús propios, selector de nivel).
