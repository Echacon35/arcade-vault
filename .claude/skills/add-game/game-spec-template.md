# Plantilla — spec de integración de un juego

Esqueleto que la skill `/add-game` rellena en la fase 4. Sigue el formato de las specs del repo (SPEC 05, 06 y 06.5). **No es texto para copiar tal cual:**

- Cada `<…>` se sustituye con datos de la ficha de análisis o con respuestas del usuario.
- Las líneas `[si E1]`, `[si E2]`, `[si E3]` y `[si ratón]` solo se incluyen si aplican; la etiqueta se quita.
- La spec final no debe contener ningún `<…>` ni ninguna etiqueta `[si …]`.

Todo lo que hay debajo de la línea `=== INICIO DE LA SPEC ===` es la spec.

=== INICIO DE LA SPEC ===

# SPEC <NN> — Juego real de <título en minúsculas>

> **Estado:** Borrador
> **Depende de:** SPEC 05, SPEC 06, SPEC 06.5
> **Fecha:** <fecha del contexto de la sesión>
> **Objetivo:** Portar a TypeScript el juego de `references/started-games/<carpeta>` y hacerlo jugable en `/juegos/<id>/jugar`, con su fila en la tabla `games` de Supabase, su TOP 10 y su pestaña en el Salón de la Fama.

---

## Por qué existe esta spec

<Una o dos frases: qué juego es y por qué se integra ahora.>

Particularidades del original (de la ficha de análisis):

- **Fuente:** `references/started-games/<carpeta>`: <archivos y líneas>.
- **Por qué no se usa tal cual:** <estado global, listeners sin quitar, rAF sin fin, DOM propio, localStorage…>.
- **Diferencias con el contrato de motor:** <qué encaja con las reglas sin cambio de plataforma y qué extensiones necesita>.
- **La mecánica no cambia.** Las constantes de <física / puntos / niveles…> se copian sin modificar.

---

## Alcance

**Dentro:**

- [si E1/E2/E3] **Extensiones de contrato:** <E1 vidas opcionales / E2 assets en `public/games/<id>/` / E3 sonido>, retrocompatibles con ASTEROIDES.
- **Motor TypeScript** en `games/<id>/`:
  - <entidades o estructuras portadas>;
  - constantes idénticas: <lista con valores: puntos, velocidades, niveles, tiempos…>;
  - sin estado global; `create<Nombre>Game(canvas, callbacks)` devuelve `pause`, `resume`, `restart` y `destroy`.
- **Controles:** <teclas por `KeyboardEvent.code`>. [si ratón] <uso del ratón en el canvas>. `P` y `Esc` pausan y reanudan. Las teclas del juego hacen `preventDefault()` mientras está montado.
- **Visual** con la paleta neón del Vault (`COLORS`): <qué color recibe cada elemento>. Fondo `#000`.
- **Canvas** de 800×600 dentro de `.crt-screen`. <Cómo se coloca el área de juego, si no es 4:3, y qué paneles auxiliares se dibujan dentro.>
- **HUD en React:** puntuación, <vidas con `♥` / `—` (E1)> y nivel salen de `onStats`. Del canvas se quitan <SCORE, LIVES, GAME OVER, overlays…>. En el canvas solo queda <indicadores efímeros o "nada">.
- **Fin de partida:**
  - <condición de game over>: el motor se detiene y se abre `FIN DEL JUEGO`, con guardado vía `saveScoreAction`.
  - `FIN` abandona sin guardar.
  - `JUGAR DE NUEVO` llama a `restart()`.
  - Se elimina <el reinicio interno del original>.
- **Registro** del motor en `GAME_ENGINES` (`games/registry.ts`).
- **Catálogo:** entrada en `GAMES` de `lib/games.ts`, con `id: "<id>"`, `title: "<TÍTULO>"`, `cat: "<CAT>"`, `color: "<color>"`, `cover: "cover-<id>"`, `best: 0`, `plays: "0"` y los textos `short`/`long` acordados.
- **Portada** `.cover-<id>` en `app/globals.css`: <motivo y colores acordados>.
- **Supabase:** migración de datos `add_game_<id>` aplicada con `apply_migration`, con `insert` en `games` (`sort_order = <n>`) y copia idéntica en `supabase/migrations/`.

**Fuera de alcance (para futuras specs):**

- <Partes del original que se descartan: tema, localStorage, botones DOM…>.
- <Necesidades fuera del contrato, con la nota "requiere spec de plataforma">.
- Controles táctiles y soporte móvil jugable.
- Cambios en el esquema de Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- El 404 tras guardar de SPEC 06.
- Tests automatizados.

---

## Modelo de datos

```text
// games/<id>/engine.ts — estado interno, nunca en el nivel del módulo
type Phase = <"playing" | "gameover" | …>;
type State = {
  <campos reales del juego>;
  score: number;
  <lives: number; | (E1) sin vidas>
  level: number;
  phase: Phase;
  paused: boolean;
};
```

[si E1]

```ts
// games/types.ts
export type GameStats = { score: number; lives: number | null; level: number };
```

```sql
-- supabase/migrations/<version>_add_game_<id>.sql
insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values ('<id>', '<TÍTULO>', '<short>', '<long>', '<CAT>', 'cover-<id>', '<color>', <n>);
```

En la spec final, el primer bloque usa la etiqueta `ts` en lugar de `text`.

Archivos del motor:

- `games/<id>/constants.ts`: `W`, `H`, constantes de mecánica y `COLORS`.
- `games/<id>/<entities|board|…>.ts`: <qué contiene>.
- [si E2] `games/<id>/sprites.ts`: coordenadas del spritesheet.
- `games/<id>/engine.ts`: `create<Nombre>Game`.

Convenciones:

- Coordenadas en el espacio lógico 800×600, con origen arriba a la izquierda. `dt` en segundos, limitado a <valor>.
- `games/` solo se importa desde Client Components. Ningún módulo toca `window` ni `document` al importarse.
- Las teclas se leen de `KeyboardEvent.code`.

---

## Plan de implementación

<Numerado desde 1. Primero las extensiones, después los pasos 1–5 de recipe.md.>

1. [si E1] **Vidas opcionales (E1).** <cambios de contract.md>. ASTEROIDES sigue mostrando `♥ ♥ ♥`. `npm run build` pasa.
2. [si E2] **Assets (E2).** Copiar <archivos> a `public/games/<id>/`, con carga en la factory y pantalla `CARGANDO…`.
3. [si E3] **Sonido (E3).** <sonidos> con `new Audio` en la factory, parados en `pause()` y `destroy()`.
4. **Constantes y entidades.** Crear `games/<id>/constants.ts` y <archivos>, portados con tipos y la paleta neón. Todavía no se usan.
5. **Motor y registro.** Crear `games/<id>/engine.ts` con `create<Nombre>Game` (bucle, input, `update`/`draw` sin HUD, `onStats` solo con cambios, `onGameOver`, `pause`/`resume`/`restart`/`destroy`). Registrarlo en `GAME_ENGINES`.
6. **Catálogo y portada.** Entrada `<id>` en `GAMES` y `.cover-<id>` con `/frontend-design`. Comprobación: `/juegos/<id>/jugar` carga el motor.
7. **Fila en Supabase.** `apply_migration` `add_game_<id>`, copia en `supabase/migrations/` con la versión de `list_migrations`, `select` de verificación y `get_advisors`.
8. **Verificación y limpieza.** Partida completa, guardado, TOP 10 y Salón; ASTEROIDES sin regresiones; borrar las puntuaciones de prueba; `npm run lint` y `npm run build`.

Reglas transversales:

- Los cambios en Supabase solo con `apply_migration`. `execute_sql` solo para lecturas y para borrar las puntuaciones de prueba.
- No se usa la `service_role` / secret key.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos` muestra la tarjeta `<TÍTULO>` con la portada `.cover-<id>`, y ASTEROIDES sigue en el catálogo.
- [ ] Sin puntuaciones, `/juegos/<id>` muestra `Mejor puntuación 0`, `Partidas 0` y `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- [ ] `/juegos/<id>/jugar` muestra el canvas dentro del CRT con <estado inicial concreto>.
- [ ] <Un criterio por control: tecla → efecto.>
- [ ] Pulsar las teclas del juego no desplaza la página.
- [ ] <Un criterio por regla de puntuación, con valores exactos.>
- [ ] <Criterios de vidas / nivel / velocidad / dificultad, con valores exactos.>
- [ ] El canvas no pinta <SCORE, LIVES, GAME OVER…>.
- [ ] `P`, `Esc` y el botón `PAUSA` congelan el juego y muestran `EN PAUSA`; cualquiera de los tres lo reanuda. Cambiar de pestaña lo pausa.
- [ ] <Condición de game over> abre `FIN DEL JUEGO` con la puntuación real. `GUARDAR PUNTUACIÓN` muestra `PUNTUACIÓN GUARDADA`, y al cargar `/juegos/<id>` y `/salon` (pestaña `<TÍTULO>`) aparece la fila.
- [ ] `FIN` abre el modal sin campo de nombre, con `▸ PARTIDA ABANDONADA — NO SE GUARDA_`.
- [ ] `JUGAR DE NUEVO` empieza una partida con puntuación 0, <vidas> y nivel 01.
- [ ] Al pulsar `SALIR` y volver a entrar, solo corre un bucle y no quedan listeners del juego en otras páginas.
- [ ] [si E1] ASTEROIDES sigue mostrando `♥ ♥ ♥` y <id> muestra `—` en Vidas.
- [ ] [si E2] La consola no muestra 404 de assets; `destroy()` durante la carga no deja el bucle vivo.
- [ ] [si E3] Al pausar o salir no queda ningún sonido sonando.
- [ ] `select * from games where id = '<id>'` devuelve la fila con los textos de `GAMES`; `supabase/migrations/` coincide con `list_migrations`.
- [ ] ASTEROIDES se juega y guarda igual que antes.
- [ ] Ningún archivo de `games/<id>/` declara estado mutable en el nivel del módulo.
- [ ] La consola no muestra errores durante una partida completa (cargando las URLs directamente).
- [ ] Las puntuaciones de prueba se borran de `scores` al terminar.

---

## Decisiones

- **Sí:** portar a TypeScript modular en `games/<id>/`, con el contrato `GameFactory`. Sobrevive a la navegación SPA.
- **No:** servir el `game.js` original con `<Script>` o en un iframe. Sus globales y listeners chocan con el App Router e impiden integrar el HUD y el modal.
- **Sí:** <cada respuesta de la fase 3, con su justificación>.
- **No:** <cada alternativa descartada, con su justificación>.

---

## Riesgos

| Riesgo                                                                               | Mitigación                                                                                 |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| El 404 tras `updateTag` de SPEC 06 al navegar justo después de guardar.              | Fuera de alcance; los criterios de consola se comprueban cargando la URL directamente.     |
| El Strict Mode monta el efecto dos veces en dev y crea dos bucles.                   | `destroy()` cancela el rAF y los listeners; un criterio comprueba que solo corre un bucle. |
| Las teclas del juego interfieren con el input de nombre del modal.                   | El motor ignora el teclado si está pausado, en game over o con el foco en un `input`.      |
| <Riesgos específicos del juego: carga de assets, autoplay de audio, tablero no 4:3…> | <mitigación>                                                                               |

---

## Lo que **no** está en esta spec

- <Resumen de "Fuera de alcance".>

Cada una de estas cosas, si llega, irá en su propia spec.
