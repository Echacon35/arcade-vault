import { createAsteroidsGame } from "./asteroides/engine";
import { ASTEROIDES_TOUCH } from "./asteroides/touch";
import { createReboteGame } from "./rebote/engine";
import { REBOTE_TOUCH } from "./rebote/touch";
import { SKIN_IDS } from "./shared/skins";
import type { TouchLayout } from "./shared/touch";
import { createTetraGame } from "./tetra/engine";
import { TETRA_TOUCH } from "./tetra/touch";
import type { GameFactory, SkinId } from "./types";
import { createViboritaGame } from "./viborita/engine";
import { VIBORITA_TOUCH } from "./viborita/touch";
/** Motores de juego reales por id del catálogo. Los juegos sin motor usan la partida simulada. */
export const GAME_ENGINES: Partial<Record<string, GameFactory>> = {
  asteroides: createAsteroidsGame,
  tetra: createTetraGame,
  rebote: createReboteGame,
  viborita: createViboritaGame,
};
/** E4: skins que soporta cada motor. Un juego fuera de este mapa no muestra selector. */
export const GAME_SKINS: Partial<Record<string, readonly SkinId[]>> = {
  asteroides: SKIN_IDS,
  rebote: SKIN_IDS,
  viborita: SKIN_IDS,
};
/** SPEC 10: distribución del pad táctil por juego. Un juego fuera de este mapa no muestra pad. */
export const GAME_TOUCH: Partial<Record<string, TouchLayout>> = {
  asteroides: ASTEROIDES_TOUCH,
  tetra: TETRA_TOUCH,
  rebote: REBOTE_TOUCH,
  viborita: VIBORITA_TOUCH,
};
