# Plantilla — spec 02 de game jam: integración en la plataforma

Esqueleto que el agente `game-jam` rellena para `specs/game-jam/<id>/02-<id>-integracion.md`. Modelo de nivel de detalle: los pasos de portada, Supabase y verificación de `specs/09-juego-viborita.md`. **No es texto para copiar tal cual:**

- Cada `<…>` se sustituye con los valores **idénticos** a los de la spec 01 (id, título, textos, colores).
- La spec final no debe contener ningún `<…>`.

Todo lo que hay debajo de la línea `=== INICIO DE LA SPEC ===` es la spec.

=== INICIO DE LA SPEC ===

# SPEC GJ <id> 02 — Integración de <título en minúsculas>

> **Estado:** Borrador
> **Tema:** <tema recibido, tal cual>
> **Depende de:** SPEC GJ <id> 01 (`specs/game-jam/<id>/01-<id>-motor.md`), SPEC 06, SPEC 06.5
> **Fecha:** <AAAA-MM-DD>
> **Objetivo:** Integrar <TÍTULO> en la plataforma, con su portada, su fila en la tabla `games` de Supabase, el guardado de puntuaciones, su TOP 10 y su pestaña en el Salón de la Fama.

---

## Por qué existe esta spec

La spec 01 dejó el motor de <TÍTULO> jugable en `/juegos/<id>/jugar`, pero el juego aún no aparece en `/juegos` (que se lee de Supabase), no tiene portada y sus puntuaciones no tienen a qué fila de `games` apuntar. Esta spec cierra la receta de SPEC 05, 06 y 06.5 (`.claude/skills/add-game/recipe.md`).

---

## Alcance

**Dentro:**

- **Portada** `.cover-<id>` en `app/globals.css`, en CSS puro, junto a `.cover-<id del último juego real>`: <motivo concreto, colores y composición>. Se diseña con `/frontend-design` y es distinta de las portadas existentes (<portada simulada más parecida, si la hay>).
- **Supabase:** migración de datos `add_game_<id>` aplicada con `apply_migration`, con `insert` en `games` (`sort_order = <n>`) y copia idéntica en `supabase/migrations/`.
- **Guardado:** el modal `FIN DEL JUEGO` guarda vía `saveScoreAction`, sin cambios en la acción.
- **TOP 10** en `/juegos/<id>` y **pestaña** `<TÍTULO>` en `/salon`, sin cambios en `lib/catalog.ts`.
- **Build:** limpieza del `fetch-cache` antes de recompilar (problema conocido de SPEC 07).

**Fuera de alcance (para futuras specs):**

- Cambios en la mecánica, las constantes o el dibujo del motor (son de la spec 01).
- <Sonido y efectos: `03-<id>-pulido.md` si existe.>
- Cambios en el esquema de Supabase, en `lib/catalog.ts` o en `saveScoreAction`.
- No se regenera `lib/supabase/database.types.ts`, porque no hay cambio de esquema.
- El arreglo del `fetch-cache` (`createPublicClient` con `cache: "no-store"`).
- El 404 tras guardar de SPEC 06.
- Tests automatizados.

---

## Modelo de datos

```sql
-- supabase/migrations/<version>_add_game_<id>.sql
insert into public.games (id, title, short_description, long_description, category, cover, color, sort_order)
values (
  '<id>',
  '<TÍTULO>',
  '<short, idéntico a GAMES>',
  '<long, idéntico a GAMES>',
  '<CAT>',
  'cover-<id>',
  '<color>',
  <n>
);
```

Archivos:

- `app/globals.css`: clase `.cover-<id>`.
- `supabase/migrations/<version>_add_game_<id>.sql`: el SQL de arriba, con la versión de `list_migrations`.

---

## Plan de implementación

1. **Portada.** Diseñar `.cover-<id>` en `app/globals.css` con `/frontend-design`. Comprobación: la tarjeta de la landing (que usa `GAMES`) muestra la portada.
2. **Fila en Supabase.**
   - Comprobar con `list_tables` y `select id, sort_order from public.games` que el siguiente `sort_order` libre es `<n>`.
   - Aplicar `add_game_<id>` con `apply_migration` y guardar el mismo SQL en `supabase/migrations/<version>_add_game_<id>.sql`, con la versión de `list_migrations`.
   - Verificar con `select * from games where id = '<id>'` y con `get_advisors` (seguridad), sin avisos nuevos.
   - Antes de recompilar, borrar el contenido de `.next/cache/fetch-cache/` (y `.next/server/route-cache` si existe). Después del build, comprobar que `.next/server/app/juegos.html` contiene `<TÍTULO>`.
3. **Verificación y limpieza.**
   - Jugar una partida completa en `/juegos/<id>/jugar` y guardar.
   - Comprobar el TOP 10 de `/juegos/<id>` y la pestaña `<TÍTULO>` de `/salon`, cargando las URLs directamente.
   - Comprobar que ASTEROIDES, TETRA, REBOTE y VIBORITA no tienen regresiones.
   - Borrar las puntuaciones de prueba con `execute_sql`, sin tocar las del usuario.
   - `npm run lint` y `npm run build`.

Reglas transversales:

- Los cambios en Supabase solo con `apply_migration`. `execute_sql` solo para lecturas y para borrar las puntuaciones de prueba.
- No se usa la `service_role` / secret key.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/juegos` muestra las tarjetas reales en este orden: ASTEROIDES, TETRA, REBOTE, VIBORITA <y los juegos posteriores>, y <TÍTULO>. <TÍTULO> lleva la portada `.cover-<id>` y acento <color>.
- [ ] Sin puntuaciones, `/juegos/<id>` muestra `Mejor puntuación 0`, `Partidas 0` y `▸ SIN PUNTUACIONES — SÉ EL PRIMERO_`.
- [ ] Tras una partida, `GUARDAR PUNTUACIÓN` muestra `PUNTUACIÓN GUARDADA`. Al cargar `/juegos/<id>` y `/salon`, la fila aparece en el TOP 10 y en la pestaña `<TÍTULO>`.
- [ ] `/salon` muestra las pestañas de todos los juegos reales, incluida `<TÍTULO>`, y cambiar de una a otra no produce errores en consola.
- [ ] `select * from games where id = '<id>'` devuelve la fila con los textos de `GAMES` y `sort_order = <n>`. `supabase/migrations/` coincide con `list_migrations`.
- [ ] `get_advisors` (seguridad) no muestra avisos nuevos.
- [ ] ASTEROIDES, TETRA, REBOTE y VIBORITA se juegan y guardan igual que antes.
- [ ] La consola no muestra errores durante una partida completa con guardado (cargando las URLs directamente).
- [ ] Las puntuaciones de prueba se borran de `scores` al terminar.

---

## Decisiones

- **Sí:** <motivo de la portada, con justificación>.
- **No:** <portadas existentes que no se reutilizan, con el motivo>.
- **Sí:** `sort_order = <n>`, el siguiente libre.
- **Sí:** integración en una spec aparte de la del motor. Así el motor se revisa y se juega antes de tocar Supabase.

---

## Riesgos

| Riesgo                                                                                               | Mitigación                                                                                                       |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| El 404 tras `updateTag` de SPEC 06 al navegar justo después de guardar.                              | Fuera de alcance. Los criterios de consola se comprueban cargando la URL directamente.                           |
| El catálogo prerenderizado sale sin <TÍTULO> por `.next/cache/fetch-cache` (SPEC 07, sin resolver).  | El paso 2 borra el `fetch-cache` antes de recompilar y comprueba que `.next/server/app/juegos.html` contiene `<TÍTULO>`. |
| Otro juego ocupó el `sort_order` <n> entre la redacción y la implementación.                         | El paso 2 lo comprueba antes de aplicar la migración y usa el siguiente libre.                                   |
| <Riesgos propios de la portada o del texto del catálogo.>                                            | <mitigación>                                                                                                     |

---

## Preguntas abiertas

- <Dudas que el agente no pudo cerrar sin el usuario. Si no hay, "Ninguna.">

---

## Lo que **no** está en esta spec

- <Resumen de "Fuera de alcance".>

Cada una de estas cosas, si llega, irá en su propia spec.
