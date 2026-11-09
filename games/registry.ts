import { createAsteroidsGame } from "./asteroides/engine";
import type { GameFactory } from "./types";

/** Motores de juego reales por id del catálogo. Los juegos sin motor usan la partida simulada. */
export const GAME_ENGINES: Partial<Record<string, GameFactory>> = {
  asteroides: createAsteroidsGame,
};
