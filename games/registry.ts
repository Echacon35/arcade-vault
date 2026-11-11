import { createAsteroidsGame } from "./asteroides/engine";
import { createReboteGame } from "./rebote/engine";
import { SKIN_IDS } from "./shared/skins";
import { createTetraGame } from "./tetra/engine";
import type { GameFactory, SkinId } from "./types";
import { createViboritaGame } from "./viborita/engine";
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
