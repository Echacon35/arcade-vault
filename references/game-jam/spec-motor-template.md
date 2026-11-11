# Plantilla — spec 01 de game jam: motor jugable

Esqueleto que el agente `game-jam` rellena para `specs/game-jam/<id>/01-<id>-motor.md`. Modelo de nivel de detalle: `specs/09-juego-viborita.md` (juego sin código original). **No es texto para copiar tal cual:**

- Cada `<…>` se sustituye con valores concretos decididos por el agente.
- Las líneas `[si ratón]`, `[si sin vidas]`, `[si E2]` solo se incluyen si aplican; la etiqueta se quita.
- La spec final no debe contener ningún `<…>` ni ninguna etiqueta `[si …]`.
- Esta spec deja el juego **jugable** en `/juegos/<id>/jugar`. Guardar la puntuación, la portada y la fila en Supabase van en la spec 02.

Todo lo que hay debajo de la línea `=== INICIO DE LA SPEC ===` es la spec.

=== INICIO DE LA SPEC ===

# SPEC GJ <id> 01 — Motor de <título en minúsculas>

> **Estado:** Borrador
> **Tema:** <tema recibido, tal cual>
> **Depende de:** SPEC 05, SPEC 06, SPEC 06.5
> **Fecha:** <AAAA-MM-DD>
> **Objetivo:** Crear desde cero el motor de <TÍTULO>, un juego original sobre el tema «<tema>», y hacerlo jugable en `/juegos/<id>/jugar`.

---

## Por qué existe esta spec

<Una o dos frases: qué juego es, cómo interpreta el tema y por qué encaja en el catálogo actual (qué categoría o mecánica aporta frente a ASTEROIDES, TETRA, REBOTE y VIBORITA).>

Particularidades:

- **Sin original.** No hay código en `references/started-games/`. Todas las constantes de esta spec son decisiones del agente `game-jam` y son la única fuente de verdad del motor.
- **Primera de dos fases.** Esta spec crea el motor, lo registra y añade la entrada en `GAMES`. La spec `02-<id>-integracion.md` añade la portada, la fila en Supabase, el guardado, el TOP 10 y el Salón.
- **Encaje con el contrato de motor:**
  - <Cómo ocupa el área de juego el canvas de 800×600; si no es 4:3, cómo se centra y qué va en los márgenes.>
  - <Teclado / [si ratón] ratón en el canvas.>
  - <Vidas como número / [si sin vidas] 1 vida fingida (`lives` 1 → 0) sin E1, como TETRA.>
  - <Imágenes y sonido: ninguno (vector neón) / [si E2] …>. El sonido, si lo hay, va en la spec 03.
  - `isTypingTarget` ya está en `games/shared/input.ts`.

---

## Alcance

**Dentro:**

- **Motor TypeScript** en `games/<id>/`:
  - **<Área de juego / tablero>:** <dimensiones y unidades exactas>.
  - **<Entidad 1>:** <tamaño, posición inicial, velocidad, comportamiento>.
  - **<Entidad 2…>:** <…>.
  - **Puntuación:** <cada regla con valores exactos y fórmula>.
  - **Nivel / dificultad:** <fórmula exacta, con un ejemplo numérico como en SPEC 09>.
  - **Vidas:** <`START_LIVES = n` y qué pasa al perder una>.
  - **Fin de partida:** <condiciones exactas>.
  - **Bucle:** `requestAnimationFrame` con `dt` en segundos, tope `MAX_DT = <valor>` y primer frame con `dt = 0`. `resume()` reinicia `lastTime`.
  - **Sin estado global:** `create<Nombre>Game(canvas, callbacks)` devuelve `pause`, `resume`, `restart` y `destroy`.
- **Controles:**
  - <Tecla(s) por `KeyboardEvent.code` → efecto, una línea por acción; si se repite al mantener o no>.
  - [si ratón] <Uso del ratón en el canvas, con coordenadas convertidas a 800×600 con `getBoundingClientRect()`.>
  - `KeyP` y `Escape` llaman a `onPauseToggle()`, sin repetición.
  - Las teclas del juego hacen `preventDefault()` mientras el juego está montado.
  - El teclado se ignora si el juego está pausado, si la partida terminó o si el foco está en un campo de texto (`isTypingTarget` de `games/shared/input.ts`).
  - <Qué se suelta o vacía al pausar.>
- **Visual** con la paleta neón del Vault (`COLORS`):
  - fondo `#000`;
  - <elemento → color hex y forma de dibujo (primitivas de canvas, glow con `shadowBlur`…)>;
  - <textos dentro del canvas, si los hay, en `monospace`, con color y posición>.
- **Canvas** de 800×600 dentro de `.crt-screen`, <con el área completa / con el área centrada y paneles auxiliares en los márgenes>.
- **HUD en React:** la puntuación, las vidas (<`♥ ♥ ♥` / `♥`>, y `—` al terminar) y el nivel salen de `onStats`. En el canvas no se pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`; solo <lista exacta de lo que se dibuja>.
- **Fin de partida:**
  - <Condición>: el motor se detiene, emite las estadísticas finales y llama una vez a `onGameOver(score)`. Se abre `FIN DEL JUEGO`.
  - `FIN` abandona sin guardar.
  - `JUGAR DE NUEVO` llama a `restart()`: <estado inicial exacto>.
- **Registro** del motor en `GAME_ENGINES` (`games/registry.ts`) con la clave `<id>`.
- **Catálogo:** entrada nueva en `GAMES` de `lib/games.ts`, justo después de `<id del último juego real>` (necesaria para que `generateStaticParams` genere `/juegos/<id>/jugar`):

  | Campo   | Valor              |
  | ------- | ------------------ |
  | `id`    | `"<id>"`           |
  | `title` | `"<TÍTULO>"`       |
  | `cat`   | `"<CAT>"`          |
  | `color` | `"<color>"`        |
  | `cover` | `"cover-<id>"`     |
  | `best`  | `0`                |
  | `plays` | `"0"`              |
  | `short` | "<texto corto>"    |
  | `long`  | "<texto largo>"    |

**Fuera de alcance (para futuras specs):**

- La portada `.cover-<id>`, la fila en la tabla `games` de Supabase, el guardado de la puntuación, el TOP 10 y el Salón: van en `02-<id>-integracion.md`. Hasta entonces la tarjeta no aparece en `/juegos` (se lee de Supabase) y guardar puede fallar.
- <Sonido y efectos extra: van en `03-<id>-pulido.md` si existe, o fuera.>
- <Variantes de la mecánica descartadas.>
- <Necesidades fuera de `.claude/skills/add-game/contract.md`, con la nota "requiere spec de plataforma".>
- Controles táctiles y soporte móvil jugable.
- Cambios en el esquema de Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- Tests automatizados.

---

## Modelo de datos

```ts
// games/<id>/<logica>.ts — tipos y lógica pura, sin estado de módulo
<tipos exportados: Dir, Cell, Entity, StepResult…>
```

```ts
// games/<id>/engine.ts — estado interno, nunca en el nivel del módulo
type Phase = <"waiting" | "playing" | "gameover" | …>;
type State = {
  <campos reales del juego, con comentario de unidades>;
  score: number;
  lives: number;
  level: number;
  phase: Phase;
  paused: boolean;
};
```

Archivos:

- `games/<id>/constants.ts`:
  - `W = 800`, `H = 600` y `MAX_DT = <valor>`;
  - <todas las constantes de mecánica con su valor>;
  - `COLORS`: <cada color con su hex>.
- `games/<id>/<logica>.ts`: funciones puras sin acceso a `window` ni al canvas: <lista de funciones con firma y qué devuelven>.
- `games/<id>/engine.ts`: `create<Nombre>Game`, con el bucle, el input, el dibujado y el ciclo de vida.

Convenciones:

- Coordenadas en el espacio lógico 800×600, con origen arriba a la izquierda. Velocidades en px/s. `dt` en segundos, limitado a `MAX_DT`.
- `games/` solo se importa desde Client Components. Ningún módulo toca `window` ni `document` al importarse.
- Las teclas se leen de `KeyboardEvent.code`.

---

## Plan de implementación

1. **Constantes y lógica.** Crear `games/<id>/constants.ts` y `games/<id>/<logica>.ts` con los valores y funciones del modelo de datos. Todavía no se usan. `npm run build` pasa.
2. **Motor y registro.** Crear `games/<id>/engine.ts` con `create<Nombre>Game`:
   - **Estado inicial:** <fase, entidades>. Emite `onStats({ score: 0, lives: <n>, level: 1 })`.
   - **Bucle:** <qué hace en cada fase>.
   - **Input:** `keydown`/`keyup` en `window` <[si ratón] y `mousemove` en el canvas>.
   - **Dibujo:** <orden de capas>. Sin HUD ni overlays.
   - **Estadísticas y fin:** `onStats` solo cuando cambia algún valor; `onGameOver(score)` una sola vez.
   - **Ciclo de vida:** `pause()` <congela y suelta/vacía…>; `resume()` reinicia `lastTime`; `restart()` vuelve al estado inicial, emite las estadísticas y reanuda; `destroy()` cancela el rAF y quita los listeners.
   - **Registro:** añadir `<id>: create<Nombre>Game` a `GAME_ENGINES`.
3. **Entrada de catálogo.** Añadir la entrada `<id>` en `GAMES`, después de `<id anterior>`. Comprobación manual: `/juegos/<id>/jugar` monta el motor real.
4. **Verificación.** Jugar varias partidas completas comprobando cada criterio, comprobar que ASTEROIDES, TETRA, REBOTE y VIBORITA no tienen regresiones, y `npm run lint` y `npm run build`.

Reglas transversales:

- Esta spec no toca Supabase.
- No se usa la `service_role` / secret key.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos/<id>/jugar` muestra el canvas dentro del CRT con <estado inicial concreto>. El HUD muestra `Puntuación 0`, `Vidas <…>` y `Nivel 01`.
- [ ] <Un criterio por control: tecla → efecto, con valores exactos.>
- [ ] Pulsar las teclas del juego no desplaza la página.
- [ ] <Un criterio por regla de puntuación, con valores exactos.>
- [ ] <Criterios de nivel / velocidad / dificultad, con valores exactos y un ejemplo numérico.>
- [ ] <Criterios de vidas y de cada condición de fin.>
- [ ] El canvas no pinta puntuación, vidas, nivel, `GAME OVER` ni `PAUSA`.
- [ ] `P`, `Esc` y el botón `PAUSA` congelan el juego y muestran `EN PAUSA`; cualquiera de los tres lo reanuda sin saltos. Cambiar de pestaña lo pausa.
- [ ] <Condición de fin> abre `FIN DEL JUEGO` con la puntuación real y el HUD pasa a `Vidas —`.
- [ ] `FIN` abre el modal sin campo de nombre, con `▸ PARTIDA ABANDONADA — NO SE GUARDA_`.
- [ ] `JUGAR DE NUEVO` vuelve a <estado inicial>, con `Puntuación 0`, `Vidas <…>` y `Nivel 01`.
- [ ] Al pulsar `SALIR` y volver a entrar, solo corre un bucle (<velocidad observable que no cambia>) y no quedan listeners del juego en otras páginas.
- [ ] Escribir el nombre en el modal no mueve el juego ni lo pausa.
- [ ] ASTEROIDES, TETRA, REBOTE y VIBORITA se juegan igual que antes.
- [ ] Ningún archivo de `games/<id>/` declara estado mutable en el nivel del módulo.
- [ ] La consola no muestra errores durante una partida completa (cargando la URL directamente).

---

## Decisiones

- **Sí:** juego original creado desde cero en `games/<id>/`, con el contrato `GameFactory`. Decisión del agente: <interpretación del tema>.
- **No:** <conceptos alternativos para el tema que se descartaron, con su justificación>.
- **Sí:** <nombre, id, categoría y color, con justificación (p. ej. `yellow` porque no lo usa ningún motor)>.
- **Sí / No:** <cada decisión de mecánica, controles, visual y puntuación, con su justificación. Las tomadas por el agente llevan "Decisión del agente".>
- **Sí:** dividir el juego en fases (`01` motor, `02` integración). El motor se puede revisar y jugar antes de tocar Supabase.

---

## Riesgos

| Riesgo                                                              | Mitigación                                                                                    |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| El Strict Mode monta el efecto dos veces en dev y crea dos bucles.  | `destroy()` cancela el rAF y quita los listeners. Un criterio comprueba que solo corre uno.   |
| Las teclas del juego interfieren con el input de nombre del modal.  | El motor ignora el teclado si está pausado, en game over o con el foco en un campo de texto.  |
| Un salto de `dt` al reanudar mueve las entidades de golpe.          | `resume()` reinicia `lastTime` y `dt` está limitado a `MAX_DT`.                               |
| Sin código de referencia, una regla queda ambigua al implementar.   | Las constantes de esta spec son la única fuente. Si algo no está aquí, se pregunta.           |
| <Riesgos propios del juego: balance, ghosting de teclas, colisiones…> | <mitigación>                                                                                |

---

## Preguntas abiertas

- <Dudas que el agente no pudo cerrar sin el usuario, con la opción que tomó por defecto. Si no hay, "Ninguna.">

---

## Lo que **no** está en esta spec

- <Resumen de "Fuera de alcance".>

Cada una de estas cosas, si llega, irá en su propia spec.
