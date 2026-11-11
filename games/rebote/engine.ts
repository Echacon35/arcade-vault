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
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_POINTS,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  H,
  LAST_LEVEL,
  MAX_DT,
  PADDLE_CATCH,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  SPRITESHEET_SRC,
  START_LIVES,
  W,
} from "./constants";
import { LEVELS } from "./levels";
import { BLOCK_PALETTE_KEY, type Skin, SKINS } from "./skins";
import { type Sounds, createSounds } from "./sounds";
import {
  type BlockColor,
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  SPRITES,
  drawFrame,
} from "./sprites";
type Rect = { x: number; y: number; w: number; h: number };
type Block = Rect & { color: BlockColor; alive: boolean };
type Explosion = Rect & { color: BlockColor; elapsed: number }; // ms
type Ball = Rect & { vx: number; vy: number }; // px/s
type Phase = "loading" | "error" | "playing" | "gameover";
type State = {
  paddle: Rect;
  ball: Ball;
  blocks: Block[];
  explosions: Explosion[];
  keys: { ArrowLeft: boolean; ArrowRight: boolean };
  score: number;
  lives: number;
  level: number; // 1–5
  phase: Phase;
  paused: boolean;
};
/** Teclas de juego: se leen de `KeyboardEvent.code`. */
const PLAY_KEYS = ["ArrowLeft", "ArrowRight"] as const;
const PAUSE_KEYS = ["KeyP", "Escape"] as const;
type PlayKey = (typeof PLAY_KEYS)[number];
const isPlayKey = (code: string): code is PlayKey =>
  (PLAY_KEYS as readonly string[]).includes(code);
const isPauseKey = (code: string) =>
  (PAUSE_KEYS as readonly string[]).includes(code);
function createState(phase: Phase): State {
  const state: State = {
    paddle: { x: (W - PADDLE_W) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H },
    ball: { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 },
    blocks: [],
    explosions: [],
    keys: { ArrowLeft: false, ArrowRight: false },
    score: 0,
    lives: START_LIVES,
    level: 1,
    phase,
    paused: false,
  };
  loadLevel(state, 1);
  return state;
}
/** Pelota centrada sobre la paleta, saliendo ya con la velocidad del nivel. */
function resetBall(state: State) {
  const { ball, paddle } = state;
  const { speed } = LEVELS[state.level - 1];
  ball.x = paddle.x + (paddle.w - ball.w) / 2;
  ball.y = paddle.y - ball.h;
  ball.vx = BASE_BALL_VX * speed;
  ball.vy = BASE_BALL_VY * speed;
}
function loadLevel(state: State, n: number) {
  state.level = n;
  state.blocks = LEVELS[n - 1].blocks.map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
  state.explosions = [];
  resetBall(state);
}
function collideAABB(a: Rect, b: Rect) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
/** `update` de `game.js`, con el estado como parámetro y el sonido inyectado. */
function update(state: State, dt: number, sounds: Sounds) {
  if (state.phase !== "playing") return;
  const { paddle, ball, keys } = state;
  // Paleta
  if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
  if (keys.ArrowRight)
    paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
  // Movimiento de la pelota
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  // Rebotes en paredes (izquierda, derecha, arriba)
  if (ball.x <= 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
    sounds.bounce();
  }
  if (ball.x + ball.w >= W) {
    ball.x = W - ball.w;
    ball.vx = -Math.abs(ball.vx);
    sounds.bounce();
  }
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy = Math.abs(ball.vy);
    sounds.bounce();
  }
  // Rebote en la paleta
  if (
    ball.vy > 0 &&
    ball.x + ball.w > paddle.x &&
    ball.x < paddle.x + paddle.w &&
    ball.y + ball.h >= paddle.y &&
    ball.y + ball.h <= paddle.y + paddle.h + PADDLE_CATCH
  ) {
    ball.y = paddle.y - ball.h;
    ball.vy = -Math.abs(ball.vy);
    sounds.bounce();
  }
  // Colisión con bloques: uno por frame
  for (const block of state.blocks) {
    if (!block.alive || !collideAABB(ball, block)) continue;
    block.alive = false;
    state.explosions.push({
      x: block.x,
      y: block.y,
      w: block.w,
      h: block.h,
      color: block.color,
      elapsed: 0,
    });
    state.score += BLOCK_POINTS;
    ball.vy = -ball.vy;
    sounds.breakBlock();
    if (state.blocks.every((b) => !b.alive)) {
      if (state.level < LAST_LEVEL) {
        loadLevel(state, state.level + 1);
      } else {
        // Nivel 5 superado: fin directo, sin overlay de victoria ni pérdida de vida.
        state.phase = "gameover";
        return;
      }
    }
    break;
  }
  // Explosiones (ms)
  for (const exp of state.explosions) exp.elapsed += dt * 1000;
  state.explosions = state.explosions.filter(
    (exp) => exp.elapsed < EXPLOSION_DURATION,
  );
  // Pelota perdida
  if (ball.y > H) {
    state.lives--;
    if (state.lives <= 0) {
      state.lives = 0;
      state.phase = "gameover";
    } else {
      resetBall(state);
    }
  }
}
/** Lienzo de baja resolución para las skins pixeladas (`pixelScale > 1`). */
type PixelBuffer = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number;
};
const isVisible = (color: string) => color !== "transparent";
function drawMessage(
  ctx: CanvasRenderingContext2D,
  text: string,
  color: string,
  skin: Skin,
) {
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = skin.messageFont;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2);
}
/** Rectángulo (redondeado si `r > 0`) relleno y, si la skin lo pide, con contorno interior. */
function drawBox(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  fill: string,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const stroke = isVisible(skin.palette.outline) && skin.lineWidth > 0;
  // El trazo va centrado en el borde: se mete media línea para no salirse del Rect.
  const half = stroke ? skin.lineWidth / 2 : 0;
  ctx.beginPath();
  if (r > 0) ctx.roundRect(x + half, y + half, w - 2 * half, h - 2 * half, r);
  else ctx.rect(x + half, y + half, w - 2 * half, h - 2 * half);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = skin.lineWidth;
    ctx.strokeStyle = skin.palette.outline;
    ctx.stroke();
  }
}
function drawBlockShape(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  color: BlockColor,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const i = skin.blockInset;
  const fill = skin.palette[BLOCK_PALETTE_KEY[color]];
  drawBox(ctx, skin, fill, x + i, y + i, w - 2 * i, h - 2 * i, skin.radius);
  if (isVisible(skin.palette.blockHighlight)) {
    ctx.fillStyle = skin.palette.blockHighlight;
    ctx.fillRect(x + i, y + i, w - 2 * i, 2);
  }
}
/** Explosión vectorial: 4 frames en los que el bloque se parte en cuartos que se alejan y encogen. */
function drawExplosionShape(
  ctx: CanvasRenderingContext2D,
  skin: Skin,
  exp: Explosion,
  frameIndex: number,
) {
  const f = (frameIndex + 1) / 4;
  const pw = (exp.w / 2) * (1 - 0.55 * f);
  const ph = (exp.h / 2) * (1 - 0.55 * f);
  const fill = skin.palette[BLOCK_PALETTE_KEY[exp.color]];
  const r = Math.min(skin.radius, ph / 2);
  for (const qx of [0, 1])
    for (const qy of [0, 1]) {
      const cx = exp.x + exp.w / 4 + (qx * exp.w) / 2 + (qx ? 1 : -1) * f * 10;
      const cy = exp.y + exp.h / 4 + (qy * exp.h) / 2 + (qy ? 1 : -1) * f * 6;
      drawBox(ctx, skin, fill, cx - pw / 2, cy - ph / 2, pw, ph, r);
    }
}
function drawPaddleShape(ctx: CanvasRenderingContext2D, skin: Skin, p: Rect) {
  const r = skin.radius > 0 ? p.h / 2 : 0;
  drawBox(ctx, skin, skin.palette.paddle, p.x, p.y, p.w, p.h, r);
  if (isVisible(skin.palette.paddleAccent)) {
    ctx.fillStyle = skin.palette.paddleAccent;
    ctx.fillRect(p.x + 4, p.y + 4, 6, p.h - 8);
    ctx.fillRect(p.x + p.w - 10, p.y + 4, 6, p.h - 8);
  }
}
function drawBallShape(ctx: CanvasRenderingContext2D, skin: Skin, b: Rect) {
  if (skin.ballShape === "square") {
    drawBox(ctx, skin, skin.palette.ball, b.x, b.y, b.w, b.h, 0);
    return;
  }
  const stroke = isVisible(skin.palette.outline) && skin.lineWidth > 0;
  const half = stroke ? skin.lineWidth / 2 : 0;
  ctx.beginPath();
  ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 - half, 0, Math.PI * 2);
  ctx.fillStyle = skin.palette.ball;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = skin.lineWidth;
    ctx.strokeStyle = skin.palette.outline;
    ctx.stroke();
  }
}
/** Fondo y piezas: es lo que se pixela en RETRO. NEÓN usa el spritesheet; el resto, formas vectoriales. */
function drawWorld(
  ctx: CanvasRenderingContext2D,
  state: State,
  img: HTMLImageElement,
  skin: Skin,
) {
  ctx.shadowBlur = 0;
  ctx.fillStyle = skin.palette.background;
  ctx.fillRect(0, 0, W, H);
  for (const b of state.blocks) {
    if (!b.alive) continue;
    if (skin.sprites)
      drawFrame(ctx, img, SPRITES.blocks[b.color], b.x, b.y, b.w, b.h);
    else drawBlockShape(ctx, skin, b.color, b.x, b.y, b.w, b.h);
  }
  for (const exp of state.explosions) {
    const frameIndex = Math.min(
      Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
      3,
    );
    if (skin.sprites)
      drawFrame(
        ctx,
        img,
        EXPLOSION_FRAMES[exp.color][frameIndex],
        exp.x,
        exp.y,
        exp.w,
        exp.h,
      );
    else drawExplosionShape(ctx, skin, exp, frameIndex);
  }
  const { paddle, ball } = state;
  // Brillo solo en las piezas que se mueven (NEÓN).
  ctx.shadowBlur = skin.glow;
  ctx.shadowColor = skin.glow > 0 ? skin.palette.glow : "transparent";
  if (skin.sprites) {
    drawFrame(ctx, img, SPRITES.paddle, paddle.x, paddle.y, paddle.w, paddle.h);
    drawFrame(ctx, img, SPRITES.ball, ball.x, ball.y, ball.w, ball.h);
  } else {
    drawPaddleShape(ctx, skin, paddle);
    drawBallShape(ctx, skin, ball);
  }
  ctx.shadowBlur = 0;
}
/** `draw` de `game.js` sin el HUD ni los overlays (los pone `GamePlayer`). */
function draw(
  ctx: CanvasRenderingContext2D,
  state: State,
  img: HTMLImageElement,
  skin: Skin,
  buffer: PixelBuffer | null,
) {
  if (state.phase === "loading" || state.phase === "error") {
    // Mensajes siempre a resolución completa para que se lean en todas las skins.
    ctx.shadowBlur = 0;
    ctx.fillStyle = skin.palette.background;
    ctx.fillRect(0, 0, W, H);
    if (state.phase === "loading")
      drawMessage(ctx, "CARGANDO…", skin.palette.loading, skin);
    else
      drawMessage(
        ctx,
        "▸ SEÑAL PERDIDA — REINTENTA_",
        skin.palette.error,
        skin,
      );
    return;
  }
  if (buffer) {
    buffer.ctx.setTransform(1 / buffer.scale, 0, 0, 1 / buffer.scale, 0, 0);
    drawWorld(buffer.ctx, state, img, skin);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer.canvas, 0, 0, W, H);
  } else {
    // Valor por defecto del canvas: los sprites de NEÓN se escalan como en el original.
    ctx.imageSmoothingEnabled = true;
    drawWorld(ctx, state, img, skin);
  }
}
export const createReboteGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
): GameInstance => {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) throw new Error("Canvas 2D no disponible");
  const ctx: CanvasRenderingContext2D = maybeCtx;
  let skin = SKINS[options?.skin ?? DEFAULT_SKIN];
  // Se crea bajo demanda (nunca al importar el módulo) y se reutiliza entre cambios de skin.
  let pixelCanvas: HTMLCanvasElement | null = null;
  const pixelBuffer = (): PixelBuffer | null => {
    if (skin.pixelScale <= 1) return null;
    pixelCanvas ??= document.createElement("canvas");
    const w = Math.ceil(W / skin.pixelScale);
    const h = Math.ceil(H / skin.pixelScale);
    if (pixelCanvas.width !== w) pixelCanvas.width = w;
    if (pixelCanvas.height !== h) pixelCanvas.height = h;
    const pctx = pixelCanvas.getContext("2d");
    return pctx
      ? { canvas: pixelCanvas, ctx: pctx, scale: skin.pixelScale }
      : null;
  };
  let buffer = pixelBuffer();
  const sounds = createSounds();
  const img = new Image();
  let imgReady = false;
  let state = createState("loading");
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastStats: GameStats | null = null;
  let gameOverNotified = false;
  let destroyed = false;
  const render = () => draw(ctx, state, img, skin, buffer);
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
  const releaseKeys = () => {
    state.keys.ArrowLeft = false;
    state.keys.ArrowRight = false;
  };
  /** Tras cada frame: HUD y, si la partida terminó, parada y aviso único. */
  const sync = () => {
    emitStats();
    if (state.phase === "gameover") {
      stop();
      releaseKeys();
      sounds.stopAll();
      if (!gameOverNotified) {
        gameOverNotified = true;
        callbacks.onGameOver(state.score);
      }
    }
  };
  const loop = (ts: number) => {
    rafId = null;
    // dt en segundos con tope. El primer frame tras arrancar o reanudar vale 0.
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(state, dt, sounds);
    render();
    sync();
    if (state.phase !== "playing") return;
    rafId = requestAnimationFrame(loop);
  };
  const start = () => {
    if (
      destroyed ||
      rafId !== null ||
      state.paused ||
      state.phase !== "playing"
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
    if (!isPlayKey(e.code)) return;
    e.preventDefault();
    if (state.paused || state.phase !== "playing") return;
    state.keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (!isPlayKey(e.code)) return;
    // Soltar siempre es seguro: evita flechas «pegadas».
    state.keys[e.code] = false;
    if (!isTypingTarget(e.target) && state.phase !== "gameover")
      e.preventDefault();
  };
  // SPEC 10: puntero (ratón, dedo o lápiz); tocar el canvas también coloca la pala.
  const onPointerMove = (e: PointerEvent) => {
    if (state.paused || state.phase !== "playing") return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    const mouseX = (e.clientX - rect.left) * (W / rect.width);
    const { paddle } = state;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  };
  img.onload = () => {
    if (destroyed) return;
    imgReady = true;
    if (state.phase === "loading") state.phase = "playing";
    render();
    start();
  };
  img.onerror = () => {
    if (destroyed) return;
    state.phase = "error";
    stop();
    render();
  };
  img.src = SPRITESHEET_SRC;
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerMove);
  render();
  emitStats();
  return {
    pause() {
      if (destroyed || state.paused) return;
      state.paused = true;
      releaseKeys();
      stop();
      sounds.stopAll();
    },
    resume() {
      if (destroyed || !state.paused) return;
      state.paused = false;
      start();
    },
    restart() {
      if (destroyed) return;
      stop();
      sounds.stopAll();
      const phase: Phase =
        state.phase === "error" ? "error" : imgReady ? "playing" : "loading";
      state = createState(phase);
      lastStats = null;
      gameOverNotified = false;
      render();
      emitStats();
      start();
    },
    setSkin(id: SkinId) {
      if (destroyed) return;
      skin = SKINS[id];
      buffer = pixelBuffer();
      // Con el bucle parado (carga, error, pausa o fin) se redibuja ya; en juego lo hace el siguiente frame.
      if (rafId === null) render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerMove);
      img.onload = null;
      img.onerror = null;
      sounds.dispose();
      pixelCanvas = null;
      buffer = null;
    },
  };
};
