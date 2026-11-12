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
  BOARD_H,
  BOARD_W,
  BOARD_X,
  BOARD_Y,
  CELL,
  DEATH_MS,
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
import { type Skin, SKINS } from "./skins";
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
  /** ms transcurridos desde la muerte (fase "dying"). */
  deathT: number;
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
    deathT: 0,
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
/**
 * Muerte de la rana: resta una vida. Con vidas, queda marcada `DEATH_MS` y
 * vuelve a la salida; sin vidas, la partida termina (`sync` emite `lives = 0`
 * y después `onGameOver(score)`).
 */
function killFrog(state: State) {
  state.lives -= 1;
  state.pendingDir = null;
  state.frog.animating = false;
  state.frog.targetCol = state.frog.col;
  state.frog.targetRow = state.frog.row;
  if (state.lives <= 0) {
    state.lives = 0;
    state.phase = "gameover";
    return;
  }
  state.phase = "dying";
  state.deathT = 0;
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
  if (state.phase === "dying") {
    // El tráfico sigue; la rana marcada vuelve a la salida al acabar la pausa.
    for (const lane of state.lanes) moveLane(lane, dt);
    state.deathT += dt * 1000;
    if (state.deathT >= DEATH_MS) {
      resetCrossing(state);
      state.phase = "playing";
    }
    return;
  }
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
      // Una sola muerte por frame: si el aterrizaje la mató, no se sigue comprobando.
      if (state.phase !== "playing") return;
    }
  }
  checkFrog(state, dt);
  if (state.phase !== "playing") return;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft === 0) killFrog(state);
}
// ─── Dibujo ────────────────────────────────────────────────────────────────
const cellX = (col: number) => col * CELL;
const cellY = (row: number) => row * CELL;
const TIME_BAR = { x: BOARD_X + 90, w: BOARD_W - 90, y: 14, h: 12 };
/** Contorno de la skin sobre el trazado actual (no hace nada si `outlineWidth` es 0). */
function outlinePath(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  color = skin.palette.outline,
) {
  if (skin.outlineWidth <= 0) return;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = color;
  ctx.lineWidth = skin.outlineWidth;
  ctx.stroke();
}
/** Barra de TIEMPO (sin la etiqueta, que va a resolución completa en `drawTexts`). */
function drawTimeBar(ctx: CanvasRenderingContext2D, state: State, skin: Skin) {
  const { palette } = skin;
  const ratio = state.timeTotal > 0 ? state.timeLeft / state.timeTotal : 0;
  const { x, y, w, h } = TIME_BAR;
  ctx.save();
  ctx.fillStyle = palette.timeTrack;
  ctx.fillRect(x, y, w, h);
  const color =
    ratio > 0.5
      ? palette.timeOk
      : ratio > 0.25
        ? palette.timeWarn
        : palette.timeDanger;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = skin.glow.time;
  ctx.fillRect(x, y, w * ratio, h);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  outlinePath(ctx, skin);
  ctx.restore();
}
function drawZones(ctx: CanvasRenderingContext2D, state: State, skin: Skin) {
  const { palette } = skin;
  // Río.
  ctx.fillStyle = palette.river;
  ctx.fillRect(
    0,
    cellY(ROW_RIVER_TOP),
    BOARD_W,
    (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL,
  );
  ctx.strokeStyle = palette.riverWave;
  ctx.lineWidth = skin.pixelated ? 2 : 1;
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
  ctx.fillStyle = palette.road;
  ctx.fillRect(
    0,
    cellY(ROW_ROAD_TOP),
    BOARD_W,
    (ROW_ROAD_BOT - ROW_ROAD_TOP + 1) * CELL,
  );
  ctx.strokeStyle = palette.roadLine;
  ctx.lineWidth = skin.lineWidth;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  for (let r = ROW_ROAD_TOP + 1; r <= ROW_ROAD_BOT; r++) {
    ctx.moveTo(0, cellY(r));
    ctx.lineTo(BOARD_W, cellY(r));
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // Filas seguras: mediana y salida.
  const inset = skin.lineWidth / 2;
  for (const r of [ROW_SAFE_MID, ROW_START]) {
    ctx.fillStyle = palette.safe;
    ctx.fillRect(0, cellY(r), BOARD_W, CELL);
    ctx.strokeStyle = palette.safeEdge;
    ctx.lineWidth = skin.lineWidth;
    ctx.strokeRect(
      inset,
      cellY(r) + inset,
      BOARD_W - inset * 2,
      CELL - inset * 2,
    );
  }
  // Fila de metas: muro con 5 bocas.
  ctx.fillStyle = palette.goalWall;
  ctx.fillRect(0, cellY(ROW_GOALS), BOARD_W, CELL);
  GOAL_COLS.forEach((col, i) => {
    const x = cellX(col) + 2;
    const y = cellY(ROW_GOALS) + 4;
    const w = GOAL_WIDTH * CELL - 4;
    const h = CELL - 4;
    ctx.fillStyle = palette.goalBg;
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.strokeStyle = palette.goalBorder;
    ctx.shadowColor = palette.goalBorder;
    ctx.shadowBlur = skin.glow.goal;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
    if (state.goals[i]) {
      drawFrogShape(ctx, skin, x + w / 2, y + h / 2, "up", false, false, true);
    }
  });
}
function drawCar(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  e: Entity,
  row: number,
  dir: 1 | -1,
) {
  const { palette } = skin;
  const x = cellX(e.col) + 3;
  const y = cellY(row) + 8;
  const w = e.width * CELL - 6;
  const h = CELL - 16;
  const body = [palette.car0, palette.car1, palette.car2][e.variant ?? 0];
  ctx.save();
  ctx.fillStyle = palette.wheel;
  for (const wx of [x + 6, x + w - 6]) {
    for (const wy of [y, y + h]) {
      ctx.beginPath();
      if (skin.pixelated) ctx.rect(wx - 4, wy - 4, 8, 8);
      else ctx.arc(wx, wy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = body;
  ctx.shadowColor = body;
  ctx.shadowBlur = skin.glow.vehicle;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, skin.cornerRadius);
  ctx.fill();
  outlinePath(ctx, skin);
  // Parabrisas en el sentido de la marcha.
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.windshield;
  const wsX = dir > 0 ? x + w - 12 : x + 4;
  ctx.fillRect(wsX, y + 4, 8, h - 8);
  ctx.restore();
}
function drawTruck(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  e: Entity,
  row: number,
  dir: 1 | -1,
) {
  const { palette } = skin;
  const x = cellX(e.col) + 3;
  const y = cellY(row) + 6;
  const w = e.width * CELL - 6;
  const h = CELL - 12;
  const cabW = 22;
  const cabX = dir > 0 ? x + w - cabW : x;
  const trailerX = dir > 0 ? x : x + cabW + 3;
  ctx.save();
  ctx.fillStyle = palette.truck;
  ctx.beginPath();
  ctx.roundRect(trailerX, y, w - cabW - 3, h, skin.outlineWidth > 0 ? 3 : 0);
  ctx.fill();
  outlinePath(ctx, skin);
  ctx.fillStyle = palette.truckCab;
  ctx.shadowColor = palette.truckCab;
  ctx.shadowBlur = skin.glow.vehicle;
  ctx.beginPath();
  ctx.roundRect(cabX, y + 2, cabW, h - 4, Math.min(4, skin.cornerRadius));
  ctx.fill();
  outlinePath(ctx, skin);
  ctx.restore();
}
function drawLog(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  e: Entity,
  row: number,
) {
  const { palette } = skin;
  const x = cellX(e.col) + 2;
  const y = cellY(row) + 6;
  const w = e.width * CELL - 4;
  const h = CELL - 12;
  ctx.save();
  ctx.fillStyle = palette.log;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, skin.pixelated ? 4 : h / 2);
  ctx.fill();
  outlinePath(ctx, skin);
  ctx.strokeStyle = palette.logLine;
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
function drawTurtles(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  e: Entity,
  row: number,
) {
  const { palette } = skin;
  ctx.save();
  for (let i = 0; i < e.width; i++) {
    const cx = cellX(e.col + i) + CELL / 2;
    const cy = cellY(row) + CELL / 2;
    if (e.submerged) {
      ctx.strokeStyle = palette.turtleSubmerged;
      ctx.lineWidth = 2;
      ctx.setLineDash(skin.pixelated ? [4, 4] : []);
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    ctx.fillStyle = palette.turtle;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.fill();
    outlinePath(ctx, skin);
    // Escamas del caparazón.
    ctx.strokeStyle = palette.turtleScale;
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
/**
 * Sprites de vehículos con brillo, uno por tipo, longitud, color y sentido. El
 * `shadowBlur` se paga una vez al crearlos y no en cada frame. Se vacían al cambiar de skin.
 */
type SpriteCache = {
  skin: Skin | null;
  sprites: Map<string, HTMLCanvasElement>;
};
/** Margen alrededor del vehículo para que el brillo no se recorte. */
const spritePad = (skin: Skin) => Math.ceil(skin.glow.vehicle * 2) + 2;
function vehicleSprite(
  cache: SpriteCache,
  skin: Skin,
  e: Entity,
  dir: 1 | -1,
): HTMLCanvasElement | null {
  if (cache.skin !== skin) {
    cache.sprites.clear();
    cache.skin = skin;
  }
  const key = `${e.type}:${e.width}:${e.variant ?? 0}:${dir}`;
  const cached = cache.sprites.get(key);
  if (cached) return cached;
  const pad = spritePad(skin);
  const sprite = document.createElement("canvas");
  sprite.width = e.width * CELL + pad * 2;
  sprite.height = CELL + pad * 2;
  const sctx = sprite.getContext("2d");
  if (!sctx) return null;
  sctx.translate(pad, pad);
  const proto: Entity = { ...e, col: 0 };
  if (e.type === "car") drawCar(sctx, skin, proto, 0, dir);
  else drawTruck(sctx, skin, proto, 0, dir);
  cache.sprites.set(key, sprite);
  return sprite;
}
function drawEntities(
  ctx: CanvasRenderingContext2D,
  state: State,
  skin: Skin,
  cache: SpriteCache,
) {
  // Solo compensa con brillo: sin él, el vector es barato y RETRO no se suaviza al escalar.
  const useSprites = skin.glow.vehicle > 0;
  const pad = spritePad(skin);
  for (const lane of state.lanes) {
    for (const e of lane.entities) {
      if (e.type === "car" || e.type === "truck") {
        const sprite = useSprites
          ? vehicleSprite(cache, skin, e, lane.dir)
          : null;
        if (sprite) {
          ctx.drawImage(sprite, cellX(e.col) - pad, cellY(lane.row) - pad);
        } else if (e.type === "car") {
          drawCar(ctx, skin, e, lane.row, lane.dir);
        } else {
          drawTruck(ctx, skin, e, lane.row, lane.dir);
        }
      } else if (e.type === "log") drawLog(ctx, skin, e, lane.row);
      else drawTurtles(ctx, skin, e, lane.row);
    }
  }
}
const FACING_ANGLE: Record<Direction, number> = {
  up: 0,
  right: Math.PI / 2,
  down: Math.PI,
  left: -Math.PI / 2,
};
/**
 * Rana centrada en (cx, cy): cuerpo 28 × 24, ojos y patas (extendidas al
 * saltar). `inGoal` la pinta con el color de boca ocupada.
 */
function drawFrogShape(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  cx: number,
  cy: number,
  facing: Direction,
  jumping: boolean,
  dead: boolean,
  inGoal: boolean,
) {
  const { palette } = skin;
  const color = dead ? palette.frogDead : inGoal ? palette.goal : palette.frog;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(FACING_ANGLE[facing]);
  // Patas.
  ctx.strokeStyle = palette.frogDark;
  ctx.lineWidth = 4;
  ctx.lineCap = skin.pixelated ? "square" : "round";
  const reach = jumping ? 17 : 13;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * 8, -6);
    ctx.lineTo(s * reach, -reach + 2);
    ctx.moveTo(s * 8, 6);
    ctx.lineTo(s * reach, reach - 2);
  }
  // Con contorno, las patas llevan un borde para leerse sobre filas del mismo tono.
  if (skin.outlineWidth > 0) {
    ctx.strokeStyle = palette.outline;
    ctx.lineWidth = 4 + skin.outlineWidth * 2;
    ctx.stroke();
    ctx.strokeStyle = palette.frogDark;
    ctx.lineWidth = 4;
  }
  ctx.stroke();
  // Cuerpo.
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = skin.glow.frog;
  ctx.beginPath();
  ctx.ellipse(0, 0, 12, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  outlinePath(ctx, skin, dead ? palette.frogDeadStroke : palette.outline);
  ctx.shadowBlur = 0;
  // Ojos.
  for (const s of [-1, 1]) {
    ctx.fillStyle = palette.eyeWhite;
    ctx.beginPath();
    ctx.arc(s * 6, -9, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.eyePupil;
    ctx.beginPath();
    ctx.arc(s * 6, -10, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function drawFrog(ctx: CanvasRenderingContext2D, state: State, skin: Skin) {
  const { frog } = state;
  const t = frog.animating ? Math.min(1, frog.animT / JUMP_MS) : 0;
  const col = frog.col + (frog.targetCol - frog.col) * t;
  const row = frog.row + (frog.targetRow - frog.row) * t;
  const dead = state.phase === "dying" || state.phase === "gameover";
  drawFrogShape(
    ctx,
    skin,
    cellX(col) + CELL / 2,
    cellY(row) + CELL / 2,
    frog.facing,
    frog.animating,
    dead,
    false,
  );
}
/** Fondo y zonas del tablero (río, carretera, filas seguras y bocas): todo lo que no se mueve. */
function paintStatic(ctx: CanvasRenderingContext2D, state: State, skin: Skin) {
  ctx.fillStyle = skin.palette.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(BOARD_X, BOARD_Y);
  ctx.beginPath();
  ctx.rect(0, 0, BOARD_W, BOARD_H);
  ctx.clip();
  drawZones(ctx, state, skin);
  ctx.restore();
}
/**
 * Capa con el fondo fijo, a la resolución del lienzo de destino (800×600 o
 * 400×300 en RETRO). Solo se repinta si cambian la skin o las bocas ocupadas.
 */
type StaticLayer = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  skin: Skin | null;
  goals: string;
};
function createStaticLayer(w: number, h: number): StaticLayer | null {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  return ctx ? { canvas, ctx, skin: null, goals: "" } : null;
}
function staticCanvas(
  layer: StaticLayer,
  state: State,
  skin: Skin,
): HTMLCanvasElement {
  const goals = state.goals.map(Number).join("");
  if (layer.skin !== skin || layer.goals !== goals) {
    layer.ctx.setTransform(
      layer.canvas.width / W,
      0,
      0,
      layer.canvas.height / H,
      0,
      0,
    );
    paintStatic(layer.ctx, state, skin);
    layer.skin = skin;
    layer.goals = goals;
  }
  return layer.canvas;
}
/** Fondo, barra de tiempo y tablero (lo que se pixela en RETRO). */
function drawWorld(
  ctx: CanvasRenderingContext2D,
  state: State,
  skin: Skin,
  layer: StaticLayer | null,
  sprites: SpriteCache,
) {
  // La capa tiene la resolución del destino: se copia 1:1.
  if (layer) ctx.drawImage(staticCanvas(layer, state, skin), 0, 0, W, H);
  else paintStatic(ctx, state, skin);
  drawTimeBar(ctx, state, skin);
  ctx.save();
  ctx.translate(BOARD_X, BOARD_Y);
  // Lo que sale del tablero (entidades en el bucle) no se ve en los márgenes.
  ctx.beginPath();
  ctx.rect(0, 0, BOARD_W, BOARD_H);
  ctx.clip();
  drawEntities(ctx, state, skin, sprites);
  drawFrog(ctx, state, skin);
  ctx.restore();
}
/** Textos del canvas, siempre a resolución completa: etiqueta TIEMPO y aviso inicial. */
function drawTexts(ctx: CanvasRenderingContext2D, state: State, skin: Skin) {
  const { palette } = skin;
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.font = skin.timeFont;
  ctx.textAlign = "left";
  ctx.fillStyle = palette.timeLabel;
  ctx.fillText("TIEMPO", BOARD_X, TIME_BAR.y + TIME_BAR.h / 2);
  if (state.phase === "waiting") {
    ctx.font = skin.hintFont;
    ctx.textAlign = "center";
    ctx.fillStyle = palette.hint;
    ctx.shadowColor = palette.hint;
    ctx.shadowBlur = skin.glow.hint;
    ctx.fillText(
      HINT,
      BOARD_X + BOARD_W / 2,
      BOARD_Y + cellY(ROW_SAFE_MID) + CELL / 2,
    );
  }
  ctx.restore();
}
/** Lienzo a media resolución para RETRO, creado en la factory. */
type LowRes = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };
/** Lienzos auxiliares de la instancia, creados en la factory (nunca al importar el módulo). */
type Gfx = {
  low: LowRes | null;
  /** Fondo fijo a resolución completa y a la de `low` (RETRO). */
  bgFull: StaticLayer | null;
  bgLow: StaticLayer | null;
  sprites: SpriteCache;
};
function draw(
  ctx: CanvasRenderingContext2D,
  state: State,
  skin: Skin,
  gfx: Gfx,
) {
  const { low } = gfx;
  if (skin.pixelated && low) {
    low.ctx.setTransform(
      low.canvas.width / W,
      0,
      0,
      low.canvas.height / H,
      0,
      0,
    );
    drawWorld(low.ctx, state, skin, gfx.bgLow, gfx.sprites);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(low.canvas, 0, 0, W, H);
    ctx.restore();
  } else {
    drawWorld(ctx, state, skin, gfx.bgFull, gfx.sprites);
  }
  drawTexts(ctx, state, skin);
}
// ─── Factory ───────────────────────────────────────────────────────────────
export const createRanariaGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
): GameInstance => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  let skin: Skin = SKINS[options?.skin ?? DEFAULT_SKIN];
  // RETRO: el mundo se dibuja a 400×300 y se escala sin suavizado.
  const lowCanvas = document.createElement("canvas");
  lowCanvas.width = W / 2;
  lowCanvas.height = H / 2;
  const lowCtx = lowCanvas.getContext("2d");
  const low: LowRes | null = lowCtx ? { canvas: lowCanvas, ctx: lowCtx } : null;
  const gfx: Gfx = {
    low,
    bgFull: createStaticLayer(W, H),
    bgLow: createStaticLayer(lowCanvas.width, lowCanvas.height),
    sprites: { skin: null, sprites: new Map() },
  };
  // En "waiting" nada se mueve: basta con un frame hasta que cambie la skin o se reinicie.
  let waitingDrawn = false;
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
    const waiting = state.phase === "waiting";
    if (!waiting || !waitingDrawn) draw(ctx, state, skin, gfx);
    waitingDrawn = waiting;
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
  draw(ctx, state, skin, gfx);
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
      waitingDrawn = false;
      draw(ctx, state, skin, gfx);
      emitStats();
      start();
    },
    setSkin(id: SkinId) {
      if (destroyed) return;
      skin = SKINS[id];
      waitingDrawn = false;
      // Con el bucle parado (pausa o fin) se redibuja ya; en juego lo hace el siguiente frame.
      if (rafId === null) draw(ctx, state, skin, gfx);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      window.removeEventListener("keydown", onKeyDown);
    },
  };
};
