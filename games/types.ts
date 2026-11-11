export type GameStats = { score: number; lives: number; level: number };

export type GameCallbacks = {
  /** Solo cuando cambia algún valor, no cada frame. */
  onStats: (stats: GameStats) => void;
  onGameOver: (finalScore: number) => void;
  /** P / Esc pulsados dentro del juego. */
  onPauseToggle: () => void;
};

/** Skins (temas visuales) de la extensión E4. Solo cambian la apariencia. */
export type SkinId = "neon" | "retro" | "clasico" | "pastel";

export type GameOptions = { skin?: SkinId };

export type GameInstance = {
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
  /** E4: cambia la skin en caliente, sin reiniciar ni tocar el estado; redibuja también en pausa. */
  setSkin?(skin: SkinId): void;
};

export type GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
) => GameInstance;
