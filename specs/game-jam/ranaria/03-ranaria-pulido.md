# SPEC GJ ranaria 03 — Pulido de ranaria

> **Estado:** Borrador
> **Tema:** RANARIA (id `ranaria`): cruce por carriles con timing; mecánica nueva en el catálogo; da motor real a la entrada simulada existente en `lib/games.ts`
> **Depende de:** SPEC GJ ranaria 02 (`specs/game-jam/ranaria/02-ranaria-integracion.md`)
> **Fecha:** 2026-11-11
> **Objetivo:** Dar a RANARIA respuesta sonora y visual a cada salto, captura, cruce y muerte, para que el timing se sienta además de verse, sin cambiar su mecánica ni su puntuación.

---

## Por qué existe esta spec

Tras la spec 02, RANARIA se juega y compite, pero es muda y sus eventos clave se leen solo con la vista: el aviso del cable depende de un parpadeo, la subida del multiplicador es un número que cambia en la franja y la muerte es un anillo. En un juego de timing, oír el zumbido del cable antes de la descarga y sentir cada salto ayuda a jugar «a ritmo». Se separa del motor porque es prescindible: se puede posponer o descartar sin tocar el leaderboard.

---

## Alcance

**Dentro:**

- **Sonido (E3):** la extensión ya la aplicó REBOTE (`games/rebote/sounds.ts`, `public/games/rebote/sounds/`), así que solo se reutiliza el patrón:

  | Método      | Evento                                                                                             | Archivo                                   |
  | ----------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- |
  | `hop()`     | La rana empieza un salto.                                                                          | `public/games/ranaria/sounds/hop.wav`     |
  | `firefly()` | Se atrapa una luciérnaga (un solo sonido; el tono no depende del multiplicador).                   | `public/games/ranaria/sounds/firefly.wav` |
  | `cross()`   | Se completa un cruce (1.º y 2.º del nivel).                                                        | `public/games/ranaria/sounds/cross.wav`   |
  | `swamp()`   | Se completa el tercer cruce y empieza `▸ NUEVO PANTANO_` (sustituye a `cross()` en ese cruce).     | `public/games/ranaria/sounds/swamp.wav`   |
  | `hum()`     | Un cable entra en la fase de aviso con la rana a 2 filas o menos de él; una vez por ciclo y cable. | `public/games/ranaria/sounds/hum.wav`     |
  | `splat()`   | Muerte por rayo, descarga o reloj agotado.                                                         | `public/games/ranaria/sounds/splat.wav`   |
  | `splash()`  | Muerte por hundirse o por ser arrastrada fuera del canvas.                                         | `public/games/ranaria/sounds/splash.wav`  |
  | `extra()`   | Se gana una vida extra.                                                                            | `public/games/ranaria/sounds/extra.wav`   |
  - Origen de los archivos: generados con jsfxr (`sfxr.me`, herramienta libre en el navegador) y exportados en WAV mono a 22 050 Hz, de menos de 1 s y menos de 50 KB cada uno. Son sonidos sintetizados propios, sin muestras de terceros. Presets de partida: `hop` = "Jump" muy corto; `firefly` = "Pickup/Coin" agudo; `cross` = "Powerup" corto; `swamp` = "Powerup" largo; `hum` = "Blip/Select" grave con vibrato; `splat` = "Hit/Hurt"; `splash` = "Explosion" con mucho ruido y caída de tono; `extra` = "Powerup" con arpegio.
  - Creados con `new Audio()` dentro de la factory, con clones solapables (`cloneNode()`) y `.catch(() => {})`, como `games/rebote/sounds.ts`; `pause()` y `destroy()` los paran.

- **Efectos en el canvas:**
  - **Estela de salto:** durante cada salto, 3 copias de la silueta de la rana en `COLORS.frog` con opacidad 0.35, 0.2 y 0.1 en las posiciones de los 3 frames anteriores. Desaparece al aterrizar.
  - **Chispas de luciérnaga:** al atrapar una, 10 chispas lima `#b6ff3b` de 2 px que salen en círculo a 140 px/s y duran 450 ms, y el texto flotante `×N` (el multiplicador nuevo) en cian `#00f5ff`, `16px monospace`, que sube 30 px y se desvanece en 600 ms.
  - **Salpicadura:** al hundirse o ser arrastrada, 12 gotas cian `#00f5ff` de 2–3 px que salen hacia arriba en abanico de 120° a 160 px/s, con gravedad de 500 px/s², durante 600 ms. Se dibujan además del anillo de muerte de la spec 01.
  - **Chispazo:** al morir por rayo o por descarga, 14 chispas tinta `#e6e9ff` y magenta `#ff006e` (alternas) a 220 px/s durante 350 ms.
  - **Destello de cruce:** al completar un cruce, la línea de meta de la orilla alcanzada se ensancha de 2 a 8 px y se desvanece en 400 ms, en amarillo `#f5ff00`.
  - **Barrido de pantano nuevo:** durante `transition`, una franja vertical cian de 6 px con glow barre la rejilla de izquierda a derecha en los 1.2 s de la fase.
  - **Sacudida:** al perder una vida, desplazamiento aleatorio del dibujo de la rejilla de hasta 5 px que decrece linealmente a 0 en 250 ms. Solo afecta a `ctx.translate` del dibujo; la lógica y las colisiones no se mueven. La franja de indicadores no tiembla.
  - Tope global `MAX_PARTICLES = 100` partículas efímeras; si se alcanza, las nuevas no se crean. Las partículas se dibujan sin `shadowBlur`.
- Ningún cambio en las constantes de mecánica, en la puntuación ni en `onStats`.

**Fuera de alcance (para futuras specs):**

- Control de volumen o silencio: requiere spec de plataforma.
- Música de fondo o ambiente de pantano en bucle (ranas, grillos).
- Tono del sonido de luciérnaga que sube con el multiplicador (requeriría 5 archivos o Web Audio).
- Cambios de mecánica, puntuación o dificultad.
- Niebla animada, reflejos en la ciénaga y lluvia.
- Tests automatizados.

---

## Modelo de datos

```ts
// games/ranaria/fx.ts — sin estado de módulo
export type Particle = {
  x: number; // px
  y: number; // px
  vx: number; // px/s
  vy: number; // px/s
  g: number; // px/s², gravedad (0 si no cae)
  r: number; // px
  life: number; // s restantes
  maxLife: number; // s totales, para el desvanecido
  color: string; // de COLORS
};
export type FloatText = {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
};
export type Trail = { x: number; y: number }[]; // hasta 3 posiciones anteriores
```

```ts
// games/ranaria/sounds.ts — sin estado de módulo
export type Sounds = {
  hop(): void;
  firefly(): void;
  cross(): void;
  swamp(): void;
  hum(): void;
  splat(): void;
  splash(): void;
  extra(): void;
  stopAll(): void;
  dispose(): void;
};
```

Archivos:

- `games/ranaria/sounds.ts`: `createSounds()` → `{ hop(), firefly(), cross(), swamp(), hum(), splat(), splash(), extra(), stopAll(), dispose() }`, con el mismo patrón de `Set` de clones activos que `games/rebote/sounds.ts`.
- `public/games/ranaria/sounds/hop.wav`, `firefly.wav`, `cross.wav`, `swamp.wav`, `hum.wav`, `splat.wav`, `splash.wav` y `extra.wav`.
- `games/ranaria/fx.ts`: funciones puras:
  - `emitBurst(particles, x, y, count, speed, life, colors, spreadFrom, spreadTo, gravity)`, que respeta `MAX_PARTICLES` y alterna los colores de `colors`;
  - `updateParticles(particles, dt)`, que mueve, aplica gravedad y descarta las que agotan su vida;
  - `updateFloatTexts(texts, dt)`;
  - `pushTrail(trail, x, y)`, con un máximo de 3 posiciones;
  - `shakeOffset(remaining, random)`, que devuelve `{ dx, dy }`.
- `games/ranaria/constants.ts`: nuevas constantes de pulido `MAX_PARTICLES = 100`, `TRAIL_LEN = 3`, `TRAIL_ALPHA = [0.35, 0.2, 0.1]`, `SPARK_COUNT = 10`, `SPARK_SPEED = 140`, `SPARK_LIFE = 0.45`, `FLOAT_RISE = 30`, `FLOAT_LIFE = 0.6`, `SPLASH_COUNT = 12`, `SPLASH_SPEED = 160`, `SPLASH_GRAVITY = 500`, `SPLASH_LIFE = 0.6`, `ZAP_COUNT = 14`, `ZAP_SPEED = 220`, `ZAP_LIFE = 0.35`, `GOAL_FLASH_TIME = 0.4`, `SHAKE_TIME = 0.25`, `SHAKE_AMPLITUDE = 5`, `HUM_RANGE = 2` y `HOP_SRC`, `FIREFLY_SRC`, `CROSS_SRC`, `SWAMP_SRC`, `HUM_SRC`, `SPLAT_SRC`, `SPLASH_SRC`, `EXTRA_SRC` (rutas `/games/ranaria/sounds/…`). Las de mecánica no cambian.
- `games/ranaria/engine.ts`: llamadas a sonidos y efectos.

---

## Plan de implementación

1. **Sonido (E3).**
   - Generar los ocho WAV con jsfxr según la tabla y copiarlos a `public/games/ranaria/sounds/`.
   - Crear `games/ranaria/sounds.ts` con `createSounds()` (clones solapables, rechazos de `play()` ignorados, `stopAll()` y `dispose()`).
   - `npm run build` pasa.
2. **Efectos.** Crear `games/ranaria/fx.ts` con las funciones del modelo de datos y añadir las constantes de pulido a `constants.ts`. `npm run build` pasa.
3. **Integración en el motor.**
   - `createSounds()` dentro de `createRanariaGame`; partículas, textos flotantes, estela, destello y sacudida dentro del estado de la factory.
   - Sonidos: `hop()` al empezar cada salto; `firefly()` al atrapar; `cross()` o `swamp()` al completar un cruce; `hum()` cuando un cable pasa de `safe` a `warn` con `|fila de la rana − fila del cable| ≤ 2` (solo en `playing`); `splat()` o `splash()` según la causa de muerte; `extra()` al ganar una vida.
   - Efectos: estela en cada frame de salto; chispas y `×N` al atrapar; salpicadura o chispazo y sacudida al morir; destello al cruzar; barrido en `transition`.
   - Orden de dibujo: filas y objetos; luciérnagas; estela; rana o anillo; partículas y textos flotantes; barrido. La sacudida envuelve la rejilla, no la franja de indicadores.
   - `pause()` congela los efectos y llama a `stopAll()`; `restart()` vacía partículas, textos, estela, destello y sacudida; `destroy()` llama a `dispose()` y libera todo.
4. **Verificación.** Partida completa comparando puntuación y ritmo con la spec 01; `npm run lint` y `npm run build`.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Cada salto suena `hop.wav` y deja una estela de 3 siluetas que desaparece al aterrizar.
- [ ] Atrapar una luciérnaga suena `firefly.wav`, lanza 10 chispas lima durante 450 ms y muestra el `×N` nuevo subiendo 30 px durante 600 ms.
- [ ] Completar el 1.º o 2.º cruce suena `cross.wav`; el 3.º suena `swamp.wav` (y no `cross.wav`). En los tres, la línea de meta destella 400 ms.
- [ ] Durante `▸ NUEVO PANTANO_` una franja cian barre la rejilla de izquierda a derecha en 1.2 s.
- [ ] Con la rana a 2 filas o menos de un cable, suena `hum.wav` al empezar su aviso, una vez por ciclo; con la rana lejos, no suena.
- [ ] Morir por rayo, descarga o reloj suena `splat.wav`; por hundirse o ser arrastrada suena `splash.wav`. En los dos casos la rejilla tiembla hasta 5 px durante 250 ms y la franja de indicadores no.
- [ ] Hundirse lanza 12 gotas cian que caen con gravedad; morir por rayo o descarga lanza 14 chispas blancas y magenta.
- [ ] Ganar una vida extra suena `extra.wav`.
- [ ] Dos sonidos seguidos se solapan sin cortarse.
- [ ] Al pausar o al salir con `SALIR` no queda ningún sonido sonando. La consola no muestra 404 de `/games/ranaria/…`.
- [ ] Nunca hay más de 100 partículas efímeras a la vez.
- [ ] La puntuación, las vidas, el nivel, la velocidad de los carriles (×1.0 en el nivel 1), el ciclo de los cables y el reloj de luz son idénticos a los de la spec 01 para las mismas acciones.
- [ ] Al pulsar `SALIR` y volver a entrar, solo corre un bucle y no quedan listeners ni sonidos del juego en otras páginas.
- [ ] Ningún archivo de `games/ranaria/` declara estado mutable en el nivel del módulo.

---

## Decisiones

- **Sí:** ocho sonidos (salto, luciérnaga, cruce, pantano, zumbido, golpe, salpicadura, vida extra). Decisión del agente: son los eventos que marcan el ritmo de un juego de timing; el salto da tacto a cada pulsación y el zumbido del cable avisa sin mirar.
- **Sí:** `hum()` solo con la rana a 2 filas o menos del cable. Decisión del agente: con varios cables en pantalla, oírlos todos sería ruido continuo; solo importa el que está cerca.
- **Sí:** archivos generados con jsfxr en WAV. Decisión del agente: no hay original del que copiarlos; jsfxr produce sonidos sintetizados propios, sin licencia de terceros, y el WAV corto pesa poco y lo reproducen todos los navegadores.
- **No:** síntesis en tiempo real con Web Audio API. Decisión del agente: el contrato E3 se definió con `new Audio()` y REBOTE ya lo usa; otro sistema de audio sería un patrón nuevo sin necesidad.
- **No:** música o ambiente en bucle. Decisión del agente: sin control de volumen (fuera del contrato), un bucle continuo resulta molesto y taparía el zumbido del cable.
- **Sí:** estela, chispas, salpicadura, chispazo, destello de meta, barrido y sacudida. Decisión del agente: cada uno confirma un evento de la mecánica (salto, multiplicador, causa de muerte, cruce, nivel) y es barato de dibujar.
- **Sí:** la sacudida solo mueve el dibujo de la rejilla. Decisión del agente: así la lógica, las colisiones y la puntuación no cambian (regla de oro del pulido), y el reloj de luz sigue legible.
- **No:** niebla, reflejos y lluvia. Decisión del agente: añadirían ruido visual sobre carriles que hay que leer con precisión.
- **Sí:** pulido en spec aparte. Se puede posponer o descartar sin afectar al leaderboard.

---

## Riesgos

| Riesgo                                                           | Mitigación                                                                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Los navegadores bloquean `play()` antes del primer gesto.        | Rechazos ignorados con `.catch(() => {})`. El primer salto ya es un gesto, así que en la práctica siempre suena. |
| Demasiadas partículas bajan los fps y alteran el ritmo.          | Tope de 100 partículas efímeras, sin `shadowBlur`, y `dt` limitado a `MAX_DT`.                                   |
| El pulido cambia sin querer la mecánica.                         | Las constantes de mecánica no se tocan; un criterio compara con la spec 01.                                      |
| El sonido de salto, muy frecuente, resulta cansino.              | `hop.wav` muy corto (< 80 ms) y de volumen bajo al generarlo.                                                    |
| La sacudida confunde la posición de la rana justo al reaparecer. | Dura 250 ms, menos que la fase `dying` (800 ms), así que termina antes de que la rana reaparezca.                |
| Los WAV generados suenan distinto en cada máquina del equipo.    | Se generan una vez y se versionan en `public/games/ranaria/sounds/`; no se regeneran en el build.                |

---

## Preguntas abiertas

- ¿Los sonidos deben generarse con jsfxr o el equipo prefiere una biblioteca CC0 concreta? Por defecto, jsfxr con los presets de la tabla.

---

## Lo que **no** está en esta spec

- Control de volumen o silencio.
- Música o ambiente en bucle.
- Tono variable de la luciérnaga según el multiplicador.
- Cambios de mecánica, puntuación o dificultad.
- Niebla, reflejos y lluvia.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
