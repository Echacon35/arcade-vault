import { isTypingTarget } from "../shared/input";
import type {
  GameCallbacks,
  GameFactory,
  GameInstance,
  GameStats,
} from "../types";
import {
  CELL,
  COLORS,
  COLS,
  FRUIT_POINTS,
  H,
  MAX_DT,
  ROWS,
  START_DIR,
  START_HEAD,
  START_LIVES,
  W,
} from "./constants";
import {
  type Cell,
  type Dir,
  enqueueTurn,
  initialSnake,
  isOpposite,
  levelFor,
  spawnFruit,
  speedFor,
  step,
} from "./snake";
type Phase = "waiting" | "playing" | "gameover";
type State = {
  snake: Cell[]; // [0] = cabeza
  dir: Dir;
  turns: Dir[]; // cola de giros, máx. TURN_QUEUE_MAX
  fruit: Cell;
  fruits: number; // frutas comidas en la partida
  acc: number; // segundos acumulados hacia el siguiente paso
  score: number;
  lives: number; // 1 → 0 al morir
  level: number; // 1 + floor(fruits / 5)
  phase: Phase;
  paused: boolean;
};
/** Teclas de dirección por `KeyboardEvent.code`: flechas y WASD. */
const DIR_KEYS: Record<string, Dir> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
const PAUSE_KEYS = ["KeyP", "Escape"] as const;
const isPauseKey = (code: string) =>
  (PAUSE_KEYS as readonly string[]).includes(code);
const HINT = "▸ PULSA UNA FLECHA_";
function createState(): State {
  const snake = initialSnake();
  return {
    snake,
    dir: START_DIR,
    turns: [],
    // Con 3 segmentos siempre hay celdas libres.
    fruit: spawnFruit(snake, Math.random)!,
    fruits: 0,
    acc: 0,
    score: 0,
    lives: START_LIVES,
    level: 1,
    phase: "waiting",
    paused: false,
  };
}
/** Un paso de la serpiente: consume como máximo un giro de la cola. */
function advance(state: State) {
  const turn = state.turns.shift();
  if (turn) state.dir = turn;
  const { snake, result } = step(state.snake, state.dir, state.fruit);
  state.snake = snake;
  if (result === "dead") {
    state.lives = 0;
    state.phase = "gameover";
    return;
  }
  if (result === "moved") return;
  // "ate" o "full": puntos con el nivel de antes de contar la fruta.
  state.score += FRUIT_POINTS * state.level;
  state.fruits++;
  state.level = levelFor(state.fruits);
  if (result === "full") {
    state.phase = "gameover";
    return;
  }
  state.fruit = spawnFruit(state.snake, Math.random)!;
}
/** Acumula `dt` y da un paso cada `1 / speedFor(level)` segundos. */
function update(state: State, dt: number) {
  if (state.phase !== "playing") return;
  state.acc += dt;
  const interval = 1 / speedFor(state.level);
  // Con dt ≤ MAX_DT y velocidad ≤ 20 pasos/s, como máximo un paso por frame.
  if (state.acc >= interval) {
    state.acc -= interval;
    advance(state);
  }
}
function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) {
    ctx.moveTo(c * CELL + 0.5, 0);
    ctx.lineTo(c * CELL + 0.5, H);
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.moveTo(0, r * CELL + 0.5);
    ctx.lineTo(W, r * CELL + 0.5);
  }
  ctx.stroke();
}
/** Manzana neón: cuerpo magenta con glow, tallo y hoja verdes. */
function drawFruit(ctx: CanvasRenderingContext2D, fruit: Cell) {
  const cx = fruit.col * CELL + CELL / 2;
  const cy = fruit.row * CELL + CELL / 2 + 1;
  ctx.save();
  ctx.shadowColor = COLORS.fruit;
  ctx.shadowBlur = 14;
  ctx.fillStyle = COLORS.fruit;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = COLORS.leaf;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = COLORS.leaf;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.quadraticCurveTo(cx, cy - 11, cx + 2, cy - 12);
  ctx.stroke();
  ctx.fillStyle = COLORS.leaf;
  ctx.beginPath();
  ctx.ellipse(cx + 5, cy - 11, 4, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
function drawSnake(ctx: CanvasRenderingContext2D, state: State) {
  ctx.save();
  ctx.shadowColor = COLORS.snake;
  ctx.shadowBlur = 10;
  // De la cola a la cabeza, para que la cabeza quede encima.
  for (let i = state.snake.length - 1; i >= 0; i--) {
    const { col, row } = state.snake[i];
    ctx.fillStyle = i === 0 ? COLORS.head : COLORS.snake;
    ctx.fillRect(col * CELL + 2, row * CELL + 2, CELL - 4, CELL - 4);
  }
  ctx.restore();
  // Ojos orientados en la dirección de avance.
  const head = state.snake[0];
  const cx = head.col * CELL + CELL / 2;
  const cy = head.row * CELL + CELL / 2;
  const f = DIR_VEC[state.dir];
  const side = { x: -f.y, y: f.x };
  ctx.fillStyle = COLORS.eye;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(
      cx + f.x * 4 + side.x * 5 * s,
      cy + f.y * 4 + side.y * 5 * s,
      2.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
function drawHint(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.font = "20px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.hint;
  ctx.shadowColor = COLORS.hint;
  ctx.shadowBlur = 8;
  ctx.fillText(HINT, W / 2, (START_HEAD.row + 3) * CELL);
  ctx.restore();
}
function draw(ctx: CanvasRenderingContext2D, state: State) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawGrid(ctx);
  drawFruit(ctx, state.fruit);
  drawSnake(ctx, state);
  if (state.phase === "waiting") drawHint(ctx);
}
export const createViboritaGame: GameFactory = (
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
  const emitStats = () => {
    const { score, lives, level } = state;
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
      if (!gameOverNotified) {
        gameOverNotified = true;
        callbacks.onGameOver(state.score);
      }
    }
  };
  const loop = (ts: number) => {
    rafId = null;
    // dt en segundos con tope; el primer frame tras arrancar o reanudar vale 0.
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(state, dt);
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
    state.acc = 0;
    rafId = requestAnimationFrame(loop);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target) || state.phase === "gameover") return;
    if (isPauseKey(e.code)) {
      e.preventDefault();
      if (!e.repeat) callbacks.onPauseToggle();
      return;
    }
    const dir = DIR_KEYS[e.code];
    if (!dir) return;
    e.preventDefault();
    if (state.paused) return;
    if (state.phase === "waiting") {
      // La izquierda sería un giro de 180° y no arranca la partida.
      if (isOpposite(dir, state.dir)) return;
      state.dir = dir;
      state.turns = [];
      state.acc = 0;
      state.phase = "playing";
      draw(ctx, state);
      return;
    }
    state.turns = enqueueTurn(state.turns, dir, state.dir);
  };
  window.addEventListener("keydown", onKeyDown);
  draw(ctx, state);
  emitStats();
  start();
  return {
    pause() {
      if (destroyed || state.paused) return;
      state.paused = true;
      state.turns = [];
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
    },
  };
};
