import { createAsteroidsGame } from "./asteroides/engine";
import { createReboteGame } from "./rebote/engine";
import { createTetraGame } from "./tetra/engine";
import type { GameFactory } from "./types";
import { createViboritaGame } from "./viborita/engine";
/** Motores de juego reales por id del catálogo. Los juegos sin motor usan la partida simulada. */
export const GAME_ENGINES: Partial<Record<string, GameFactory>> = {
  asteroides: createAsteroidsGame,
  tetra: createTetraGame,
  rebote: createReboteGame,
  viborita: createViboritaGame,
};
