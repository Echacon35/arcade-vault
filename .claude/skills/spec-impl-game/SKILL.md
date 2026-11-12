---
name: spec-impl-game
description: /spec-impl para juegos con motor. Sigue exactamente el flujo de /spec-impl (validar Aprobado, rama spec-NN-slug, implementación paso a paso con pausas) y, al terminar el último paso, lanza en secuencia los agentes skin-designer y mobile-porter con el id del juego.
disable-model-invocation: true
argument-hint: "<NN-spec-name | specs/game-jam/<id>/NN-...md>"
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — /spec-impl + skins + controles táctiles

## Contexto de la sesión

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Specs de game-jam:
!`ls specs/game-jam/ 2>/dev/null || echo "No existe specs/game-jam/"`

Configuración de ramas:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (por defecto, sin archivo de config)"`

Motores registrados (`games/registry.ts`):
!`cat games/registry.ts 2>/dev/null || echo "No existe games/registry.ts"`

---

Este comando es **`/spec-impl` especializado para juegos con motor**. Hace exactamente lo mismo que `/spec-impl` y, cuando termina la implementación, lanza **en secuencia** (nunca en paralelo) dos agentes:

1. `skin-designer`: garantiza las skins `neon`, `retro`, `clasico` y `pastel`.
2. `mobile-porter`: garantiza el pad táctil y el gesto (SPEC 10 y SPEC 11).

Responde siempre en el idioma del usuario (en este repo, español).

---

## Fase 0 — Leer `/spec-impl`

1. Lee entero `.claude/skills/spec-impl/SKILL.md`. Es la fuente de verdad del proceso de implementación.
2. Las **fases 1 a 4** de `/spec-impl` se aplican aquí **sin cambios**: identificación de la spec, validación del estado (solo `Aprobado` o equivalente; mismo mensaje de error y mismo bloqueo), aviso de working tree con cambios, creación y cambio de rama según `AutoCreateBranch`, resumen de la spec, confirmación antes del paso 1, un paso por vez con pausa para revisar el diff, ambigüedades y peticiones fuera de alcance.
3. El argumento recibido es: `$ARGUMENTS`. Además de lo que admite `/spec-impl`, acepta rutas de `specs/game-jam/<id>/` (p. ej. `specs/game-jam/ranaria/01-ranaria-motor.md`). La rama se deriva del nombre del archivo igual que en `/spec-impl` (`01-ranaria-motor.md` → `spec-01-ranaria-motor`).
4. No ejecutes `/spec-impl` aparte (tiene `disable-model-invocation`): sus reglas se aplican **dentro** de este comando.
5. Si no existe `.claude/skills/spec-impl/SKILL.md`, avisa al usuario y **para**.

**Única diferencia con `/spec-impl`:** cuando el usuario confirme el último paso del plan, no te quedes en el mensaje de cierre de `/spec-impl`; pasa directamente a la Fase 5.

---

## Fase 5 — Agentes post-implementación (automático y secuencial)

Solo se ejecuta si **todos** los pasos del plan quedaron implementados. Si la implementación quedó a medias (el usuario paró, hay una ambigüedad abierta…), no lances ningún agente.

### 5.1 Determinar el `id` del juego

- Sácalo de la spec (id del catálogo, carpeta `games/<id>/`, nombre de la carpeta en `specs/game-jam/<id>/`).
- Comprueba en `games/registry.ts` (léelo de nuevo, ha podido cambiar durante la implementación) que el `id` está en `GAME_ENGINES`.
- Si la spec no es de un juego con motor, o el `id` no está en `GAME_ENGINES` (p. ej. una spec de motor que todavía no registra el juego), **no lances los agentes**: dilo con el motivo y salta al informe final.

Anuncia el `id` detectado y pasa a 5.2 sin pedir confirmación.

### 5.2 Lanzar `skin-designer`

Lanza la herramienta `Agent` con `subagent_type: "skin-designer"` en primer plano y **espera su resultado** antes de seguir. Prompt:

```
id del juego: <id>
Spec implementada: <ruta de la spec>
Rama activa: <rama>
Contexto: el juego se acaba de implementar con /spec-impl-game. Garantiza las skins
neon, retro, clasico y pastel siguiendo tus instrucciones. No hagas commits ni cambies
de rama. No modifiques la spec.
```

### 5.3 Lanzar `mobile-porter`

Solo cuando `skin-designer` haya terminado:

- Si `skin-designer` dejó el build roto o un error bloqueante, **no lances** `mobile-porter`: muestra el problema al usuario y para.
- Si no, lanza `Agent` con `subagent_type: "mobile-porter"` en primer plano y espera su resultado. Prompt:

```
id del juego: <id>
Spec implementada: <ruta de la spec>
Rama activa: <rama>
Contexto: el juego se acaba de implementar con /spec-impl-game y skin-designer acaba de
terminar. Resumen de skin-designer: <archivos tocados, si montó el selector de skins,
pendientes>. Comprueba también que el selector de skins se puede tocar a 360 px.
Porta el juego a móvil siguiendo tus instrucciones. No hagas commits ni cambies de
rama. No modifiques la spec.
```

**Nunca** lances los dos agentes en el mismo mensaje ni en segundo plano.

### 5.4 Informe final

Muestra:

1. **Implementación:** el cierre de `/spec-impl` (todos los pasos implementados).
2. **skin-designer:** skins aplicadas, archivos tocados, verificación y pendientes.
3. **mobile-porter:** distribución del pad (cruceta, B, A, gesto), archivos tocados, verificación (lint, build, emulación táctil, escritorio) y pendientes (incluida la prueba en móvil real).
4. **Siguiente paso** (el de `/spec-impl`): verificar uno a uno los criterios de aceptación de la spec; si pasan, cambiar su estado a `Implementado` y hacer el commit final antes de fusionar la rama. El commit lo decide el usuario.

---

## Reglas duras

- Todas las reglas de `/spec-impl` siguen vigentes: nunca commitear automáticamente, implementar lo que dice la spec, parar ante ambigüedades y no implementar nada fuera de alcance.
- No cambies de rama durante la Fase 5.
- Los agentes se lanzan uno después del otro, nunca en paralelo.
- Ni este comando ni los agentes cambian el estado de la spec: eso lo hace el usuario tras verificar los criterios.
