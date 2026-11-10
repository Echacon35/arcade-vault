import { isTypingTarget } from "../shared/input";
import type {
  GameCallbacks,
  GameFactory,
  GameInstance,
  GameStats,
} from "../types";
import {
  type Board,
  type Piece,
  collide,
  createBoard,
  dropIntervalForLevel,
  ghostY,
  levelForLines,
  lineScore,
  merge,
  randomPiece,
  clearLines,
  tryRotate,
} from "./board";
import {
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLORS,
  COLS,
  GHOST_ALPHA,
  H,
  HARD_DROP_POINTS,
  NEXT_BLOCK,
  NEXT_CELLS,
  PANEL_X,
  ROWS,
  SOFT_DROP_POINTS,
  W,
} from "./constants";
type Phase = "playing" | "gameover";
type State = {
  board: Board;
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  level: number;
  /** ms entre caídas automáticas. */
  dropInterval: number;
  /** ms acumulados desde la última caída automática. */
  dropAccum: number;
  phase: Phase;
  paused: boolean;
};
/** Teclas de juego: se leen de `KeyboardEvent.code`. */
const PLAY_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "KeyX",
  "Space",
] as const;
const PAUSE_KEYS = ["KeyP", "Escape"] as const;
const isPlayKey = (code: string) =>
  (PLAY_KEYS as readonly string[]).includes(code);
const isPauseKey = (code: string) =>
  (PAUSE_KEYS as readonly string[]).includes(code);
function createState(): State {
  const state: State = {
    board: createBoard(),
    current: randomPiece(),
    next: randomPiece(),
    score: 0,
    lines: 0,
    level: 1,
    dropInterval: dropIntervalForLevel(1),
    dropAccum: 0,
    phase: "playing",
    paused: false,
  };
  // Como `init()` del original: `next` se genera primero y `spawn()` la convierte en actual.
  spawn(state);
  return state;
}
/** La siguiente pieza pasa a ser la actual; si no cabe al aparecer, fin de partida. */
function spawn(state: State) {
  state.current = state.next;
  state.next = randomPiece();
  if (
    collide(state.board, state.current.shape, state.current.x, state.current.y)
  ) {
    state.phase = "gameover";
  }
}
function lockPiece(state: State) {
  merge(state.board, state.current);
  const cleared = clearLines(state.board);
  if (cleared) {
    state.lines += cleared;
    // Con el nivel previo a la subida, como el original.
    state.score += lineScore(cleared, state.level);
    state.level = levelForLines(state.lines);
    state.dropInterval = dropIntervalForLevel(state.level);
  }
  spawn(state);
}
function softDrop(state: State) {
  const { current } = state;
  if (!collide(state.board, current.shape, current.x, current.y + 1)) {
    current.y++;
    state.score += SOFT_DROP_POINTS;
  } else {
    lockPiece(state);
  }
}
function hardDrop(state: State) {
  const gy = ghostY(state.board, state.current);
  state.score += (gy - state.current.y) * HARD_DROP_POINTS;
  state.current.y = gy;
  lockPiece(state);
}
function handleKey(state: State, code: string) {
  const { current, board } = state;
  switch (code) {
    case "ArrowLeft":
      if (!collide(board, current.shape, current.x - 1, current.y)) current.x--;
      break;
    case "ArrowRight":
      if (!collide(board, current.shape, current.x + 1, current.y)) current.x++;
      break;
    case "ArrowDown":
      softDrop(state);
      break;
    case "ArrowUp":
    case "KeyX":
      tryRotate(board, current);
      break;
    case "Space":
      hardDrop(state);
      break;
  }
}
/** Caída automática: una fila cada `dropInterval` ms; el acumulador vuelve a 0. */
function update(state: State, dtMs: number) {
  state.dropAccum += dtMs;
  if (state.dropAccum >= state.dropInterval) {
    state.dropAccum = 0;
    const { current } = state;
    if (!collide(state.board, current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece(state);
    }
  }
}
/** Bloque del original: relleno con 1 px de margen y franja de brillo de 4 px. */
function drawBlock(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  colorIndex: number,
  size: number,
  alpha = 1,
) {
  if (!colorIndex) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS.pieces[colorIndex];
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  ctx.fillStyle = COLORS.highlight;
  ctx.fillRect(px + 1, py + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}
function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  row: number,
  alpha = 1,
) {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      drawBlock(
        ctx,
        BOARD_X + (piece.x + c) * BLOCK,
        BOARD_Y + (row + r) * BLOCK,
        piece.shape[r][c],
        BLOCK,
        alpha,
      );
    }
  }
}
function drawBoard(ctx: CanvasRenderingContext2D, state: State) {
  // Cuadrícula y borde del tablero.
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
    ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
    ctx.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + r * BLOCK);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.strokeRect(
    BOARD_X + 0.5,
    BOARD_Y + 0.5,
    COLS * BLOCK - 1,
    ROWS * BLOCK - 1,
  );
  // Piezas fijadas.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      drawBlock(
        ctx,
        BOARD_X + c * BLOCK,
        BOARD_Y + r * BLOCK,
        state.board[r][c],
        BLOCK,
      );
    }
  }
  // Pieza fantasma y pieza actual.
  drawPiece(
    ctx,
    state.current,
    ghostY(state.board, state.current),
    GHOST_ALPHA,
  );
  drawPiece(ctx, state.current, state.current.y);
}
/** Panel derecho: NEXT (vista previa centrada en 4 × 4, como `drawNext`) y LÍNEAS. */
function drawPanel(ctx: CanvasRenderingContext2D, state: State) {
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.label;
  ctx.font = "15px monospace";
  ctx.fillText("NEXT", PANEL_X, 30);
  const shape = state.next.shape;
  const offX = Math.floor((NEXT_CELLS - shape[0].length) / 2);
  const offY = Math.floor((NEXT_CELLS - shape.length) / 2);
  const previewY = 45;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      drawBlock(
        ctx,
        PANEL_X + (offX + c) * NEXT_BLOCK,
        previewY + (offY + r) * NEXT_BLOCK,
        shape[r][c],
        NEXT_BLOCK,
      );
    }
  }
  ctx.fillStyle = COLORS.label;
  ctx.font = "15px monospace";
  ctx.fillText("LÍNEAS", PANEL_X, 210);
  ctx.fillStyle = COLORS.value;
  ctx.font = "28px monospace";
  ctx.fillText(String(state.lines), PANEL_X, 245);
}
function draw(ctx: CanvasRenderingContext2D, state: State) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);
  drawBoard(ctx, state);
  drawPanel(ctx, state);
}
export const createTetraGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameInstance => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  let state = createState();
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastStats: GameStats | null = null;
  let gameOverNotified = false;
  let destroyed = false;
  /** El juego no tiene vidas: 1 fija durante la partida, 0 al terminar (SPEC 07). */
  const emitStats = () => {
    const { score, level } = state;
    const lives = state.phase === "gameover" ? 0 : 1;
    if (
      lastStats &&
      lastStats.score === score &&
      lastStats.lives === lives &&
      lastStats.level === level
    ) {
      return;
    }
    lastStats = { score, lives, level };
    callbacks.onStats(lastStats);
  };
  const stop = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  };
  /** Tras cada cambio de estado: HUD y, si la partida terminó, parada y aviso único. */
  const sync = () => {
    emitStats();
    if (state.phase === "gameover") {
      stop();
      draw(ctx, state);
      if (!gameOverNotified) {
        gameOverNotified = true;
        callbacks.onGameOver(state.score);
      }
    }
  };
  const loop = (ts: number) => {
    rafId = null;
    // dt en ms y sin tope, como el original. El primer frame tras arrancar o reanudar vale 0.
    const dtMs = lastTime === null ? 0 : ts - lastTime;
    lastTime = ts;
    update(state, dtMs);
    draw(ctx, state);
    sync();
    if (state.phase === "gameover") return;
    rafId = requestAnimationFrame(loop);
  };
  const start = () => {
    if (
      destroyed ||
      rafId !== null ||
      state.paused ||
      state.phase === "gameover"
    )
      return;
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target) || state.phase === "gameover") return;
    if (isPauseKey(e.code)) {
      e.preventDefault();
      if (!e.repeat) callbacks.onPauseToggle();
      return;
    }
    if (state.paused || !isPlayKey(e.code)) return;
    // Con auto-repetición, como el original (mantener ← repite el movimiento).
    e.preventDefault();
    handleKey(state, e.code);
    draw(ctx, state);
    sync();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target) || state.phase === "gameover" || state.paused)
      return;
    if (isPlayKey(e.code)) e.preventDefault();
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  draw(ctx, state);
  emitStats();
  start();
  return {
    pause() {
      if (destroyed || state.paused) return;
      state.paused = true;
      stop();
    },
    resume() {
      if (destroyed || !state.paused) return;
      state.paused = false;
      start();
    },
    restart() {
      if (destroyed) return;
      stop();
      state = createState();
      lastStats = null;
      gameOverNotified = false;
      draw(ctx, state);
      emitStats();
      start();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
};
