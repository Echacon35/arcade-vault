# Juegos con controles táctiles

Referencia de qué juegos se pueden jugar en el navegador del móvil (pad táctil en `GAME_TOUCH` y gestos en el canvas, según `specs/10-controles-tactiles-moviles.md`, con el aspecto de `specs/11-apariencia-gamepad-mk2.md`). La mantiene el agente `mobile-porter` (`.claude/agents/mobile-porter.md`): la lee al empezar y la actualiza al terminar.

**Infraestructura (SPEC 10):** `games/shared/touch.ts` (tipos, constantes y `dispatchKey`), `components/touch-pad.tsx`, `GAME_TOUCH` en `games/registry.ts`, prop `swipe` en `GameCanvas` y maqueta táctil vertical/horizontal + HUD ≤ 720 px en `app/globals.css`. El pad solo aparece con motor, distribución y `(pointer: coarse)`.

**Aspecto (SPEC 11, Gamepad MK-II de `references/gamepad-assets/`):** carcasa neón (dos medias carcasas en horizontal), cruz **siempre completa** con gema central (las direcciones que el juego no declara se ven apagadas e inertes) y como **máximo 2 acciones**: la **última es A (magenta)** y la anterior **B (cian)**. Los botones solo muestran la letra; el `label` de cada acción es el texto de la **leyenda** bajo ellos.

El código manda: si esta tabla no coincide con `games/<id>/touch.ts` y `GAME_TOUCH` de `games/registry.ts`, se corrige la tabla.

## Estado por juego

Estados: `pendiente` (con motor pero sin `touch.ts`), `parcial` (pad incompleto o sin verificar), `completo` (pad, gesto si aplica y verificación).

| Fecha      | ID           | Título     | Cruceta (apagadas)                 | B (cian)    | A (magenta) | Gesto            | Estado   | Notas                                       |
| ---------- | ------------ | ---------- | ---------------------------------- | ----------- | ----------- | ---------------- | -------- | ------------------------------------------- |
| 2026-11-11 | `asteroides` | ASTEROIDES | `◀` `▶` girar (`▲` `▼` apagadas)   | `PROPULSAR` | `FUEGO`     | —                | completo | `FUEGO` un disparo por toque.               |
| 2026-11-11 | `tetra`      | TETRA      | `◀` `▶` `▼` `repeat` (`▲` apagada) | `ROTAR`     | `CAÍDA`     | —                | completo | Repetición emulada 170 ms / 50 ms.          |
| 2026-11-11 | `rebote`     | REBOTE     | `◀` `▶` (`▲` `▼` apagadas)         | —           | —           | arrastre (pala)  | completo | Motor pasó a `pointermove` + `pointerdown`. |
| 2026-11-11 | `viborita`   | VIBORITA   | `▲` `▼` `◀` `▶`                    | —           | —           | deslizar (giros) | completo | `swipe: true`, umbral 30 px.                |
| 2026-11-12 | `ranaria`    | RANARIA    | `▲` `▼` `◀` `▶` (ninguna apagada)  | —           | —           | deslizar (saltos) | completo | Un salto por toque o gesto; sin `repeat`. |

## Notas por juego

Detalle de decisiones por juego (repetición, gesto, orden B/A, controles sin equivalente táctil, ajustes de CSS) cuando aporte. Los cuatro juegos de SPEC 10 están documentados en la propia spec; su aspecto A/B, en SPEC 11.

### RANARIA (`ranaria`, 2026-11-12)

- **Motor:** flechas y WASD en `window`, un salto de una celda por `keydown`; ignora `e.repeat` (mantener no encadena saltos). La partida espera a la primera flecha. Sin ratón. `KeyP`/`Escape` los cubre el botón `PAUSA`.
- **Distribución:** cruz de 4 sin `repeat` (el motor descarta la repetición; un evento sintético por toque es el comportamiento del teclado) y 0 acciones, igual que VIBORITA. Sin leyenda; en horizontal solo se ve la media carcasa izquierda.
- **Gesto:** `swipe: true` (rejilla en 4 direcciones). Cada 30 px de recorrido emite un salto; un deslizamiento largo puede dar varios saltos.
- **WASD:** sin equivalente táctil necesario; el pad emite flechas.
- **CSS:** sin cambios.
- **Pendientes:** prueba en móvil real. Ajenos al juego (afectan a todo el sitio): la cabecera desborda 36 px a 360 px (botón hamburguesa) y 4 px a 915 px (`auth-btn`); el selector de skins a ≤ 720 px es una tira con scroll horizontal propio (PASTEL/CLÁSICO quedan fuera hasta desplazarla, pero se pueden tocar). En la emulación, un toque de un segundo dedo sobre `PAUSA` mientras otro mantiene una flecha no generó `click` (Chromium/CDP); falta comprobarlo en un teléfono.
