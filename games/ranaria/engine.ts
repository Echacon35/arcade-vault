import { isTypingTarget } from "../shared/input";
import type {
  GameCallbacks,
  GameFactory,
  GameInstance,
  GameStats,
} from "../types";
import {
  BOARD_H,
  BOARD_W,
  BOARD_X,
  BOARD_Y,
  CELL,
  COLORS,
  FROG_HITBOX_INSET,
  COLS,
  GOAL_COLS,
  GOAL_WIDTH,
  H,
  JUMP_MS,
  MAX_DT,
  POINTS_GOAL,
  POINTS_ROUND,
  POINTS_STEP,
  POINTS_TIME_PER_SEC,
  ROW_GOALS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROW_SAFE_MID,
  ROW_START,
  START_COL,
  START_LIVES,
  TIMER_BASE,
  TIMER_MIN,
  W,
} from "./constants";
import {
  buildLanes,
  type Direction,
  type Entity,
  type Frog,
  type Lane,
  moveLane,
} from "./lanes";
type Phase = "waiting" | "playing" | "dying" | "gameover";
type State = {
  lanes: Lane[];
  frog: Frog;
  /** Bocas ocupadas en la ronda, en el orden de `GOAL_COLS`. */
  goals: boolean[];
  score: number;
  lives: number;
  level: number;
  phase: Phase;
  paused: boolean;
  /** Dirección pulsada que espera a que la rana termine el salto en curso. */
  pendingDir: Direction | null;
  /** Segundos que quedan del cruce actual y duración total del cruce. */
  timeLeft: number;
  timeTotal: number;
  /** Fila más alta (menor índice) alcanzada en el cruce actual, para los +10. */
  bestRow: number;
};
/** Teclas de dirección por `KeyboardEvent.code`: flechas y WASD. */
const DIR_KEYS: Record<string, Direction> = {
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
const isRiverRow = (row: number) =>
  row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
const isRoadRow = (row: number) => row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT;
/** Duración del cruce: 15 s, un segundo menos por nivel, con mínimo de 8. */
const timerFor = (level: number) =>
  Math.max(TIMER_MIN, TIMER_BASE - (level - 1));
function startFrog(): Frog {
  return {
    col: START_COL,
    row: ROW_START,
    animating: false,
    animT: 0,
    targetCol: START_COL,
    targetRow: ROW_START,
    facing: "up",
  };
}
function createState(): State {
  const level = 1;
  return {
    lanes: buildLanes(level),
    frog: startFrog(),
    goals: GOAL_COLS.map(() => false),
    score: 0,
    lives: START_LIVES,
    level,
    phase: "waiting",
    paused: false,
    pendingDir: null,
    timeLeft: timerFor(level),
    timeTotal: timerFor(level),
    bestRow: ROW_START,
  };
}
/** Inicia un salto de 1 celda si el destino está dentro del tablero. */
function startJump(state: State, dir: Direction) {
  const { frog } = state;
  let { col, row } = frog;
  if (dir === "up") row -= 1;
  else if (dir === "down") row += 1;
  else if (dir === "left") col -= 1;
  else col += 1;
  frog.facing = dir;
  // No sale por los bordes laterales ni por debajo de la salida.
  if (row > ROW_START || row < ROW_GOALS) return;
  if (col < 0 || col > COLS - 1) {
    // Arrastrada por un tronco puede estar a menos de una celda del borde: se pega a él.
    const clamped = Math.min(COLS - 1, Math.max(0, col));
    if (Math.abs(clamped - frog.col) < 0.01) return;
    col = clamped;
  }
  frog.animating = true;
  frog.animT = 0;
  frog.targetCol = col;
  frog.targetRow = row;
}
/** Caja horizontal de la rana en celdas, algo más estrecha que su celda. */
function frogSpan(frog: Frog): [number, number] {
  return [frog.col + FROG_HITBOX_INSET, frog.col + 1 - FROG_HITBOX_INSET];
}
/** ¿Algún vehículo del carril de la rana la solapa? */
function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  if (!isRoadRow(frog.row)) return false;
  const [left, right] = frogSpan(frog);
  return lanes.some(
    (lane) =>
      lane.row === frog.row &&
      lane.entities.some((e) => left < e.col + e.width && right > e.col),
  );
}
/** Tronco o grupo de tortugas visible bajo el centro de la rana, o `null` (agua). */
function getSupport(
  frog: Frog,
  lanes: Lane[],
): { lane: Lane; entity: Entity } | null {
  const center = frog.col + 0.5;
  for (const lane of lanes) {
    if (lane.row !== frog.row) continue;
    for (const entity of lane.entities) {
      if (center < entity.col || center >= entity.col + entity.width) continue;
      // Una tortuga sumergida no sostiene a nadie.
      if (entity.type === "turtle" && entity.submerged) return null;
      return { lane, entity };
    }
  }
  return null;
}
/**
 * Índice de la boca libre en la que cae la rana, o `null` si cae en el muro o
 * en una boca ya ocupada (muerte).
 */
function checkGoal(frog: Frog, goals: boolean[]): number | null {
  if (frog.row !== ROW_GOALS) return null;
  const col = Math.round(frog.col);
  const index = GOAL_COLS.findIndex((c) => col >= c && col < c + GOAL_WIDTH);
  if (index < 0 || goals[index]) return null;
  return index;
}
/** Vuelve a empezar el cruce: rana en la salida, tiempo lleno y récord de fila reiniciado. */
function resetCrossing(state: State) {
  state.frog = startFrog();
  state.pendingDir = null;
  state.timeTotal = timerFor(state.level);
  state.timeLeft = state.timeTotal;
  state.bestRow = ROW_START;
}
/** Muerte de la rana (paso 7: vidas y fin de partida). */
function killFrog(state: State) {
  resetCrossing(state);
}
/**
 * Ronda completada (5 bocas): +200, bocas vacías, nivel siguiente con carriles
 * más rápidos y cruce nuevo con menos tiempo. `onStats` avisa del nivel.
 */
function completeRound(state: State) {
  state.score += POINTS_ROUND;
  state.goals = GOAL_COLS.map(() => false);
  state.level += 1;
  state.lanes = buildLanes(state.level);
  resetCrossing(state);
}
/** Ocupa la boca `index`: +50, bonus de tiempo y, si era la quinta, fin de ronda. */
function reachGoal(state: State, index: number) {
  state.goals[index] = true;
  state.score += POINTS_GOAL + Math.floor(state.timeLeft) * POINTS_TIME_PER_SEC;
  if (state.goals.every(Boolean)) completeRound(state);
  else resetCrossing(state);
}
/** Resuelve la celda en la que acaba de caer la rana (puntos, meta y muerte). */
function resolveLanding(state: State) {
  const { frog } = state;
  // Fuera del río la rana vuelve a la rejilla.
  if (!isRiverRow(frog.row)) frog.col = Math.round(frog.col);
  if (frog.row === ROW_GOALS) {
    const index = checkGoal(frog, state.goals);
    if (index === null) {
      killFrog(state);
      return;
    }
    state.score += POINTS_STEP; // la fila de metas también es una fila nueva
    reachGoal(state, index);
    return;
  }
  if (frog.row < state.bestRow) {
    state.bestRow = frog.row;
    state.score += POINTS_STEP;
  }
}
/** Con la rana quieta: atropello en la carretera, o arrastre / ahogo en el río. */
function checkFrog(state: State, dt: number) {
  const { frog } = state;
  if (frog.animating) return;
  if (checkRoadCollision(frog, state.lanes)) {
    killFrog(state);
    return;
  }
  if (!isRiverRow(frog.row)) return;
  const support = getSupport(frog, state.lanes);
  if (!support) {
    // Cae al agua o la tortuga que la sostenía se sumerge.
    killFrog(state);
    return;
  }
  frog.col += support.lane.speed * support.lane.dir * dt;
  frog.targetCol = frog.col;
  // El tronco la saca por el borde del río.
  if (frog.col < -0.5 || frog.col > COLS - 0.5) killFrog(state);
}
function update(state: State, dt: number) {
  if (state.phase !== "playing") return;
  for (const lane of state.lanes) moveLane(lane, dt);
  const { frog } = state;
  if (!frog.animating && state.pendingDir) {
    startJump(state, state.pendingDir);
    state.pendingDir = null;
  }
  if (frog.animating) {
    frog.animT += dt * 1000;
    if (frog.animT >= JUMP_MS) {
      frog.col = frog.targetCol;
      frog.row = frog.targetRow;
      frog.animating = false;
      frog.animT = 0;
      resolveLanding(state);
    }
  }
  checkFrog(state, dt);
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft === 0) killFrog(state);
}
// ─── Dibujo ────────────────────────────────────────────────────────────────
const cellX = (col: number) => col * CELL;
const cellY = (row: number) => row * CELL;
function drawTimeBar(ctx: CanvasRenderingContext2D, state: State) {
  const ratio = state.timeTotal > 0 ? state.timeLeft / state.timeTotal : 0;
  const barX = BOARD_X + 90;
  const barW = BOARD_W - 90;
  const barY = 14;
  const barH = 12;
  ctx.save();
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.timeLabel;
  ctx.fillText("TIEMPO", BOARD_X, barY + barH / 2);
  ctx.fillStyle = COLORS.timeTrack;
  ctx.fillRect(barX, barY, barW, barH);
  const color =
    ratio > 0.5
      ? COLORS.timeOk
      : ratio > 0.25
        ? COLORS.timeWarn
        : COLORS.timeDanger;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillRect(barX, barY, barW * ratio, barH);
  ctx.restore();
}
function drawZones(ctx: CanvasRenderingContext2D, state: State) {
  // Río.
  ctx.fillStyle = COLORS.river;
  ctx.fillRect(
    0,
    cellY(ROW_RIVER_TOP),
    BOARD_W,
    (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL,
  );
  ctx.strokeStyle = COLORS.riverWave;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let r = ROW_RIVER_TOP; r <= ROW_RIVER_BOT; r++) {
    for (let c = 0; c < COLS; c += 2) {
      const x = cellX(c) + 10 + (r % 2) * CELL;
      const y = cellY(r) + CELL / 2;
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 5, y - 4, x + 10, y);
      ctx.quadraticCurveTo(x + 15, y + 4, x + 20, y);
    }
  }
  ctx.stroke();
  // Carretera con líneas discontinuas entre carriles.
  ctx.fillStyle = COLORS.road;
  ctx.fillRect(
    0,
    cellY(ROW_ROAD_TOP),
    BOARD_W,
    (ROW_ROAD_BOT - ROW_ROAD_TOP + 1) * CELL,
  );
  ctx.strokeStyle = COLORS.roadLine;
  ctx.lineWidth = 2;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
    ctx.moveTo(0, cellY(r));
    ctx.lineTo(BOARD_W, cellY(r));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // Filas seguras: mediana y salida.
  for (const r of [ROW_SAFE_MID, ROW_START]) {
    ctx.fillStyle = COLORS.safe;
    ctx.fillRect(0, cellY(r), BOARD_W, CELL);
    ctx.strokeStyle = COLORS.safeEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(1, cellY(r) + 1, BOARD_W - 2, CELL - 2);
  }
  // Fila de metas: muro con 5 bocas.
  ctx.fillStyle = COLORS.goalWall;
  ctx.fillRect(0, cellY(ROW_GOALS), BOARD_W, CELL);
  GOAL_COLS.forEach((col, i) => {
    const x = cellX(col) + 2;
    const y = cellY(ROW_GOALS) + 4;
    const w = GOAL_WIDTH * CELL - 4;
    const h = CELL - 4;
    ctx.fillStyle = COLORS.goalBg;
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.strokeStyle = COLORS.goalBorder;
    ctx.shadowColor = COLORS.goalBorder;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
    if (state.goals[i]) {
      drawFrogShape(ctx, x + w / 2, y + h / 2, "up", false, COLORS.goal);
    }
  });
}
function drawCar(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  row: number,
  dir: 1 | -1,
) {
  const x = cellX(e.col) + 3;
  const y = cellY(row) + 8;
  const w = e.width * CELL - 6;
  const h = CELL - 16;
  const body = COLORS.carColors[e.variant ?? 0];
  ctx.save();
  ctx.fillStyle = COLORS.wheel;
  for (const wx of [x + 6, x + w - 6]) {
    for (const wy of [y, y + h]) {
      ctx.beginPath();
      ctx.arc(wx, wy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = body;
  ctx.shadowColor = body;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 5);
  ctx.fill();
  // Parabrisas en el sentido de la marcha.
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.bg;
  const wsX = dir > 0 ? x + w - 12 : x + 4;
  ctx.fillRect(wsX, y + 4, 8, h - 8);
  ctx.restore();
}
function drawTruck(
  ctx: CanvasRenderingContext2D,
  e: Entity,
  row: number,
  dir: 1 | -1,
) {
  const x = cellX(e.col) + 3;
  const y = cellY(row) + 6;
  const w = e.width * CELL - 6;
  const h = CELL - 12;
  const cabW = 22;
  const cabX = dir > 0 ? x + w - cabW : x;
  const trailerX = dir > 0 ? x : x + cabW + 3;
  ctx.save();
  ctx.fillStyle = COLORS.truck;
  ctx.fillRect(trailerX, y, w - cabW - 3, h);
  ctx.fillStyle = COLORS.truckCab;
  ctx.shadowColor = COLORS.truckCab;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(cabX, y + 2, cabW, h - 4, 4);
  ctx.fill();
  ctx.restore();
}
function drawLog(ctx: CanvasRenderingContext2D, e: Entity, row: number) {
  const x = cellX(e.col) + 2;
  const y = cellY(row) + 6;
  const w = e.width * CELL - 4;
  const h = CELL - 12;
  ctx.save();
  ctx.fillStyle = COLORS.log;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.logLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let lx = x + 14; lx < x + w - 10; lx += 18) {
    ctx.moveTo(lx, y + 7);
    ctx.lineTo(lx + 10, y + 7);
    ctx.moveTo(lx + 6, y + h - 7);
    ctx.lineTo(lx + 16, y + h - 7);
  }
  ctx.stroke();
  ctx.restore();
}
function drawTurtles(ctx: CanvasRenderingContext2D, e: Entity, row: number) {
  ctx.save();
  for (let i = 0; i < e.width; i++) {
    const cx = cellX(e.col + i) + CELL / 2;
    const cy = cellY(row) + CELL / 2;
    if (e.submerged) {
      ctx.strokeStyle = COLORS.turtleSubmerged;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = COLORS.turtle;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();
    // Escamas del caparazón.
    ctx.strokeStyle = COLORS.turtleScale;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    for (let a = 0; a < 6; a++) {
      const ang = (a * Math.PI) / 3;
      ctx.moveTo(cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 8);
      ctx.lineTo(cx + Math.cos(ang) * 15, cy + Math.sin(ang) * 15);
    }
    ctx.stroke();
  }
  ctx.restore();
}
function drawEntities(ctx: CanvasRenderingContext2D, state: State) {
  for (const lane of state.lanes) {
    for (const e of lane.entities) {
      if (e.type === "car") drawCar(ctx, e, lane.row, lane.dir);
      else if (e.type === "truck") drawTruck(ctx, e, lane.row, lane.dir);
      else if (e.type === "log") drawLog(ctx, e, lane.row);
      else drawTurtles(ctx, e, lane.row);
    }
  }
}
const FACING_ANGLE: Record<Direction, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};
/** Rana centrada en (cx, cy): cuerpo 28 × 24, ojos y patas (extendidas al saltar). */
function drawFrogShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  facing: Direction,
  jumping: boolean,
  color: string,
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(FACING_ANGLE[facing]);
  // Patas.
  ctx.strokeStyle = COLORS.frogDark;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  const reach = jumping ? 17 : 13;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * 8, -6);
    ctx.lineTo(s * reach, -reach + 2);
    ctx.moveTo(s * 8, 6);
    ctx.lineTo(s * reach, reach - 2);
  }
  ctx.stroke();
  // Cuerpo.
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Ojos.
  for (const s of [-1, 1]) {
    ctx.fillStyle = COLORS.eyeWhite;
    ctx.beginPath();
    ctx.arc(s * 6, -9, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.eyePupil;
    ctx.beginPath();
    ctx.arc(s * 6, -10, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawFrog(ctx: CanvasRenderingContext2D, state: State) {
  const { frog } = state;
  const t = frog.animating ? Math.min(1, frog.animT / JUMP_MS) : 0;
  const col = frog.col + (frog.targetCol - frog.col) * t;
  const row = frog.row + (frog.targetRow - frog.row) * t;
  const color = state.phase === "dying" ? COLORS.frogDead : COLORS.frog;
  drawFrogShape(
    ctx,
    cellX(col) + CELL / 2,
    cellY(row) + CELL / 2,
    frog.facing,
    frog.animating,
    color,
  );
}
function drawHint(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = COLORS.hint;
  ctx.shadowColor = COLORS.hint;
  ctx.shadowBlur = 10;
  ctx.fillText(HINT, BOARD_W / 2, cellY(ROW_SAFE_MID) + CELL / 2);
  ctx.restore();
}
function draw(ctx: CanvasRenderingContext2D, state: State) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  drawTimeBar(ctx, state);
  ctx.save();
  ctx.translate(BOARD_X, BOARD_Y);
  // Lo que sale del tablero (entidades en el bucle) no se ve en los márgenes.
  ctx.beginPath();
  ctx.rect(0, 0, BOARD_W, BOARD_H);
  ctx.clip();
  drawZones(ctx, state);
  drawEntities(ctx, state);
  drawFrog(ctx, state);
  if (state.phase === "waiting") drawHint(ctx);
  ctx.restore();
}
// ─── Factory ───────────────────────────────────────────────────────────────
export const createRanariaGame: GameFactory = (
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
    // Un salto por pulsación: mantener la tecla no encadena saltos.
    if (e.repeat || state.paused || state.phase === "dying") return;
    if (state.phase === "waiting") state.phase = "playing";
    state.pendingDir = dir;
  };
  window.addEventListener("keydown", onKeyDown);
  draw(ctx, state);
  emitStats();
  start();
  return {
    pause() {
      if (destroyed || state.paused) return;
      state.paused = true;
      state.pendingDir = null;
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
