# SPEC 11 — Apariencia del pad táctil como el Gamepad MK-II

> **Estado:** Implementado
> **Depende de:** SPEC 10
> **Fecha:** 2026-11-11
> **Objetivo:** Rediseñar el pad táctil de `/jugar` para que se vea igual que el Gamepad MK-II de `references/gamepad-assets/`, sin cambiar qué teclas emite ni cuándo aparece.

---

## Por qué existe esta spec

SPEC 10 dejó un pad funcional con estética propia: teclas cian con esquinas cortadas, una cruceta que cambia de forma según el juego (fila de 2, fila de 3 o cruz) y botones redondos amarillo/magenta con texto (`FUEGO`, `ROTAR`, `CAÍDA`, `▲`). Ahora existe un diseño de referencia del mando, el **Gamepad MK-II** (`references/gamepad-assets/gamepad.html` y `gamepad-neon.png`), y el pad debe verse igual que él.

Es un cambio **solo de presentación**: el comportamiento de SPEC 10 (teclas sintéticas, multitáctil, autorrepetición, liberación forzada, detección `(pointer: coarse)`, gestos en el canvas y maqueta vertical/horizontal) no cambia.

---

## Alcance

**Dentro:**

- **Carcasa del mando** (copiada de `.gp` de la referencia):
  - Fondo `linear-gradient(180deg, #1c1c28, #0c0c14)`, borde `var(--line)`, `border-radius: 22px`, sombra cian inferior y biseles internos.
  - Borde interior cian a 4 px (`::before`) y trama de puntos de 8 px (`::after`).
  - Cruceta a la izquierda y acciones a la derecha, como la referencia.
- **Cruceta siempre en cruz** (copiada de `.gp-dpad`/`.dp`/`.dp-hub`):
  - Siempre se dibujan las cuatro direcciones y el centro, en todos los juegos.
  - Teclas de 50×50 px con degradado oscuro, `border-radius: 10px` y sombra inferior de 4 px. Flechas con los **triángulos SVG** de la referencia (no el glifo `label`).
  - Centro con la **gema cian** en rombo y animación `pulse-led` de 2 s. Con `prefers-reduced-motion: reduce` la gema no se anima.
  - **Direcciones que el juego no usa:** se dibujan atenuadas (opacidad ≈ 0.3) y no son botones (no reciben toques ni emiten teclas, `aria-hidden`). ASTEROIDES y REBOTE: `▲` y `▼` atenuadas. TETRA: `▲` atenuada. VIBORITA: ninguna.
  - Pulsada (`data-pressed`): baja 3 px, fondo cian oscuro, borde cian, resplandor interior y exterior, y la flecha con `drop-shadow` cian (estado `.dp.on` de la referencia).
- **Botones de acción A/B** (copiados de `.ab`):
  - Redondos de 74 px, borde de 2 px en el color del botón, degradado radial con brillo arriba a la izquierda, sombra inferior de 6 px y resplandor.
  - Muestran **solo la letra** (`A` o `B`) en `Press Start 2P` de 22 px, blanca con resplandor del color del botón.
  - **Asignación por posición** en `layout.actions`: el último es **A (magenta)** y el anterior es **B (cian)**. Se dibujan en orden B, A (B a la izquierda), como en la referencia.
  - Pulsado (`data-pressed`): baja 4 px y escala 0.97, el resplandor crece y aparece el anillo discontinuo (`.ab-ring`) ampliado (estado `.ab.on` de la referencia).
- **Leyenda de acciones:**
  - Una línea pequeña dentro de la carcasa, bajo los botones A/B, con la función de cada botón tomada de `label`: p. ej. `B PROPULSAR · A FUEGO`.
  - En `JetBrains Mono` (`var(--mono)`) o `Press Start 2P` a ≤ 9 px, color `var(--ink-dim)`, con la letra en el color de su botón. Es decorativa (`aria-hidden`): la accesibilidad la siguen dando los `aria-label`.
  - Si el juego no tiene acciones, no hay leyenda.

  | Juego      | Cruceta activa  | B (cian)    | A (magenta) | Leyenda                 |
  | ---------- | --------------- | ----------- | ----------- | ----------------------- |
  | ASTEROIDES | `◀` `▶`         | `PROPULSAR` | `FUEGO`     | `B PROPULSAR · A FUEGO` |
  | TETRA      | `◀` `▶` `▼`     | `ROTAR`     | `CAÍDA`     | `B ROTAR · A CAÍDA`     |
  | REBOTE     | `◀` `▶`         | —           | —           | —                       |
  | VIBORITA   | `▲` `▼` `◀` `▶` | —           | —           | —                       |

- **Datos:**
  - `TouchLayout.actions` pasa a admitir como máximo dos botones (tupla), para que no pueda haber un tercer botón sin letra.
  - El `label` de las acciones pasa a ser el texto de la leyenda. En ASTEROIDES, `▲` cambia a `PROPULSAR`. El `label` de la cruceta deja de mostrarse (se usan los SVG) y se mantiene en el tipo.
- **Maqueta:**
  - **Vertical:** una carcasa completa bajo el CRT, a todo el ancho disponible (máx. 760 px como la referencia), con la cruceta a la izquierda y A/B + leyenda a la derecha.
  - **Horizontal:** **dos medias carcasas** con el mismo estilo: una con la cruceta a la izquierda del CRT y otra con A/B + leyenda a la derecha. Si el juego no tiene acciones, no hay media carcasa derecha. Se mantiene el cálculo del ancho del CRT de SPEC 10 (canvas y pad caben a la vez en `100dvh`).
  - **Tamaños reducidos:** a ≤ 620 px, los de la referencia (teclas de 46 px, cruz de 144 px, A/B de 64 px). Si a 360 px aún no cabe sin desbordar, se reduce otro escalón a ≤ 400 px (p. ej. teclas de 42 px y A/B de 56 px).
- **Estado inactivo** (en pausa o con el modal de fin): se mantiene el atenuado de SPEC 10 sobre los bloques; la gema deja de pulsar.
- **Agente `mobile-porter` y su memoria:** actualizar `.claude/agents/mobile-porter.md` con las reglas nuevas: máximo 2 acciones, la última es A, `label` de acciones como texto de la leyenda y cruceta siempre en cruz. Actualizar también la tabla de `references/games-with-touch.md` con las letras.
- El diseño se ajusta con `/frontend-design`, tomando `references/gamepad-assets/` como referencia exacta.

**Fuera de alcance (para futuras specs):**

- Cambios de comportamiento del pad: teclas emitidas, autorrepetición, multitáctil, liberación forzada, detección `(pointer: coarse)` y gestos en el canvas.
- Más de dos botones de acción (C/D) o colores elegidos por juego.
- Que el pad cambie con la skin del juego (`neon`, `retro`, `clasico`, `pastel`): siempre usa la estética neón del Vault.
- Mostrar el gamepad en escritorio, reflejar en él las pulsaciones de teclado (como hace el script de la referencia) o un estado `:hover`.
- Vibración, pantalla completa e interruptor manual del pad.
- Cambios en los motores (`engine.ts`), en `GameCanvas`, en Supabase o en otras páginas.
- Tests automatizados.

---

## Modelo de datos

```ts
// games/shared/touch.ts — cambia solo el tipo de `actions`
export type TouchLayout = {
  dpad: TouchButton[]; // ids admitidos: "up" | "down" | "left" | "right"
  /** 0–2 acciones. La última es A (magenta) y la anterior, B (cian). `label` es el texto de la leyenda. */
  actions: [] | [TouchButton] | [TouchButton, TouchButton];
  swipe?: boolean;
};
```

```ts
// games/asteroides/touch.ts — solo cambia la etiqueta de la leyenda
{ id: "thrust", label: "PROPULSAR", code: "ArrowUp", ariaLabel: "Propulsar" },
```

Estructura del pad en `components/touch-pad.tsx` (mismas props: `layout`, `active`):

```
.touch-pad[data-active]           ← carcasa completa en vertical; display: contents en horizontal
├─ .tp-side.tp-side-dpad          ← media carcasa izquierda en horizontal
│  └─ .tp-dpad                    ← cruz fija 3×3
│     ├─ button.tp-key[data-dir=up|down|left|right][data-pressed]  (direcciones del juego, con SVG)
│     ├─ span.tp-key[data-dir][data-unused] aria-hidden            (direcciones sin usar)
│     └─ .tp-hub > .tp-gem
└─ .tp-side.tp-side-actions       ← solo si hay acciones; media carcasa derecha en horizontal
   ├─ .tp-actions
   │  ├─ button.tp-ab[data-letter="B"][data-pressed]  > .tp-ring + .tp-letter
   │  └─ button.tp-ab[data-letter="A"][data-pressed]  > .tp-ring + .tp-letter
   └─ .tp-legend aria-hidden      ← "B PROPULSAR · A FUEGO"
```

Los nombres de clase son orientativos y se pueden ajustar durante la implementación; lo que no cambia es la estructura (cruz fija, dos bloques laterales y leyenda en el bloque de acciones).

Archivos:

- **Modificados:**
  - `games/shared/touch.ts` (tipo de `actions`);
  - `games/asteroides/touch.ts` (`label` de `thrust`);
  - `components/touch-pad.tsx` (marcado nuevo, cruz fija, letras A/B y leyenda);
  - `app/globals.css` (sustituye el bloque `/* ===== touch pad (SPEC 10) … */` y las reglas `.touch-pad`/`.tp-*` de la maqueta horizontal);
  - `.claude/agents/mobile-porter.md` y `references/games-with-touch.md` (reglas nuevas).
- **Sin cambios:** `components/game-player.tsx`, `components/game-canvas.tsx`, los `engine.ts` y los `touch.ts` de TETRA, REBOTE y VIBORITA.

No hay persistencia ni cambios en Supabase.

---

## Plan de implementación

1. **Tipo.** En `games/shared/touch.ts`, cambiar `actions` a la tupla de 0–2 botones y documentar la regla A/B. En `games/asteroides/touch.ts`, `label: "PROPULSAR"`. `npm run build` pasa (los cuatro layouts ya tienen ≤ 2 acciones).
2. **Marcado.** En `components/touch-pad.tsx`:
   - Cruz fija de 4 direcciones + centro: botón real para las direcciones del layout y elemento atenuado sin eventos para las demás.
   - SVG de flecha por dirección (triángulos de `gamepad.html`).
   - Botones A/B por posición (última = A), en orden B, A, con anillo y letra.
   - Leyenda con los `label`.
   - Se conserva intacta la lógica de SPEC 10: `onPointerDown`/`onPointerEnd`, `holdsRef`, `timersRef`, `releaseAll`, `tabIndex={-1}`, `onContextMenu`, `data-pressed` y `aria-label`.
   - Se elimina `dpadShape`.
   - `npm run build` pasa.
3. **Estilos.** En `app/globals.css`:
   - Sustituir el bloque del pad por los estilos de la referencia adaptados a `data-pressed` y `data-unused` (sin `:hover`, sin `:active`).
   - Carcasa en vertical y dos medias carcasas en horizontal, conservando el cálculo del ancho del CRT.
   - Escalones a ≤ 620 px y ≤ 400 px.
   - Gema parada con `prefers-reduced-motion` y cuando el pad está inactivo.
   - `touch-action: none` y el resto de bloqueos de SPEC 10 siguen aplicándose al pad.
   - Ajustar con `/frontend-design` comparando con `gamepad-neon.png`.
4. **Agente y memoria.** Actualizar `.claude/agents/mobile-porter.md` (máximo 2 acciones, la última es A, `label` = leyenda, cruz fija) y la tabla de `references/games-with-touch.md` (columnas B/A).
5. **Verificación.**
   - Playwright con emulación táctil (`pointer: coarse`) en 412×915, 915×412 y 360×740 para los cuatro juegos: capturas comparadas con `gamepad-neon.png` y repaso de los criterios de SPEC 10 que afectan al pad.
   - Escritorio sin emulación: sin pad.
   - `npm run lint` y `npm run build`.

---

## Criterios de aceptación

- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] Con emulación táctil, en los cuatro juegos el pad se ve como `references/gamepad-assets/gamepad-neon.png`: carcasa con borde neón y trama, cruz de 4 teclas con flechas SVG y gema cian en el centro, y botones redondos B cian y A magenta con su letra.
- [x] La cruz se dibuja completa en los cuatro juegos. Las direcciones no usadas (`▲` `▼` en ASTEROIDES y REBOTE, `▲` en TETRA) se ven atenuadas y tocarlas no emite ninguna tecla.
- [x] ASTEROIDES muestra B = propulsar y A = fuego, con la leyenda `B PROPULSAR · A FUEGO`. TETRA muestra B = rotar y A = caída, con la leyenda `B ROTAR · A CAÍDA`. REBOTE y VIBORITA no muestran botones A/B ni leyenda.
- [x] Un `TouchLayout` con tres acciones no compila.
- [x] Al pulsar, cada tecla o botón muestra el estado pulsado de la referencia (hundido + resplandor; anillo discontinuo en A/B) y vuelve al soltar.
- [x] En vertical (412×915), la carcasa completa queda bajo el canvas y canvas y pad se ven a la vez.
- [x] En horizontal (915×412), hay dos medias carcasas a los lados del CRT (solo la izquierda en REBOTE y VIBORITA) y canvas y pad se ven a la vez sin scroll una vez que el CRT está en pantalla.
- [x] A 360×740 no hay scroll horizontal y todas las teclas y botones se pueden tocar.
- [x] Con `prefers-reduced-motion: reduce` la gema no se anima. En pausa el pad se ve atenuado y la gema no pulsa.
- [x] Siguen cumpliéndose los criterios de comportamiento de SPEC 10: multitáctil (mantener `◀` + tocar A en ASTEROIDES), autorrepetición en TETRA, ninguna tecla pegada al pausar, sin foco ni menú contextual en los botones, y ningún cambio en escritorio.
- [x] `.claude/agents/mobile-porter.md` y `references/games-with-touch.md` describen la regla de máximo 2 acciones (última = A) y la leyenda.
- [x] La consola no muestra errores durante las partidas en emulación táctil.

---

## Decisiones

- **Sí:** copiar la estética de `references/gamepad-assets/` (carcasa, cruz, gema, A/B) como referencia exacta.
- **Sí:** cruz siempre completa, con las direcciones no usadas atenuadas e inertes (decisión del usuario). El mando se ve igual en todos los juegos.
- **No:** quitar los huecos de las direcciones no usadas ni mantener las formas en fila de SPEC 10.
- **Sí:** solo las letras A/B en los botones, como la referencia (decisión del usuario), con una **leyenda pequeña** en la carcasa para que se entienda qué hace cada uno (decisión del usuario).
- **No:** etiquetas del juego dentro de los botones.
- **Sí:** asignación por posición: la última acción es A (magenta) y la anterior es B (cian). Los `touch.ts` actuales ya están en ese orden (la acción principal va última), así que solo cambia la etiqueta de ASTEROIDES.
- **No:** un campo de letra o de color en `TouchButton`.
- **Sí:** máximo 2 acciones, impuesto por el tipo (decisión del usuario). Los juegos futuros se adaptan; `mobile-porter` lo sabe.
- **No:** botones C/D con más colores.
- **Sí:** colores de la referencia, B cian y A magenta (decisión del usuario). Se abandona el amarillo de SPEC 10.
- **Sí:** dos medias carcasas en horizontal (decisión del usuario), conservando la maqueta a los lados del CRT de SPEC 10.
- **No:** carcasa solo en vertical.
- **Sí:** flechas SVG y gema animada de la referencia, con la animación desactivada en `prefers-reduced-motion` y en pausa (decisión del usuario).
- **No:** reflejar el teclado en el gamepad ni `:hover`. El pad solo existe con `pointer: coarse`.
- **No:** que el pad siga la skin del juego. Queda para otra spec si hace falta.

---

## Riesgos

| Riesgo                                                                                         | Mitigación                                                                                                                                          |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| La cruz completa (156 px) y los A/B (74 px) no caben a 360 px o en horizontal con poca altura. | Escalones de tamaño a ≤ 620 px y ≤ 400 px. Hay criterios específicos a 360×740 y 915×412.                                                           |
| Con solo A/B, el jugador no sabe qué hace cada botón.                                          | Leyenda en la carcasa tomada de `label`, y `aria-label` en cada botón.                                                                              |
| Un jugador toca una dirección atenuada y cree que el pad falla.                                | Opacidad baja y sin estado pulsado; se aceptan como parte del aspecto de mando.                                                                     |
| Al rehacer el marcado se rompe la lógica de SPEC 10 (teclas pegadas, multitáctil).             | La lógica de punteros no se toca, solo el JSX y el CSS. Se repasan los criterios de comportamiento de SPEC 10.                                      |
| `display: contents` del pad en horizontal hace que se pierda la carcasa.                       | La carcasa se aplica a cada `.tp-side` en horizontal (medias carcasas), no al contenedor.                                                           |
| La gema animada y los resplandores cuestan rendimiento en móviles modestos.                    | Una sola animación de opacidad/escala (barata) que se detiene en pausa y con `prefers-reduced-motion`; los resplandores son `box-shadow` estáticos. |

---

## Lo que **no** está en esta spec

- Cambios de comportamiento del pad o de los gestos.
- Más de dos botones de acción o colores por juego.
- Pad que siga la skin del juego.
- Gamepad visible en escritorio o reflejo del teclado.
- Vibración, pantalla completa e interruptor manual.
- Cambios en motores, `GameCanvas`, Supabase u otras páginas.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
