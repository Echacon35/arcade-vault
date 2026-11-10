---
name: add-game
description: Especialización de /spec para juegos. Lee la skill /spec como referencia, analiza un juego de references/started-games/, hace las preguntas clave y escribe la spec (en Borrador) para integrarlo en Arcade Vault con motor TypeScript, catálogo, leaderboard en Supabase y Salón de la Fama. No implementa; la spec se implementa después con /spec-impl.
disable-model-invocation: true
argument-hint: "<juego de references/started-games, p. ej. 03-tetris>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(wc:*), Bash(date:*), mcp__supabase__list_tables, mcp__supabase__execute_sql
---

# /add-game — Spec de integración de un juego

## Contexto de la sesión

Fecha de hoy (úsala en la cabecera de la spec, nunca la inventes):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Juegos disponibles en `references/started-games/`:
!`ls references/started-games/ 2>/dev/null || echo "No existe references/started-games/"`

Skill `/spec` de referencia (debe existir; se lee en la fase 0):
!`ls .claude/skills/spec/ 2>/dev/null || echo "No existe .claude/skills/spec/"`

Motores ya registrados (`games/registry.ts`):
!`cat games/registry.ts 2>/dev/null || echo "No existe games/registry.ts"`

---

Esta skill convierte un juego vanilla de `references/started-games/` en una **spec lista para `/spec-impl`**. La spec sigue la receta con la que se integró ASTEROIDES (SPEC 05 motor, SPEC 06 catálogo y leaderboard, SPEC 06.5 Salón de la Fama).

**Aquí no se escribe código.** La skill solo crea `specs/NN-juego-<id>.md` y, si no existía, `specs/.spec-config.yml`, como hace `/spec`.

Archivos de apoyo, en esta misma carpeta. Léelos antes de empezar:

- `recipe.md`: la receta de integración (pasos del plan), la ficha de análisis y las trampas conocidas.
- `contract.md`: el contrato de motor actual, las reglas que no cambian la plataforma y las extensiones permitidas (E1–E3).
- `game-spec-template.md`: el esqueleto de la spec que vas a escribir.

**Referencia obligatoria: la skill `/spec`.** Esta skill es una especialización de `/spec` para juegos. Antes de la fase 1 lee entera la skill `/spec`:

- `.claude/skills/spec/SKILL.md`: la filosofía, el flujo de cuatro fases, cómo formular preguntas, cuándo dejar de preguntar, cómo escribir (vía rápida o sección por sección), cómo guardar y las reglas duras.
- `.claude/skills/spec/template.md`: la estructura de una spec útil, la finalidad de cada sección y los errores comunes.

Cómo se combinan:

- **`/spec` manda en el proceso:** cómo se pregunta, cuándo se deja de preguntar, cómo se escribe, cómo se guarda y qué se confirma al final.
- **`/add-game` manda en el contenido de un juego:** el análisis del código, la receta, el contrato, la plantilla de juego y los criterios estándar.
- **Si chocan, prevalece lo específico de `/add-game`:** ruta `specs/NN-juego-<id>.md`, dependencias `SPEC 05, SPEC 06, SPEC 06.5`, origen limitado a `references/started-games/` y prohibición de tocar Supabase.
- **Si `/add-game` no dice nada sobre algo,** aplica lo que diga `/spec`.

Si no existe `.claude/skills/spec/`, avisa al usuario y continúa solo con los archivos de esta carpeta.

Responde siempre en el idioma del usuario (en este repo, español).

---

## Fase 0 — Leer la skill `/spec`

1. Lee `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md`.
2. Quédate con lo que vas a aplicar en las fases siguientes:
   - de su fase 2: las categorías de preguntas, cómo formularlas y la condición para dejar de preguntar;
   - de su fase 3: la vía rápida frente a la redacción sección por sección y los errores comunes;
   - de su fase 4: la numeración, el estado inicial, la comprobación de dependencias, `specs/.spec-config.yml` y la confirmación final;
   - de `template.md`: el propósito de cada sección. Ninguna sección obligatoria puede faltar.
3. No ejecutes `/spec` ni repitas su flujo aparte: sus reglas se aplican **dentro** de las fases de esta skill.

---

## Fase 1 — Identificar el juego

El argumento recibido es: `$ARGUMENTS`

1. Si el argumento está vacío, muestra los juegos disponibles (contexto de arriba), pide uno y **para**.
2. Busca el juego **solo dentro de `references/started-games/`**. El usuario puede escribir el nombre completo (`03-tetris`), solo el número (`03`) o solo el slug (`tetris`). Si no lo encuentras, muestra los disponibles y **para**.
3. Comprueba que el juego **no está ya integrado**. Está integrado si se cumple cualquiera de estas tres condiciones:
   - su id aparece en `GAME_ENGINES` (contexto de arriba);
   - tiene una entrada en `GAMES` de `lib/games.ts` con motor real;
   - existe en la tabla `games` de Supabase (`select id, title, sort_order from public.games order by sort_order` con `execute_sql`, **solo lectura**).

   Si ya está integrado, dilo con la evidencia y **para**. Ejemplo: `02-asteroids` ya es `asteroides`.

4. Lee el contexto del proyecto: `CLAUDE.md`, `AGENTS.md` y las specs `05-juego-asteroides.md`, `06-catalogo-y-leaderboard-supabase.md` y `06.5-salon-de-la-fama-supabase.md`, incluida la sección "Problemas conocidos" de la 06. Toma de ahí el idioma, las palabras de estado (`Borrador`, `Aprobado`…) y el formato de las cabeceras.

## Fase 2 — Analizar el código del juego

Lee **todo** el juego de referencia: `index.html`, `game.js`, cualquier otro `.js` (p. ej. `levels.js`, `spritesheet.js`), `style.css`, `README.md`, `CLAUDE.md` y la lista de `assets/`. Si el juego trae su propia carpeta `specs/`, léela también: explica decisiones del original.

Rellena la **ficha de análisis** de `recipe.md` con datos concretos (números, nombres de constantes, líneas). Después cruza la ficha con `contract.md` y apunta:

- qué encaja con las **reglas sin cambio de plataforma** (canvas 800×600, ratón en el canvas, sin DOM propio, estadísticas extra dentro del canvas);
- qué **extensiones** (E1 vidas opcionales, E2 assets, E3 sonido) necesita;
- qué **no cabe** en ninguna extensión. Eso va fuera de alcance y se apunta para una spec de plataforma.

Muestra la ficha y el cruce al usuario antes de preguntar. Es la base de las preguntas.

## Fase 3 — Preguntas

Aplica la fase 2 de `/spec` ("Clarify through questions"): bloques de 3 a 5 preguntas concretas con `AskUserQuestion`, de 2 a 4 opciones por pregunta, tu recomendación primero y marcada `(Recomendado)`, y repasa siempre sus categorías (alcance, datos, integración, persistencia, UX y estados, riesgos, decisiones cerradas). No preguntes lo que la ficha ya responde sin ambigüedad.

Temas que siempre hay que cerrar:

1. **Catálogo.** Los valores de `cat` y `color` deben pasar los CHECK de la tabla `games`:
   - `id`: kebab-case en español, como `asteroides`. Debe cumplir `^[a-z0-9-]+$`.
   - `title`: en mayúsculas.
   - `cat`: `ARCADE`, `PUZZLE`, `SHOOTER` o `VERSUS`.
   - `color`: `cyan`, `magenta`, `yellow` o `green`.
   - `short` y `long`: textos que describan la mecánica **real**, sin inventar características.
   - `sort_order`: el siguiente libre, según la consulta de la fase 1.
2. **Pantalla.** Qué se queda en el canvas (indicadores efímeros, panel de siguiente pieza, líneas…) y qué se quita porque ya lo muestra el HUD de React (puntuación, vidas, nivel, GAME OVER).
3. **Extensiones.** Confirma cada extensión detectada (E1/E2/E3) o la alternativa de dejar esa parte fuera de alcance.
4. **Descartes.** Qué partes del original no se portan: temas claro/oscuro, `localStorage`, botones DOM, controles duplicados…
5. **Portada.** Idea para `.cover-<id>`: motivo y colores. Se diseña al implementar con `/frontend-design`.
6. **Fuera de alcance.** Qué se deja explícitamente para otras specs.

Si una respuesta abre otro frente (multijugador, móvil, otro tamaño de canvas…), señala que merece su propia spec y pregunta si se deja fuera.

**Deja de preguntar** cuando puedas responder sin suponer nada:

1. ¿Qué archivos aparecen o cambian?
2. ¿Cuál es el primer paso ejecutable y cuál el último?
3. ¿Cómo se verifica que está terminado?

## Fase 4 — Escribir la spec

Antes de crear el archivo, **vuelve a leer las fases 3 y 4 de `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md`**, y aplícalas junto con lo que sigue:

- **Modo de escritura (fase 3 de `/spec`):**
  - Si la fase 3 de esta skill cerró todo, escribe la spec completa de una vez y guárdala, sin pedir confirmación por secciones ni enseñar un borrador antes.
  - Si falta información, redacta sección por sección en el orden de `/spec`, mostrando cada una y esperando confirmación.
- **Estructura (`template.md` de `/spec`):** están todas las secciones obligatorias en ese orden: cabecera, alcance con "Dentro" y "Fuera", modelo de datos, plan, criterios, decisiones y riesgos.
- **Objetivo:** cabe en una frase.
- **Errores comunes de `/spec` que hay que evitar:**
  - criterios no verificables;
  - pasos del plan que no están en el alcance;
  - nombres de archivos o estructuras que el usuario no confirmó;
  - sección de decisiones vacía.

Los pasos concretos:

1. **Número:** toma la parte entera más alta de los archivos de `specs/` y súmale 1, con dos dígitos. Ejemplo: con `06-…` y `06.5-…`, el siguiente es `07`.
2. **Ruta:** `specs/NN-juego-<id>.md`. Si ya existe, pregunta antes de sobrescribir.
3. **Contenido:** rellena `game-spec-template.md` entero, sin dejar marcadores `<…>`.
   - El plan de implementación sigue **en orden** los pasos de `recipe.md`. Las extensiones de contrato van **primero**, y cada una deja ASTEROIDES funcionando y `npm run build` pasando.
   - Usa los nombres reales del repo: `GAME_ENGINES`, `GameFactory`, `GameStats`, `GameCanvas`, `GamePlayer`, `saveScoreAction`, `getCatalog`, `getLeaderboard`, `supabase/migrations/`, `apply_migration` y `list_migrations`.
   - Copia de la ficha las constantes de mecánica (puntos, velocidades, niveles), para que los criterios de aceptación sean comprobables.
   - Las secciones "Decisiones" y "Riesgos" incluyen las respuestas de la fase 3 y las trampas conocidas de `recipe.md` que apliquen.
4. **Cabecera:**
   - Estado `Borrador`, o la palabra equivalente que usen las specs existentes. Nunca `Aprobado`.
   - `Depende de: SPEC 05, SPEC 06, SPEC 06.5`.
   - La fecha del contexto de la sesión.
5. **Dependencias (fase 4 de `/spec`):** comprueba que existen en `specs/` todas las specs de `Depende de`. Si falta alguna, dilo en lugar de dejar una referencia rota.
6. **Escritura:** escribe el archivo directamente, sin pedir permiso para el nombre.
7. **`specs/.spec-config.yml` (fase 4 de `/spec`):** si no existe, créalo con el contenido por defecto que indica `/spec`. Si existe, no lo toques.
8. **Confirmación al usuario,** con lo que pide la fase 4 de `/spec` más lo propio de esta skill:
   - la ruta del archivo;
   - que está en `Borrador` y debe cambiarlo a `Aprobado` tras releerla;
   - si creaste `specs/.spec-config.yml`, que existe y que `AutoCreateBranch` vale `true` por defecto;
   - las extensiones de contrato que incluye la spec;
   - el siguiente paso: `/spec-impl NN-juego-<id>`.

   **Para ahí.** No propongas implementar.

## Reglas duras

- Las reglas duras de `/spec` también se aplican aquí: no escribir código, no proponer implementar tras guardar, no dar por hechas decisiones que el usuario no confirmó y no repreguntar en la fase 4 lo ya respondido.
- No escribas código, CSS, migraciones ni archivos fuera de `specs/`. Las únicas excepciones son `specs/NN-juego-<id>.md` y, si no existía, `specs/.spec-config.yml`.
- No ejecutes `apply_migration` ni ninguna escritura en Supabase. `execute_sql` solo se usa con `select`.
- No inventes mecánicas, constantes ni textos: salen del código de referencia o de las respuestas del usuario.
- La mecánica del original no cambia. Solo cambia la presentación: la paleta neón, el HUD de React y el modal de fin.
- Si el juego necesita algo que no está en `contract.md`, no lo metas en la spec como extensión improvisada. Va a "Fuera de alcance" con la nota "requiere spec de plataforma".
- Si el usuario quiere saltarse las preguntas, recuérdale que la spec es el contrato de la implementación. Si insiste, deja constancia en "Decisiones" ("Definición rápida sin aclaración detallada").
