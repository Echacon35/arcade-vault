# Juegos con skins

Referencia de qué juegos tienen skins (temas visuales). La mantiene el agente `skin-designer` (`.claude/agents/skin-designer.md`): la lee al empezar y la actualiza al terminar.

**Skins obligatorias:** `neon` (NEÓN), `retro` (RETRO), `clasico` (CLÁSICO) y `pastel` (PASTEL).

**Extensión E4 (infraestructura de skins):** no aplicada.

El código manda: si esta tabla no coincide con `games/<id>/skins.ts` y `GAME_SKINS` de `games/registry.ts`, se corrige la tabla.

## Estado por juego

Estados: `pendiente` (sin skins), `parcial` (faltan skins obligatorias), `completo` (las cuatro).

| Fecha      | ID           | Título     | Skins presentes | Estado    | Notas                                               |
| ---------- | ------------ | ---------- | --------------- | --------- | --------------------------------------------------- |
| 2026-11-11 | `asteroides` | ASTEROIDES | —               | pendiente | Paleta neón actual en `constants.ts`.               |
| 2026-11-11 | `tetra`      | TETRA      | —               | pendiente | Paleta neón actual en `constants.ts`.               |
| 2026-11-11 | `rebote`     | REBOTE     | —               | pendiente | Usa sprites (E2): decidir tinte o dibujo vectorial. |
| 2026-11-11 | `viborita`   | VIBORITA   | —               | pendiente | Paleta neón actual en `COLORS` de `constants.ts`.   |

## Notas por juego

Detalle de decisiones por juego (sprites, brillo, fuentes, contraste de PASTEL) cuando aporte. Vacía hasta que se aplique la primera skin.
