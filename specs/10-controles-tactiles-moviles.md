# SPEC 10 — Controles táctiles para jugar en móvil

> **Estado:** Implementado
> **Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Fecha:** 2026-11-11
> **Objetivo:** Hacer jugables ASTEROIDES, TETRA, REBOTE y VIBORITA en dispositivos con pantalla táctil mediante un pad en pantalla que emite teclas sintéticas, más gestos sobre el canvas en REBOTE y VIBORITA.

---

## Por qué existe esta spec

Los cuatro motores reales solo escuchan `keydown`/`keyup` en `window` (leyendo `KeyboardEvent.code`), y REBOTE además usa `mousemove` en el canvas. En un móvil no hay teclado ni ratón: hoy se puede abrir `/juegos/<id>/jugar`, pero no se puede jugar. SPEC 09 dejó explícitamente fuera "controles táctiles, swipe y soporte móvil jugable" porque requería una spec de plataforma: esta es esa spec.

Particularidades:

- **Los motores no cambian su contrato.** El pad dispara `KeyboardEvent` sintéticos en `window` con el mismo `code` que el teclado. ASTEROIDES, TETRA y VIBORITA no se tocan. La única modificación de motor es REBOTE: `mousemove` pasa a `pointermove` para que el dedo también mueva la pala.
- **Distribución por juego.** Cada juego declara sus botones en `games/<id>/touch.ts` y se registra en `GAME_TOUCH` (`games/registry.ts`), igual que las skins con `GAME_SKINS`.
- **Solo en táctil.** El pad aparece solo cuando `(pointer: coarse)` coincide. En escritorio la pantalla de juego no cambia.

---

## Alcance

**Dentro:**

- **Teclas sintéticas** (`games/shared/touch.ts`):
  - `dispatchKey(type, code, repeat)` crea `new KeyboardEvent(type, { code, key, repeat, bubbles: true, cancelable: true })` y lo despacha en `window`. `key` se deriva de `code` (`ArrowLeft` → `"ArrowLeft"`, `Space` → `" "`).
  - Como el `target` es `window`, `isTypingTarget` devuelve `false` y los motores procesan la tecla con sus reglas de siempre (ignoran si está en pausa o en game over).
- **Distribución táctil por juego** (`games/<id>/touch.ts`, registrada en `GAME_TOUCH`). Cruceta a la izquierda, acciones a la derecha:

  | Juego      | Cruceta (izquierda)                                               | Acciones (derecha)                         | Gesto en canvas  |
  | ---------- | ----------------------------------------------------------------- | ------------------------------------------ | ---------------- |
  | ASTEROIDES | `◀` `ArrowLeft`, `▶` `ArrowRight` (girar)                         | `▲` `ArrowUp` (propulsar), `FUEGO` `Space` | —                |
  | TETRA      | `◀` `ArrowLeft`, `▶` `ArrowRight`, `▼` `ArrowDown` (repetibles)   | `ROTAR` `ArrowUp`, `CAÍDA` `Space`         | —                |
  | REBOTE     | `◀` `ArrowLeft`, `▶` `ArrowRight`                                 | —                                          | arrastre (pala)  |
  | VIBORITA   | `▲` `ArrowUp`, `▼` `ArrowDown`, `◀` `ArrowLeft`, `▶` `ArrowRight` | —                                          | deslizar (giros) |
  - En ASTEROIDES `FUEGO` da un disparo por toque: el motor dispara con `justPressed` y mantenerlo no repite.

- **Pad en pantalla** (`components/touch-pad.tsx`, Client Component):
  - Un botón por entrada de la distribución, con eventos de puntero:
    - `pointerdown` → `keydown`;
    - `pointerup`, `pointercancel` y `lostpointercapture` → `keyup`.
  - Usa `setPointerCapture` y lleva la cuenta por `pointerId`, así que funciona con varios dedos a la vez (p. ej. `◀` + `FUEGO`).
  - **Autorrepetición** solo en los botones marcados `repeat: true` (`◀` `▶` `▼` de TETRA): primer `keydown` al tocar; tras `REPEAT_DELAY = 170` ms, un `keydown` con `repeat: true` cada `REPEAT_INTERVAL = 50` ms mientras se mantenga.
  - **Liberación forzada:** suelta (envía `keyup` y para la repetición) todos los botones pulsados al pausar, al abrirse el modal de fin, al ocultar la pestaña y al desmontar.
  - Los botones no toman el foco (`tabIndex={-1}` y `preventDefault` en `pointerdown`), no abren menú contextual (`onContextMenu` → `preventDefault`) y no seleccionan texto.
  - Botón pulsado con estado visual activo (`data-pressed`).
  - El aspecto se diseña con `/frontend-design`, con la estética neón/CRT del Vault y las maquetas de `references/Templates/` como referencia.
- **Gestos en el canvas** (`components/game-canvas.tsx`):
  - **Deslizar (VIBORITA, `swipe: true` en la distribución):** solo con `pointerType === "touch"`. Cada vez que el dedo recorre `SWIPE_THRESHOLD = 30` px CSS desde el último punto de giro, se emite `keydown` + `keyup` de la flecha del eje dominante y ese punto pasa a ser el nuevo origen. Permite girar en L sin levantar el dedo; la cola de giros del motor filtra los 180°. Un deslizamiento también arranca la partida en la espera inicial (es una flecha).
  - **Arrastre (REBOTE):** `games/rebote/engine.ts` cambia `mousemove` por `pointermove` y añade `pointerdown`, con la misma conversión de coordenadas (`(clientX − rect.left) × W / rect.width`). Ratón, dedo y lápiz mueven la pala; tocar el canvas coloca la pala bajo el dedo.
- **Detección:** `GamePlayer` muestra el pad solo si se cumplen las tres condiciones:
  - el juego tiene motor (`GAME_ENGINES`);
  - tiene distribución (`GAME_TOUCH`);
  - `matchMedia("(pointer: coarse)")` coincide.

  Se lee con `useSyncExternalStore`: en el servidor y en el primer render vale `false` y reacciona a cambios. Sin interruptor manual.

- **`touch-action: none`** (más `user-select: none` y `-webkit-touch-callout: none`) solo en el canvas y en el pad. El resto de la página hace scroll normal.
- **Maqueta de `/jugar` en táctil:**
  - **Vertical** (`orientation: portrait`): HUD, canvas a todo el ancho disponible y, debajo, el pad (cruceta a la izquierda, acciones a la derecha).
  - **Horizontal** (`orientation: landscape`): cruceta a la izquierda del CRT, acciones a la derecha y CRT centrado. La altura del CRT se limita para que canvas y pad quepan a la vez en el viewport (`100dvh`). El HUD queda encima y puede salir de la vista con scroll.
  - No se fuerza la orientación.
- **HUD de `/jugar` adaptado a móvil** (≤ 720 px de ancho): estadísticas, selector de skins y botones `PAUSA`/`FIN`/`SALIR` caben sin desbordamiento horizontal en 360 px. El selector de skins ocupa una fila propia y, si no cabe, hace scroll horizontal dentro de sí mismo. Aplica también en escritorio estrecho.

**Fuera de alcance (para futuras specs):**

- Vibración (`navigator.vibrate`) y pantalla completa (Fullscreen API).
- Bloquear scroll o zoom fuera del canvas y del pad, y forzar orientación.
- Interruptor manual para mostrar u ocultar el pad (portátiles táctiles con `pointer: fine`).
- Pad o controles en los juegos simulados (`bloque-buster`, `caida`, `serpentina`, …): no muestran pad.
- Distribución táctil de RANARIA (no tiene motor todavía) y actualizar la receta de `/add-game`, `contract.md` o el agente `game-jam` para exigir `touch.ts` en juegos nuevos.
- Extensión del contrato de motor (`input(action)`): no se crea E5.
- Gestos en ASTEROIDES y TETRA, y cualquier gesto más allá de deslizar (VIBORITA) y arrastrar (REBOTE).
- Adaptar a móvil otras páginas (`/`, `/juegos`, `/salon`, …).
- Cambios en Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- Tests automatizados.

---

## Modelo de datos

```ts
// games/shared/touch.ts — sin estado de módulo, sin tocar window al importar
export type TouchButton = {
  id: string; // único dentro de la distribución, p. ej. "left", "fire"
  label: string; // texto o glifo del botón: "◀", "FUEGO"
  code: string; // KeyboardEvent.code que emite: "ArrowLeft", "Space"
  repeat?: boolean; // autorrepetición al mantener (solo TETRA ◀ ▶ ▼)
  ariaLabel: string; // "Girar a la izquierda", "Disparar"
};

export type TouchLayout = {
  dpad: TouchButton[]; // bloque izquierdo
  actions: TouchButton[]; // bloque derecho (puede estar vacío)
  swipe?: boolean; // deslizar sobre el canvas emite flechas (VIBORITA)
};

export const REPEAT_DELAY = 170; // ms
export const REPEAT_INTERVAL = 50; // ms
export const SWIPE_THRESHOLD = 30; // px CSS

export function dispatchKey(
  type: "keydown" | "keyup",
  code: string,
  repeat?: boolean,
): void;
```

```ts
// games/registry.ts
export const GAME_TOUCH: Partial<Record<string, TouchLayout>> = {
  asteroides: ASTEROIDES_TOUCH,
  tetra: TETRA_TOUCH,
  rebote: REBOTE_TOUCH,
  viborita: VIBORITA_TOUCH,
};
```

```ts
// components/game-canvas.tsx — prop nueva
type GameCanvasProps = {
  // …las actuales
  /** Deslizar en táctil emite flechas sintéticas (VIBORITA). */
  swipe?: boolean;
};
```

Archivos:

- **Nuevos:**
  - `games/shared/touch.ts`;
  - `games/asteroides/touch.ts`, `games/tetra/touch.ts`, `games/rebote/touch.ts` y `games/viborita/touch.ts` (cada uno exporta su `TouchLayout`);
  - `components/touch-pad.tsx`.
- **Modificados:**
  - `games/registry.ts` (`GAME_TOUCH`);
  - `games/rebote/engine.ts` (`mousemove` → `pointermove` + `pointerdown`);
  - `components/game-canvas.tsx` (prop `swipe` y `touch-action`);
  - `components/game-player.tsx` (detección, montaje del pad y maqueta);
  - `app/globals.css` (pad, maqueta vertical/horizontal y HUD ≤ 720 px).

No hay persistencia ni cambios en Supabase.

---

## Plan de implementación

1. **Utilidades compartidas.** Crear `games/shared/touch.ts` con los tipos, las constantes y `dispatchKey`. Todavía no se usa. `npm run build` pasa.
2. **Distribuciones y registro.** Crear los cuatro `games/<id>/touch.ts` según la tabla de Alcance y añadir `GAME_TOUCH` a `games/registry.ts`. `npm run build` pasa.
3. **Pad.** Crear `components/touch-pad.tsx`. Recibe `layout` y `active` (`!paused && !over`); al pasar `active` a `false`, o al desmontarse, libera todos los botones. Implementa los eventos de puntero, el multitáctil por `pointerId`, la autorrepetición y el bloqueo de foco y de menú contextual. Diseñar su aspecto con `/frontend-design` y escribir sus estilos en `app/globals.css`. Todavía no se monta. `npm run build` pasa.
4. **Montaje en `GamePlayer`.**
   - Hook de `(pointer: coarse)` con `useSyncExternalStore`.
   - Montar `TouchPad` solo si hay motor, distribución y puntero grueso.
   - Liberar el pad también en `visibilitychange`; ya pausa, así que `active` pasa a `false`.
   - Maqueta táctil en vertical y en horizontal (`orientation`), con el CRT limitado a `100dvh` en horizontal.
   - Comprobación: en escritorio la página se ve exactamente igual que antes.
5. **Gestos.**
   - **Deslizar:** `GameCanvas` recibe `swipe` (desde `GAME_TOUCH[id]?.swipe`) e implementa el deslizamiento con `SWIPE_THRESHOLD`, solo con `pointerType === "touch"`.
   - **Arrastre:** en `games/rebote/engine.ts`, cambiar `mousemove` por `pointermove`, añadir `pointerdown` con el mismo handler y quitar ambos en `destroy()`.
   - **`touch-action`:** `touch-action: none`, `user-select: none` y `-webkit-touch-callout: none` en el canvas y en el pad.
6. **HUD móvil.** Reglas `@media (max-width: 720px)` para `.player-hud`, `.hud-actions` y el selector de skins: sin desbordamiento horizontal a 360 px.
7. **Verificación.**
   - **Emulación:** Playwright con un dispositivo táctil emulado (p. ej. `--device "Pixel 7"` o `hasTouch` + `isMobile`). Maqueta en 412×915 y 915×412, y en 360×740 para el HUD. Partidas de los cuatro juegos.
   - **Escritorio:** Playwright sin emulación; los cuatro juegos sin pad y sin regresiones.
   - **Móvil real:** una partida de cada juego en un teléfono por la red local (`npm run dev -- -H 0.0.0.0`).
   - `npm run lint` y `npm run build`.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] En escritorio (`pointer: fine`), `/juegos/<id>/jugar` de los cuatro juegos no muestra el pad y se juega con teclado (y ratón en REBOTE) igual que antes.
- [ ] Con emulación táctil, los cuatro juegos reales muestran el pad con exactamente los botones de la tabla de Alcance. `/juegos/serpentina/jugar` (simulado) no lo muestra.
- [ ] En vertical (412×915) se ven a la vez el canvas completo y el pad debajo, con la cruceta a la izquierda y las acciones a la derecha.
- [ ] En horizontal (915×412) se ven a la vez el canvas completo, la cruceta a la izquierda y las acciones a la derecha, sin hacer scroll una vez que el CRT está en pantalla.
- [ ] A 360×740 el HUD de `/jugar` no provoca scroll horizontal y `PAUSA`, `FIN`, `SALIR` y las skins se pueden tocar.
- [ ] **ASTEROIDES:** mantener `◀`/`▶` gira la nave mientras se mantiene, `▲` propulsa, y cada toque de `FUEGO` dispara una bala. Mantener `◀` y tocar `FUEGO` a la vez funciona.
- [ ] **TETRA:** un toque de `◀`/`▶` mueve la pieza una columna; mantenerlo, tras ~170 ms, la sigue moviendo cada ~50 ms. `▼` hace caída suave con repetición, `ROTAR` gira y `CAÍDA` la deja caer de golpe.
- [ ] **REBOTE:** `◀`/`▶` mueven la pala; arrastrar el dedo por el canvas la mueve bajo el dedo; con ratón en escritorio sigue funcionando como antes.
- [ ] **VIBORITA:** la cruceta gira la serpiente y arranca la partida en la espera. Deslizar ≥ 30 px gira, y un deslizamiento en L sin levantar el dedo hace los dos giros. Un deslizamiento opuesto a la dirección actual se ignora.
- [ ] Tocar o deslizar sobre el canvas, y tocar el pad, no desplaza la página ni hace zoom. Mantener un botón no abre menú contextual ni selecciona texto. Fuera del canvas y del pad, la página hace scroll normal.
- [ ] Mantener `◀` y pulsar `PAUSA` deja de girar o mover al reanudar sin volver a tocar (no quedan teclas "pegadas"). Igual al ocultar la pestaña y al abrirse `FIN DEL JUEGO`.
- [ ] En pausa, tocar el pad no altera el juego.
- [ ] Tras tocar un botón del pad, escribir el nombre en el modal de fin no mueve ni pausa el juego, y el pad no tiene el foco.
- [ ] Al salir de `/jugar` y volver, cada toque produce un solo efecto (no quedan listeners duplicados).
- [ ] `games/shared/touch.ts` y los `touch.ts` de cada juego no declaran estado mutable en el nivel del módulo ni tocan `window` al importarse.
- [ ] ASTEROIDES, TETRA y VIBORITA no tienen cambios en sus `engine.ts`.
- [ ] En un móvil real se completa una partida de cada juego y se guarda la puntuación de al menos una.
- [ ] La consola no muestra errores durante las partidas en emulación táctil.

---

## Decisiones

- **Sí:** teclas sintéticas en `window` con el mismo `code` que el teclado. Los motores no cambian y el contrato tampoco.
- **No:** extensión E5 con `input(action, pressed)`. Obligaría a tocar los cuatro motores y el contrato por algo que el teclado ya resuelve.
- **No:** que cada motor gestione sus propios gestos. Duplicaría lógica y dejaría sin botones a los juegos que los necesitan.
- **Sí:** botones para los cuatro juegos, más deslizar en VIBORITA y arrastrar en REBOTE, que son los gestos naturales de esas mecánicas.
- **No:** solo botones ni solo gestos.
- **Sí:** distribución por juego en `games/<id>/touch.ts` registrada en `GAME_TOUCH`. Sigue el patrón de `skins.ts` / `GAME_SKINS`.
- **Sí:** distribución de la tabla de Alcance (decisión del usuario): cruceta a la izquierda y acciones a la derecha.
- **No:** la misma cruceta de 4 con botones genéricos en todos los juegos.
- **Sí:** pad solo con `(pointer: coarse)`, sin interruptor. En escritorio no cambia nada.
- **No:** pad siempre visible, ni interruptor manual (queda fuera).
- **Sí:** vertical y horizontal sin forzar orientación.
- **No:** solo vertical, ni pedir que se gire el móvil.
- **Sí:** autorrepetición emulada en el pad (170 ms / 50 ms) solo en `◀` `▶` `▼` de TETRA. TETRA depende de la repetición del sistema operativo, que un evento sintético no tiene.
- **No:** un toque = un paso en TETRA.
- **Sí:** `FUEGO` de ASTEROIDES un disparo por toque, como el teclado (`justPressed`).
- **Sí:** REBOTE pasa de `mousemove` a `pointermove` + `pointerdown`. Es el único motor que se toca y el cambio mantiene el ratón.
- **No:** REBOTE solo con botones.
- **Sí:** deslizar con varios giros por toque (cada 30 px). Permite giros en L sin levantar el dedo; la cola del motor ya filtra los 180°.
- **No:** un giro por toque al levantar el dedo. Es más lento para una serpiente rápida.
- **Sí:** `touch-action: none` solo en canvas y pad. Sin él el navegador se queda con el gesto (scroll/zoom) y no llegan los `pointermove`.
- **No:** bloquear el scroll o el zoom de toda la página.
- **Sí:** liberar los botones al pausar, al terminar, al ocultar la pestaña y al desmontar. Evita teclas pegadas.
- **Sí:** adaptar el HUD de `/jugar` a 360 px en esta spec. Sin eso, la pantalla de juego no se puede usar en un móvil.
- **No:** vibración, pantalla completa, actualizar `/add-game`/`game-jam` ni RANARIA (decisión del usuario: fuera de esta spec).
- **No:** pad en los juegos simulados. No tienen motor que escuche teclas.
- **Sí:** verificación con Playwright en emulación táctil y una partida en un móvil real. `(pointer: coarse)` no coincide en Chromium de escritorio sin emulación.

---

## Riesgos

| Riesgo                                                                                                 | Mitigación                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un botón queda pulsado (keydown sin keyup) si el dedo sale del botón, la pestaña se oculta o se pausa. | `setPointerCapture`, `keyup` en `pointerup`/`pointercancel`/`lostpointercapture` y liberación forzada al pausar, terminar, ocultar y desmontar. Hay un criterio específico. |
| Un motor ignora el `keyup` mientras está pausado y la tecla queda marcada en su estado interno.        | Los motores ya limpian sus teclas en `pause()`. Se verifica con el criterio "mantener `◀` y pausar".                                                                        |
| El navegador hace scroll o zoom en lugar de entregar los `pointermove` al canvas.                      | `touch-action: none` en canvas y pad.                                                                                                                                       |
| `useSyncExternalStore` con `matchMedia` provoca un desajuste de hidratación.                           | `getServerSnapshot` devuelve `false`: el pad aparece después de hidratar, sin desajuste.                                                                                    |
| En horizontal y con pantallas bajas el CRT 4:3 no cabe con el pad.                                     | El CRT se limita a `100dvh` en horizontal y el pad va a los lados, no debajo. Se verifica a 915×412.                                                                        |
| Un portátil táctil con ratón (`pointer: fine`) no muestra el pad.                                      | Aceptado: el interruptor manual queda fuera. Ese equipo tiene teclado.                                                                                                      |
| El deslizamiento de VIBORITA dispara giros involuntarios con un dedo tembloroso.                       | Umbral de 30 px CSS y eje dominante. La cola del motor descarta los 180°.                                                                                                   |
| El cambio a `pointermove` altera el control con ratón de REBOTE.                                       | Misma conversión de coordenadas. Hay un criterio de regresión en escritorio.                                                                                                |
| Los juegos nuevos (RANARIA) llegan sin `touch.ts` y no se pueden jugar en móvil.                       | Fuera de alcance. Sin entrada en `GAME_TOUCH`, simplemente no hay pad: no falla. Queda para una spec que actualice `/add-game` y `game-jam`.                                |

---

## Lo que **no** está en esta spec

- Vibración y pantalla completa.
- Bloqueo de scroll/zoom fuera del juego y orientación forzada.
- Interruptor manual del pad.
- Controles en los juegos simulados.
- RANARIA y la actualización de `/add-game`, `contract.md` y `game-jam`.
- Extensión E5 del contrato de motor.
- Gestos en ASTEROIDES y TETRA.
- Adaptación móvil del resto de páginas.
- Cambios en Supabase, `lib/catalog.ts` o `saveScoreAction`.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
