export type GameStats = { score: number; lives: number; level: number };

export type GameCallbacks = {
  /** Solo cuando cambia algún valor, no cada frame. */
  onStats: (stats: GameStats) => void;
  onGameOver: (finalScore: number) => void;
  /** P / Esc pulsados dentro del juego. */
  onPauseToggle: () => void;
};

export type GameInstance = {
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
) => GameInstance;
