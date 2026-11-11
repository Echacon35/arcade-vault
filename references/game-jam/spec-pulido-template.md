# Plantilla — spec 03 de game jam: pulido (opcional)

Esqueleto que el agente `game-jam` rellena para `specs/game-jam/<id>/03-<id>-pulido.md`, **solo si aporta algo propio** al juego (sonido con E3, partículas, efectos de impacto, sacudida de pantalla, transiciones de nivel dentro del canvas…). Modelo de nivel de detalle: la parte de sonido de `specs/08-juego-rebote.md`. **No es texto para copiar tal cual:**

- Cada `<…>` se sustituye con valores concretos.
- Las líneas `[si E3]` y `[si efectos]` solo se incluyen si aplican; la etiqueta se quita.
- La spec final no debe contener ningún `<…>` ni ninguna etiqueta `[si …]`.
- **Regla de oro:** el pulido no cambia la mecánica, las constantes de juego ni la puntuación de la spec 01.

Todo lo que hay debajo de la línea `=== INICIO DE LA SPEC ===` es la spec.

=== INICIO DE LA SPEC ===

# SPEC GJ <id> 03 — Pulido de <título en minúsculas>

> **Estado:** Borrador
> **Tema:** <tema recibido, tal cual>
> **Depende de:** SPEC GJ <id> 02 (`specs/game-jam/<id>/02-<id>-integracion.md`)
> **Fecha:** <AAAA-MM-DD>
> **Objetivo:** <Una frase: qué sensación añade el pulido a <TÍTULO> sin cambiar su mecánica ni su puntuación.>

---

## Por qué existe esta spec

<Qué le falta al juego tras la spec 02 para transmitir el tema, y por qué se separa del motor (se puede descartar sin afectar al leaderboard).>

---

## Alcance

**Dentro:**

- [si E3] **Sonido (E3):** <lista de sonidos, evento que dispara cada uno y archivo en `public/games/<id>/sounds/`>. Origen de los archivos: <generados con una herramienta libre / de una biblioteca con licencia CC0, indicando cuál>. Creados con `new Audio()` dentro de la factory, con clones solapables y `.catch(() => {})`, como `games/rebote/sounds.ts`; `pause()` y `destroy()` los paran.
- [si efectos] **Efectos en el canvas:** <cada efecto con duración en ms, colores de `COLORS`, número máximo de partículas y cuándo se dispara>.
- Ningún cambio en las constantes de mecánica, en la puntuación ni en `onStats`.

**Fuera de alcance (para futuras specs):**

- Control de volumen o silencio: requiere spec de plataforma.
- Cambios de mecánica, puntuación o dificultad.
- <Otros efectos descartados.>
- Tests automatizados.

---

## Modelo de datos

```ts
// games/<id>/<fx|sounds>.ts — sin estado de módulo
<tipos: Particle, Sounds…>
```

Archivos:

- [si E3] `games/<id>/sounds.ts`: `createSounds()` → `{ <métodos>, stopAll(), dispose() }`.
- [si E3] `public/games/<id>/sounds/<archivos>`.
- [si efectos] `games/<id>/fx.ts`: <funciones puras de partículas/efectos>.
- `games/<id>/constants.ts`: nuevas constantes de pulido (<lista con valores>). Las de mecánica no cambian.
- `games/<id>/engine.ts`: llamadas a sonidos y efectos.

---

## Plan de implementación

1. [si E3] **Sonido (E3).** <pasos>. `npm run build` pasa.
2. [si efectos] **Efectos.** <pasos>. `npm run build` pasa.
3. **Integración en el motor.** <dónde se disparan>. `pause()` congela los efectos y para los sonidos; `restart()` los vacía; `destroy()` libera todo.
4. **Verificación.** Partida completa comparando puntuación y ritmo con la spec 01; `npm run lint` y `npm run build`.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] [si E3] <Un criterio por sonido: evento → sonido.> Dos sonidos seguidos se solapan sin cortarse.
- [ ] [si E3] Al pausar o al salir con `SALIR` no queda ningún sonido sonando. La consola no muestra 404 de `/games/<id>/…`.
- [ ] [si efectos] <Un criterio por efecto, con duración y aspecto.>
- [ ] La puntuación, las vidas, el nivel y la velocidad son idénticos a los de la spec 01 para las mismas acciones.
- [ ] Al pulsar `SALIR` y volver a entrar, solo corre un bucle y no quedan listeners ni sonidos del juego en otras páginas.
- [ ] Ningún archivo de `games/<id>/` declara estado mutable en el nivel del módulo.

---

## Decisiones

- **Sí:** <cada elemento de pulido, con justificación>.
- **No:** <alternativas descartadas>.
- **Sí:** pulido en spec aparte. Se puede posponer o descartar sin afectar al leaderboard.

---

## Riesgos

| Riesgo                                                                 | Mitigación                                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| [si E3] Los navegadores bloquean `play()` antes del primer gesto.      | Rechazos ignorados con `.catch(() => {})`.                                 |
| [si efectos] Demasiadas partículas bajan los fps y alteran el ritmo.   | Tope de <n> partículas y `dt` limitado a `MAX_DT`.                         |
| El pulido cambia sin querer la mecánica.                               | Las constantes de mecánica no se tocan; un criterio compara con la spec 01.|

---

## Preguntas abiertas

- <Dudas abiertas. Si no hay, "Ninguna.">

---

## Lo que **no** está en esta spec

- <Resumen de "Fuera de alcance".>

Cada una de estas cosas, si llega, irá en su propia spec.
