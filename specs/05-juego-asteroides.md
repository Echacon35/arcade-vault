# SPEC 05 — Juego real de asteroides

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-11-09
> **Objetivo:** Portar a TypeScript el juego de asteroides de `references/started-games/02-asteroids` y hacerlo jugable en `/juegos/asteroides/jugar`, dentro del CRT y con el HUD y el modal de fin de partida del reproductor.

---

## Por qué existe esta spec

Hoy ningún juego es real. `components/game-player.tsx` simula una partida: la puntuación sube sola con un `setInterval` y la arena es decorativa. Esta spec monta el primer juego jugable y deja definida la forma en que se integrarán los siguientes (Tetris y Arkanoid, en specs propias).

Particularidades:

- **La fuente es `references/started-games/02-asteroids`**: `index.html` (canvas 800×600) y `game.js` (510 líneas, Canvas 2D, sin dependencias).
- **`game.js` no se puede usar tal cual.** Tiene estado global en el módulo, listeners en `window` que nunca se quitan y un `requestAnimationFrame` sin fin. En una SPA eso deja bucles y listeners vivos al navegar. Por eso se porta a un motor TypeScript con ciclo de vida explícito.
- **La mecánica no cambia.** Las constantes de física, puntos, vidas, niveles y power-up se copian sin modificar.
- **El juego convive con `rocas`.** La entrada `rocas` del catálogo sigue con la partida simulada.

---

## Alcance

**Dentro:**

- **Motor TypeScript** en `games/asteroides/`, portado de `game.js`:
  - Entidades `Ship`, `Asteroid`, `Bullet`, `PowerUp` y `Particle` con la misma lógica.
  - Constantes idénticas: 3 vidas; asteroides de radio 50/30/16, que dan 20/50/100 puntos; 4 asteroides en el nivel 1 y `3 + nivel` en los siguientes; disparo triple que dura 5 s; probabilidad de 15 % y garantía a las 5 destrucciones; 2 s de reaparición y 3 s de invencibilidad.
  - Sin estado global. `createAsteroidsGame(canvas, callbacks)` devuelve un objeto con `pause`, `resume`, `restart` y `destroy`.
  - `destroy()` cancela el `requestAnimationFrame` y quita los listeners de teclado.
- **Controles:** `←` y `→` rotan, `↑` propulsa y `Espacio` dispara. `P` y `Esc` pausan y reanudan. Mientras el juego está montado, esas teclas hacen `preventDefault()` para que la página no haga scroll.
- **Visual con la paleta neón del Vault.** Mismas formas vectoriales con colores de constantes: nave en cian, asteroides en tinta (`#e6e9ff`), balas en amarillo, power-up en magenta, llama en amarillo y partículas en tinta con desvanecido. Fondo `#000`, para integrarse con `.crt-screen` y su efecto de líneas.
- **Canvas** con resolución interna de 800×600, escalado por CSS al 100 % de `.crt-screen` (que ya es 4:3).
- **HUD en React.** Puntuación, vidas y nivel del `player-hud` muestran los valores reales del motor. Las vidas se pintan con `♥` por cada vida restante. Dentro del canvas solo queda el indicador `3x  N.Ns` mientras dura el disparo triple. Se quitan del canvas `SCORE`, `NIVEL`, los iconos de vida y el overlay `GAME OVER`.
- **Fin de partida.**
  - Al perder la última vida: el motor se detiene y se abre el modal `FIN DEL JUEGO` con la puntuación final, `GUARDAR PUNTUACIÓN` (vía `saveScore` de `lib/session.ts`), `JUGAR DE NUEVO` y `VOLVER AL VAULT`. Se elimina el reinicio con Espacio.
  - Botón `FIN` del HUD: detiene el motor y abre el mismo modal **sin** el campo de nombre ni `GUARDAR PUNTUACIÓN`. En su lugar aparece la línea `▸ PARTIDA ABANDONADA — NO SE GUARDA_`.
  - `JUGAR DE NUEVO` llama a `restart()` y reinicia el estado React (puntuación, vidas, nivel, guardado).
- **Pausa** sincronizada: el botón `PAUSA`/`REANUDAR` y las teclas `P`/`Esc` controlan el mismo estado. Con la pausa activa se muestra el overlay `EN PAUSA` que ya existe. El texto pasa a ser `PULSA REANUDAR O P PARA CONTINUAR`.
- **Pausa automática** cuando la pestaña pierde visibilidad (`visibilitychange`). Así se evita que el `dt` acumulado mate al jugador.
- **Registro de motores** por id en `games/registry.ts`. `GamePlayer` consulta el registro. Si el juego tiene motor, monta el canvas real. Si no, mantiene la simulación actual sin cambios.
- **Entrada de catálogo** nueva en `lib/games.ts`, colocada primera:
  - `id: "asteroides"`, `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-asteroides"`, `best: 0`, `plays: "0"`.
  - `short` y `long` nuevos que describan la mecánica real: rotar, propulsar, dividir rocas y el power-up de disparo triple. No se mencionan OVNIs.
- **Portada** `.cover-asteroides` en `app/globals.css`, distinta de `.cover-rocas` y en tonos cian.

**Fuera de alcance (para futuras specs):**

- Puntuaciones en Supabase, Salón de la Fama real y TOP 10 real en el detalle. El detalle de `asteroides` sigue usando `seededScores`.
- Actualizar `best` y `plays` del catálogo con datos reales.
- Controles táctiles y soporte móvil jugable.
- WASD u otros mapeos de teclas.
- Sonido. El original no tiene.
- OVNIs, hiperespacio u otras mecánicas nuevas.
- Récord local por juego ("mejor puntuación personal").
- Portar Tetris (`03-tetris`) y Arkanoid (`04-arkanoid`).
- Cambiar o quitar la entrada `rocas`.
- Tests automatizados.

---

## Modelo de datos

```ts
// games/types.ts
export type GameStats = { score: number; lives: number; level: number };

export type GameCallbacks = {
  onStats: (stats: GameStats) => void;   // solo cuando cambia algún valor, no cada frame
  onGameOver: (finalScore: number) => void;
  onPauseToggle: () => void;             // P / Esc pulsados dentro del juego
};

export type GameInstance = {
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
};

export type GameFactory = (canvas: HTMLCanvasElement, callbacks: GameCallbacks) => GameInstance;

// games/registry.ts
export const GAME_ENGINES: Partial<Record<string, GameFactory>> = {
  asteroides: createAsteroidsGame,
};
```

```ts
// games/asteroides/engine.ts — estado interno, nunca en el nivel del módulo
type Phase = "playing" | "dead" | "gameover";
type State = {
  ship: Ship; bullets: Bullet[]; asteroids: Asteroid[];
  particles: Particle[]; powerUps: PowerUp[];
  score: number; lives: number; level: number;
  phase: Phase; deadTimer: number;
  powerUpSpawned: boolean; killsSinceSpawn: number;
  paused: boolean;
};
```

Archivos del motor:

- `games/asteroides/constants.ts`: `W`, `H` y las constantes de física, puntos y power-up de `game.js`, más `COLORS` con la paleta neón.
- `games/asteroides/entities.ts`: las cinco clases. Reciben `ctx` en `draw(ctx)` y el estado de teclas en `update`, en lugar de leer globales.
- `games/asteroides/engine.ts`: `createAsteroidsGame` con el bucle, las colisiones, los niveles, el input y el dibujado.

Convenciones:

- Coordenadas en el espacio lógico 800×600, con origen arriba a la izquierda. Velocidades en px/s y `dt` limitado a 0,05 s, igual que el original.
- `games/` solo se importa desde Client Components. Ningún módulo toca `window` ni `document` al importarse.
- Las teclas se leen de `KeyboardEvent.code`.

---

## Plan de implementación

1. **Tipos y registro.** Crear `games/types.ts` y `games/registry.ts` con el registro vacío. `npm run build` pasa.
2. **Constantes y entidades.** Crear `games/asteroides/constants.ts` y `entities.ts` portando las clases de `game.js` con tipos y la paleta neón. Todavía no se usan.
3. **Motor.** Crear `games/asteroides/engine.ts` con `createAsteroidsGame`:
   - bucle `requestAnimationFrame`;
   - input con listeners propios y `preventDefault` en las teclas del juego;
   - `update` y `draw` portados, sin HUD ni overlay salvo el indicador `3x`;
   - `onStats` emitido solo cuando hay cambios;
   - `onGameOver` cuando las vidas llegan a 0;
   - `pause`, `resume`, `restart` y `destroy`.

   Registrar `asteroides` en `GAME_ENGINES`.
4. **Catálogo y portada.** Añadir la entrada `asteroides` al principio de `GAMES` y `.cover-asteroides` en `app/globals.css`. Comprobación manual: aparece en `/juegos` y su detalle abre en `/juegos/asteroides`.
5. **Canvas en el reproductor.** Crear `components/game-canvas.tsx`, un Client Component:
   - pinta un `<canvas width={800} height={600}>` al 100 % de `.crt-screen`;
   - crea la instancia en un `useEffect` y llama a `destroy()` en el cleanup;
   - refleja `paused` y `over` en `pause()` y `resume()`;
   - expone `restart` al padre.
6. **Integración en `GamePlayer`.**
   - Si `GAME_ENGINES[game.id]` existe, sustituye la `game-arena` decorativa por `GameCanvas`, desactiva el `setInterval` simulado y alimenta el HUD con `onStats`.
   - Conecta la pausa (botón y teclas), la pausa por `visibilitychange`, `onGameOver` para abrir el modal y `FIN` como abandono sin guardar.
   - `JUGAR DE NUEVO` reinicia el motor.
   - Los demás juegos no cambian.
7. **Limpieza.** `npm run lint` y `npm run build` sin errores.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos` muestra `ASTEROIDES` como primera tarjeta, con la portada `.cover-asteroides`, y `ROCAS` sigue en el catálogo.
- [ ] `/juegos/asteroides/jugar` muestra el canvas dentro del CRT y la nave cian aparece en el centro parpadeando 3 s.
- [ ] `←`/`→` rotan, `↑` propulsa con llama y `Espacio` dispara.
- [ ] Pulsar flechas o `Espacio` durante la partida no desplaza la página.
- [ ] Destruir un asteroide grande suma 20 puntos, uno mediano 50 y uno pequeño 100, y el HUD React lo refleja.
- [ ] Un asteroide grande se divide en dos medianos y un mediano en dos pequeños.
- [ ] Al chocar, el HUD pasa de `♥ ♥ ♥` a `♥ ♥` y la nave reaparece a los 2 s en el centro.
- [ ] Al vaciar el nivel 1, el HUD muestra nivel `02` y aparecen 5 asteroides.
- [ ] El power-up `3x` aparece como muy tarde tras 5 destrucciones del nivel. Recogerlo dispara 3 balas durante 5 s y muestra `3x  N.Ns` en el canvas.
- [ ] El canvas no pinta `SCORE`, `NIVEL`, iconos de vida ni `GAME OVER`.
- [ ] `P`, `Esc` y el botón `PAUSA` congelan el juego y muestran `EN PAUSA`. Cualquiera de los tres lo reanuda.
- [ ] Cambiar de pestaña pausa el juego.
- [ ] Al perder la tercera vida se abre `FIN DEL JUEGO` con la puntuación real, y `GUARDAR PUNTUACIÓN` añade la entrada a `localStorage` vía `saveScore`.
- [ ] `FIN` abre el modal sin campo de nombre ni botón de guardar, con la línea `▸ PARTIDA ABANDONADA — NO SE GUARDA_`.
- [ ] `JUGAR DE NUEVO` empieza una partida con puntuación 0, 3 vidas y nivel 01.
- [ ] Al pulsar `SALIR` y volver a entrar, solo corre un bucle (sin aceleración ni doble dibujado) y no quedan listeners de teclado del juego en otras páginas.
- [ ] `/juegos/rocas/jugar` y los demás juegos siguen con la partida simulada de antes.
- [ ] La consola no muestra errores ni warnings durante una partida completa.
- [ ] Ningún archivo de `games/` declara estado mutable en el nivel del módulo.

---

## Decisiones

- **Sí:** portar a TypeScript modular (`constants`, `entities`, `engine`). Sin estado global y con `destroy()`, el juego sobrevive a la navegación SPA.
- **No:** servir `game.js` desde `public/` con `<Script>`. Sus globales y listeners permanentes chocan con la navegación del App Router.
- **No:** iframe. Aísla el juego pero impide integrar el HUD, la sesión y el modal.
- **Sí:** registro por id (`games/registry.ts`). Tetris y Arkanoid se enchufan sin tocar `GamePlayer`, y los juegos sin motor siguen simulados.
- **Sí:** nueva entrada `asteroides`, conviviendo con `rocas`. Decisión del usuario.
- **Sí:** HUD en React y solo el indicador `3x` en el canvas. Se evita duplicar información, y el `3x` es un dato efímero propio del juego.
- **Sí:** modal `FIN DEL JUEGO` en lugar del overlay del canvas. Unifica el flujo de guardado con el resto de la plataforma.
- **Sí:** `FIN` = abandonar sin guardar. Evita registrar puntuaciones de partidas no terminadas.
- **Sí:** paleta neón leída de `COLORS`. La mecánica es la del original, pero el aspecto encaja con el Vault.
- **Sí:** `saveScore` mock de `lib/session.ts`. Las puntuaciones en Supabase necesitan tablas y RLS, y van en otra spec.
- **Sí:** `best: 0` y `plays: "0"`. Es un juego nuevo y no se inventan cifras.
- **Sí:** pausa automática con `visibilitychange`. Evita que el jugador muera con la pestaña oculta.
- **No:** controles táctiles ni WASD. Alcance contenido; irán en otra spec si se piden.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| El Strict Mode de React monta, desmonta y vuelve a montar el efecto en dev, lo que crea dos bucles. | `destroy()` cancela el rAF y los listeners. Un criterio comprueba que solo corre un bucle. |
| `onStats` en cada frame provoca 60 renders por segundo. | Emitir solo cuando cambian puntuación, vidas o nivel. |
| Las teclas del juego interfieren con el input de nombre del modal (Espacio, Esc). | El motor ignora el teclado si está pausado o en game over, o si el foco está en un `input`. |
| El canvas se ve borroso al escalar en pantallas HiDPI. | Resolución lógica fija de 800×600, aceptada como estética retro. Ajustar `devicePixelRatio` queda fuera. |
| `Esc` también cierra algo del navegador o de la página. | Solo se hace `preventDefault` si el juego está montado y no hay modal abierto. |

---

## Lo que **no** está en esta spec

- Puntuaciones, Salón y TOP 10 reales en Supabase.
- Controles táctiles, WASD y sonido.
- Mecánicas nuevas (OVNIs, hiperespacio).
- Tetris y Arkanoid.
- Cambios en `rocas`.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
