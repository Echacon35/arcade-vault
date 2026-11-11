# Juegos con controles táctiles

Referencia de qué juegos se pueden jugar en el navegador del móvil (pad táctil en `GAME_TOUCH` y gestos en el canvas, según `specs/10-controles-tactiles-moviles.md`). La mantiene el agente `mobile-porter` (`.claude/agents/mobile-porter.md`): la lee al empezar y la actualiza al terminar.

**Infraestructura (SPEC 10):** `games/shared/touch.ts` (tipos, constantes y `dispatchKey`), `components/touch-pad.tsx`, `GAME_TOUCH` en `games/registry.ts`, prop `swipe` en `GameCanvas` y maqueta táctil vertical/horizontal + HUD ≤ 720 px en `app/globals.css`. El pad solo aparece con motor, distribución y `(pointer: coarse)`.

El código manda: si esta tabla no coincide con `games/<id>/touch.ts` y `GAME_TOUCH` de `games/registry.ts`, se corrige la tabla.

## Estado por juego

Estados: `pendiente` (con motor pero sin `touch.ts`), `parcial` (pad incompleto o sin verificar), `completo` (pad, gesto si aplica y verificación).

| Fecha      | ID           | Título     | Cruceta (izquierda)          | Acciones (derecha)          | Gesto            | Estado   | Notas                                   |
| ---------- | ------------ | ---------- | ---------------------------- | --------------------------- | ---------------- | -------- | --------------------------------------- |
| 2026-11-11 | `asteroides` | ASTEROIDES | `◀` `▶` (girar)              | `▲` propulsar, `FUEGO`      | —                | completo | `FUEGO` un disparo por toque.           |
| 2026-11-11 | `tetra`      | TETRA      | `◀` `▶` `▼` (`repeat: true`) | `ROTAR`, `CAÍDA`            | —                | completo | Repetición emulada 170 ms / 50 ms.      |
| 2026-11-11 | `rebote`     | REBOTE     | `◀` `▶`                      | —                           | arrastre (pala)  | completo | Motor pasó a `pointermove` + `pointerdown`. |
| 2026-11-11 | `viborita`   | VIBORITA   | `▲` `▼` `◀` `▶`              | —                           | deslizar (giros) | completo | `swipe: true`, umbral 30 px.            |

## Notas por juego

Detalle de decisiones por juego (repetición, gesto, controles sin equivalente táctil, ajustes de CSS) cuando aporte. Los cuatro juegos de SPEC 10 están documentados en la propia spec.
