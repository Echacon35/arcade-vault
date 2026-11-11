import { isTypingTarget } from "../shared/input";
import { DEFAULT_SKIN } from "../shared/skins";
import type {
  GameCallbacks,
  GameFactory,
  GameInstance,
  GameOptions,
  GameStats,
  SkinId,
} from "../types";
import {
  CELL,
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
import { type Skin, SKINS } from "./skins";
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
function drawGrid(ctx: CanvasRenderingContext2D, skin: Skin) {
  ctx.strokeStyle = skin.palette.grid;
  ctx.lineWidth = skin.gridLineWidth;
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
/** Manzana en pixel-art (RETRO): 7 × 7 píxeles de 3 px. S = tallo, L = hoja, F = fruta. */
const PIXEL_FRUIT = [
  "...SLL.",
  ".FFSFF.",
  "FFFFFFF",
  "FFFFFFF",
  "FFFFFFF",
  ".FFFFF.",
  "..F.F..",
] as const;
const FRUIT_PIXEL = 3;
function drawPixelFruit(
  ctx: CanvasRenderingContext2D,
  fruit: Cell,
  skin: Skin,
) {
  const size = PIXEL_FRUIT.length * FRUIT_PIXEL;
  const x0 = fruit.col * CELL + (CELL - size) / 2;
  const y0 = fruit.row * CELL + (CELL - size) / 2;
  const { fruit: body, stem, leaf } = skin.palette;
  const fills: Record<string, string> = { F: body, S: stem, L: leaf };
  PIXEL_FRUIT.forEach((line, r) => {
    for (let c = 0; c < line.length; c++) {
      const fill = fills[line[c]];
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.fillRect(
        x0 + c * FRUIT_PIXEL,
        y0 + r * FRUIT_PIXEL,
        FRUIT_PIXEL,
        FRUIT_PIXEL,
      );
    }
  });
}
/** Manzana: cuerpo redondo, tallo y hoja (con brillo y contorno según la skin). */
function drawFruit(ctx: CanvasRenderingContext2D, fruit: Cell, skin: Skin) {
  if (skin.pixelated) {
    drawPixelFruit(ctx, fruit, skin);
    return;
  }
  const { palette, glow, outlineWidth } = skin;
  const cx = fruit.col * CELL + CELL / 2;
  const cy = fruit.row * CELL + CELL / 2 + 1;
  ctx.save();
  ctx.shadowColor = palette.fruit;
  ctx.shadowBlur = glow.fruit;
  ctx.fillStyle = palette.fruit;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  if (outlineWidth > 0) {
    ctx.strokeStyle = palette.fruitStroke;
    ctx.lineWidth = outlineWidth;
    ctx.stroke();
  }
  ctx.shadowColor = palette.leaf;
  ctx.shadowBlur = glow.leaf;
  ctx.strokeStyle = palette.stem;
  ctx.lineWidth = skin.stemWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.quadraticCurveTo(cx, cy - 11, cx + 2, cy - 12);
  ctx.stroke();
  ctx.fillStyle = palette.leaf;
  ctx.beginPath();
  ctx.ellipse(cx + 5, cy - 11, 4, 2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  if (outlineWidth > 0) {
    // La hoja es pequeña: contorno algo más fino para que no se la coma.
    ctx.strokeStyle = palette.fruitStroke;
    ctx.lineWidth = outlineWidth * 0.75;
    ctx.stroke();
  }
  ctx.restore();
}
const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
/** Margen visual de cada segmento dentro de su celda (21 × 21 px). */
const SEGMENT_INSET = 2;
function drawSnake(ctx: CanvasRenderingContext2D, state: State, skin: Skin) {
  const { palette, glow, outlineWidth, cornerRadius } = skin;
  const size = CELL - SEGMENT_INSET * 2;
  ctx.save();
  ctx.shadowColor = palette.snake;
  ctx.shadowBlur = glow.snake;
  ctx.strokeStyle = palette.snakeStroke;
  ctx.lineWidth = outlineWidth;
  // De la cola a la cabeza, para que la cabeza quede encima.
  for (let i = state.snake.length - 1; i >= 0; i--) {
    const { col, row } = state.snake[i];
    const x = col * CELL + SEGMENT_INSET;
    const y = row * CELL + SEGMENT_INSET;
    ctx.fillStyle = i === 0 ? palette.head : palette.snake;
    if (cornerRadius > 0) {
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, cornerRadius);
      ctx.fill();
      if (outlineWidth > 0) ctx.stroke();
    } else {
      ctx.fillRect(x, y, size, size);
      if (outlineWidth > 0) ctx.strokeRect(x, y, size, size);
    }
  }
  ctx.restore();
  // Ojos orientados en la dirección de avance.
  const head = state.snake[0];
  const cx = head.col * CELL + CELL / 2;
  const cy = head.row * CELL + CELL / 2;
  const f = DIR_VEC[state.dir];
  const side = { x: -f.y, y: f.x };
  ctx.fillStyle = palette.eye;
  for (const s of [-1, 1]) {
    const ex = cx + f.x * 4 + side.x * 5 * s;
    const ey = cy + f.y * 4 + side.y * 5 * s;
    if (skin.pixelated) {
      ctx.fillRect(Math.round(ex) - 2, Math.round(ey) - 2, 4, 4);
      continue;
    }
    ctx.beginPath();
    ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawHint(ctx: CanvasRenderingContext2D, skin: Skin) {
  ctx.save();
  ctx.font = skin.hintFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = skin.palette.hint;
  ctx.shadowColor = skin.palette.hint;
  ctx.shadowBlur = skin.glow.hint;
  ctx.fillText(HINT, W / 2, (START_HEAD.row + 3) * CELL);
  ctx.restore();
}
function draw(ctx: CanvasRenderingContext2D, state: State, skin: Skin) {
  ctx.imageSmoothingEnabled = !skin.pixelated;
  ctx.fillStyle = skin.palette.bg;
  ctx.fillRect(0, 0, W, H);
  drawGrid(ctx, skin);
  drawFruit(ctx, state.fruit, skin);
  drawSnake(ctx, state, skin);
  if (state.phase === "waiting") drawHint(ctx, skin);
}
export const createViboritaGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
): GameInstance => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  let skin: Skin = SKINS[options?.skin ?? DEFAULT_SKIN];
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
    draw(ctx, state, skin);
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
      draw(ctx, state, skin);
      return;
    }
    state.turns = enqueueTurn(state.turns, dir, state.dir);
  };
  window.addEventListener("keydown", onKeyDown);
  draw(ctx, state, skin);
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
      draw(ctx, state, skin);
      emitStats();
      start();
    },
    setSkin(id: SkinId) {
      if (destroyed) return;
      skin = SKINS[id];
      // Con el bucle parado (pausa o fin) se redibuja ya; en juego lo hace el siguiente frame.
      if (rafId === null) draw(ctx, state, skin);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      window.removeEventListener("keydown", onKeyDown);
    },
  };
};
