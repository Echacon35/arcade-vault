# SPEC GJ ranaria 02 — Integración de ranaria

> **Estado:** Borrador
> **Tema:** RANARIA (id `ranaria`): cruce por carriles con timing; mecánica nueva en el catálogo; da motor real a la entrada simulada existente en `lib/games.ts`
> **Depende de:** SPEC GJ ranaria 01 (`specs/game-jam/ranaria/01-ranaria-motor.md`), SPEC 06, SPEC 06.5
> **Fecha:** 2026-11-11
> **Objetivo:** Integrar RANARIA en la plataforma, con su portada, su fila en la tabla `games` de Supabase, el guardado de puntuaciones, su TOP 10 y su pestaña en el Salón de la Fama.

---

## Por qué existe esta spec

La spec 01 dejó el motor de RANARIA jugable en `/juegos/ranaria/jugar` y actualizó su entrada en `GAMES`, pero la clase `cover-ranaria` aún no existe, el juego no aparece en `/juegos` (que se lee de Supabase) y sus puntuaciones no tienen a qué fila de `games` apuntar. Esta spec cierra la receta de SPEC 05, 06 y 06.5 (`.claude/skills/add-game/recipe.md`).

Particularidad: a diferencia de TETRA, REBOTE y VIBORITA, `ranaria` ya existía como entrada simulada. En el repo no hay ninguna migración que la inserte (`supabase/migrations/` solo tiene `asteroides`, `tetra`, `rebote` y `viborita`), así que lo esperado es que **no** tenga fila en `games`. Aun así, el paso 2 lo verifica en Supabase con el MCP antes de decidir entre insertar o actualizar.

---

## Alcance

**Dentro:**

- **Portada** `.cover-ranaria` en `app/globals.css`, en CSS puro, junto a `.cover-viborita`: vista cenital de tres franjas horizontales de carril sobre fondo negro azulado (una pista `#0a0a18` con dos rayos magenta `#ff006e` con glow y punta blanca, un cable cian `#00f5ff` con un zigzag de descarga, y una ciénaga `#001a22` con dos nenúfares verdes `#00ff88` con muesca), una rana amarilla `#f5ff00` vista desde arriba sobre el nenúfar central (cuerpo ovalado, dos ojos negros, patas en arco) con halo amarillo, y tres luciérnagas (punto tinta con halo lima `#b6ff3b`) dispersas. Unidades relativas con `container-type: size` como `.cover-viborita`. Se diseña con `/frontend-design` y es distinta de las portadas existentes, en particular de `.cover-rana` (franjas cian y un círculo verde).
- **Borrar** `.cover-rana` y `.cover-rana::after` de `app/globals.css`: tras la spec 01 ya no la usa ninguna entrada (comprobar con una búsqueda de `cover-rana` antes de borrar).
- **Supabase:** migración de datos `add_game_ranaria` (si la fila no existe) o `update_game_ranaria` (si existe), aplicada con `apply_migration`, con copia idéntica en `supabase/migrations/`.
- **Guardado:** el modal `FIN DEL JUEGO` guarda vía `saveScoreAction`, sin cambios en la acción.
- **TOP 10** en `/juegos/ranaria` y **pestaña** `RANARIA` en `/salon`, sin cambios en `lib/catalog.ts`.
- **Build:** limpieza del `fetch-cache` antes de recompilar (problema conocido de SPEC 07).

**Fuera de alcance (para futuras specs):**

- Cambios en la mecánica, las constantes o el dibujo del motor (son de la spec 01).
- Sonido y efectos: `03-ranaria-pulido.md`.
- Cambios en el esquema de Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- No se regenera `lib/supabase/database.types.ts`, porque no hay cambio de esquema.
- El arreglo del `fetch-cache` (`createPublicClient` con `cache: "no-store"`).
- El 404 tras guardar de SPEC 06.
- Tests automatizados.

---

## Modelo de datos

Caso esperado, **la fila no existe**:

```sql
-- supabase/migrations/<version>_add_game_ranaria.sql
insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values (
  'ranaria',
  'RANARIA',
  'Cruza el pantano de neón, ida y vuelta.',
  'Guía a la rana dorada por un pantano que cambia en cada nivel: esquiva los rayos de las pistas, cruza la ciénaga sobre nenúfares a la deriva y no pises un cable cuando descarga. Cada nivel son tres cruces de ida y vuelta contra el reloj. Atrapa luciérnagas para ganar tiempo y subir el multiplicador hasta ×5; perder una vida lo devuelve a ×1.',
  'ARCADE',
  'cover-ranaria',
  'yellow',
  5
);
```

Caso alternativo, **la fila ya existe** (creada fuera del historial de migraciones):

```sql
-- supabase/migrations/<version>_update_game_ranaria.sql
update public.games
set title = 'RANARIA',
    short_description = 'Cruza el pantano de neón, ida y vuelta.',
    long_description = 'Guía a la rana dorada por un pantano que cambia en cada nivel: esquiva los rayos de las pistas, cruza la ciénaga sobre nenúfares a la deriva y no pises un cable cuando descarga. Cada nivel son tres cruces de ida y vuelta contra el reloj. Atrapa luciérnagas para ganar tiempo y subir el multiplicador hasta ×5; perder una vida lo devuelve a ×1.',
    category = 'ARCADE',
    cover = 'cover-ranaria',
    color = 'yellow',
    sort_order = 5
where id = 'ranaria';
```

- Los textos son idénticos a los de `GAMES` tras la spec 01. No contienen comillas simples, así que no hay que escapar nada; si cambian, se escapan con `''`.
- `sort_order = 5` es el siguiente libre tras `viborita` (4) en el momento de redactar; el paso 2 lo confirma.

Archivos:

- `app/globals.css`: clase `.cover-ranaria` nueva; `.cover-rana` borrada.
- `supabase/migrations/<version>_add_game_ranaria.sql` (o `<version>_update_game_ranaria.sql`): el SQL aplicado, con la versión de `list_migrations`.

---

## Plan de implementación

1. **Portada.**
   - Diseñar `.cover-ranaria` en `app/globals.css` con `/frontend-design`, junto a `.cover-viborita`.
   - Buscar `cover-rana` en el repo (fuera de `specs/` y `references/`); si solo queda la definición en `globals.css`, borrar `.cover-rana` y `.cover-rana::after`.
   - Comprobación: la tarjeta de RANARIA en la landing (que usa `GAMES`) muestra la portada nueva con acento amarillo.
2. **Fila en Supabase.**
   - Con el MCP de Supabase: `list_tables`, `select id, sort_order from public.games order by sort_order` y `select * from public.games where id = 'ranaria'`.
   - Confirmar el `sort_order`: el siguiente libre tras los juegos reales (5 si ningún otro juego lo ha ocupado antes); si está ocupado, usar el siguiente libre y ajustar el SQL.
   - Si **no** hay fila: aplicar `add_game_ranaria` (insert). Si **hay** fila: comprobar `select count(*) from public.scores where game_id = 'ranaria'` y aplicar `update_game_ranaria` (update). Si había puntuaciones previas, **no** se borran sin preguntar al usuario (ver "Preguntas abiertas").
   - Guardar el mismo SQL en `supabase/migrations/<version>_<nombre>.sql`, con la versión que devuelve `list_migrations`.
   - Verificar con `select * from games where id = 'ranaria'` y con `get_advisors` (seguridad), sin avisos nuevos.
   - Antes de recompilar, borrar el contenido de `.next/cache/fetch-cache/` (y `.next/server/route-cache` si existe). Después del build, comprobar que `.next/server/app/juegos.html` contiene `RANARIA`.
3. **Verificación y limpieza.**
   - Jugar una partida completa en `/juegos/ranaria/jugar` y guardar.
   - Comprobar el TOP 10 de `/juegos/ranaria` y la pestaña `RANARIA` de `/salon`, cargando las URLs directamente.
   - Comprobar que ASTEROIDES, TETRA, REBOTE y VIBORITA no tienen regresiones.
   - Borrar las puntuaciones de prueba con `execute_sql`, sin tocar las del usuario.
   - `npm run lint` y `npm run build`.

Reglas transversales:

- Los cambios en Supabase solo con `apply_migration`. `execute_sql` solo para lecturas y para borrar las puntuaciones de prueba.
- No se usa la `service_role` / secret key.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos` muestra las tarjetas reales en este orden: ASTEROIDES, TETRA, REBOTE, VIBORITA, los juegos reales que se hayan integrado antes con `sort_order` menor, y RANARIA. RANARIA lleva la portada `.cover-ranaria` y acento amarillo.
- [ ] La landing muestra RANARIA con la portada nueva; `cover-rana` ya no existe en `app/globals.css`.
- [ ] Sin puntuaciones, `/juegos/ranaria` muestra `Mejor puntuación 0`, `Partidas 0` y `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- [ ] Tras una partida, `GUARDAR PUNTUACIÓN` muestra `PUNTUACIÓN GUARDADA`. Al cargar `/juegos/ranaria` y `/salon`, la fila aparece en el TOP 10 y en la pestaña `RANARIA`.
- [ ] `/salon` muestra las pestañas de todos los juegos reales, incluida `RANARIA`, y cambiar de una a otra no produce errores en consola.
- [ ] `select * from games where id = 'ranaria'` devuelve la fila con los textos de `GAMES`, `cover = 'cover-ranaria'`, `color = 'yellow'` y el `sort_order` confirmado en el paso 2. `supabase/migrations/` coincide con `list_migrations`.
- [ ] `get_advisors` (seguridad) no muestra avisos nuevos.
- [ ] ASTEROIDES, TETRA, REBOTE y VIBORITA se juegan y guardan igual que antes.
- [ ] La consola no muestra errores durante una partida completa con guardado (cargando las URLs directamente).
- [ ] Las puntuaciones de prueba se borran de `scores` al terminar.

---

## Decisiones

- **Sí:** portada con tres franjas de carril propias (pista con rayos, cable descargando, ciénaga con nenúfares), la rana dorada y luciérnagas. Decisión del agente: resume en una imagen los tres peligros propios del juego y la mecánica distintiva, y el amarillo de la rana coincide con el acento `yellow`.
- **No:** reutilizar `.cover-rana`. Decisión del agente: es una portada simulada genérica (franjas y un círculo verde) que no cuenta el juego, no sigue la convención `cover-<id>` y usa el verde que el juego ya no tiene.
- **No:** reutilizar el estilo de rejilla de `.cover-viborita` ni los bloques de `.cover-tetra`. Las franjas horizontales en movimiento son el motivo propio de RANARIA.
- **Sí:** verificar la fila en Supabase antes de elegir `insert` o `update`. Decisión del agente: el historial de migraciones no tiene `ranaria`, pero la entrada simulada pudo sembrarse a mano; la migración de actualización cubre ese caso sin romper la clave primaria.
- **Sí:** `sort_order = 5`, el siguiente libre tras VIBORITA, confirmado al implementar.
- **Sí:** integración en una spec aparte de la del motor. Así el motor se revisa y se juega antes de tocar Supabase.

---

## Riesgos

| Riesgo                                                                                                  | Mitigación                                                                                                              |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| El 404 tras `updateTag` de SPEC 06 al navegar justo después de guardar.                                 | Fuera de alcance. Los criterios de consola se comprueban cargando la URL directamente.                                  |
| El catálogo prerenderizado sale sin RANARIA por `.next/cache/fetch-cache` (SPEC 07, sin resolver).      | El paso 2 borra el `fetch-cache` antes de recompilar y comprueba que `.next/server/app/juegos.html` contiene `RANARIA`. |
| Otro juego ocupó el `sort_order` 5 entre la redacción y la implementación.                              | El paso 2 lo comprueba antes de aplicar la migración y usa el siguiente libre.                                          |
| La fila `ranaria` ya existe con datos antiguos y un `insert` falla por clave duplicada.                 | El paso 2 consulta la fila antes y, si existe, aplica `update_game_ranaria` en lugar de `add_game_ranaria`.             |
| Hay puntuaciones antiguas de `ranaria` (de una fila sembrada a mano) que no corresponden al motor real. | No se borran sin decisión del usuario; se pregunta (ver "Preguntas abiertas").                                          |
| Borrar `.cover-rana` rompe otra tarjeta que la usara.                                                   | Se busca `cover-rana` en el repo antes de borrarla; tras la spec 01 solo la definía `globals.css`.                      |
| La portada con muchos gradientes se ve borrosa a tamaño de tarjeta pequeña.                             | Unidades relativas con `container-type: size` y revisión visual con Playwright en la landing y en `/juegos`.            |

---

## Preguntas abiertas

- Si al verificar en Supabase la fila `ranaria` ya existe y tiene puntuaciones previas, ¿se conservan o se borran? Por defecto, se conservan y se pregunta antes de tocarlas.

---

## Lo que **no** está en esta spec

- Cambios de mecánica, constantes o dibujo del motor.
- Sonido y efectos (spec 03).
- Cambios en el esquema de Supabase, en `lib/catalog.ts` o en `saveScoreAction`, y regenerar los tipos.
- El arreglo del `fetch-cache` y el 404 tras guardar.
- Tests automatizados.

Cada una de estas cosas, si llega, irá en su propia spec.
