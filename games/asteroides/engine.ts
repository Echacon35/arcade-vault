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
  ASTEROID_PARTICLES_PER_SIZE,
  H,
  LEVEL_ASTEROIDS_BASE,
  MAX_DT,
  PARTICLE_DEFAULT_COUNT,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEED_KILLS,
  RESPAWN_DELAY,
  SAFE_DIST,
  SHIP_EXPLOSION_PARTICLES,
  SHIP_HIT_FACTOR,
  START_ASTEROIDS,
  START_LIVES,
  W,
} from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  dist,
  drawAsteroids,
  drawBullets,
  rand,
} from "./entities";
import { SKINS, type Skin } from "./skins";
type Phase = "playing" | "dead" | "gameover";
type State = {
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  powerUps: PowerUp[];
  score: number;
  lives: number;
  level: number;
  phase: Phase;
  deadTimer: number;
  powerUpSpawned: boolean;
  killsSinceSpawn: number;
  paused: boolean;
};
/** Teclas de juego: se leen de `KeyboardEvent.code`. */
const PLAY_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"] as const;
const PAUSE_KEYS = ["KeyP", "Escape"] as const;
const isPlayKey = (code: string) =>
  (PLAY_KEYS as readonly string[]).includes(code);
const isPauseKey = (code: string) =>
  (PAUSE_KEYS as readonly string[]).includes(code);
function spawnAsteroids(state: State, count: number) {
  for (let i = 0; i < count; i++) {
    let x: number;
    let y: number;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    state.asteroids.push(new Asteroid(x, y, 3));
  }
}
function createState(): State {
  const state: State = {
    ship: new Ship(),
    bullets: [],
    asteroids: [],
    particles: [],
    powerUps: [],
    score: 0,
    lives: START_LIVES,
    level: 1,
    phase: "playing",
    deadTimer: 0,
    powerUpSpawned: false,
    killsSinceSpawn: 0,
    paused: false,
  };
  spawnAsteroids(state, START_ASTEROIDS);
  return state;
}
function nextLevel(state: State) {
  state.level++;
  state.bullets = [];
  state.particles = [];
  state.powerUps = [];
  state.powerUpSpawned = false;
  state.killsSinceSpawn = 0;
  state.ship.reset();
  spawnAsteroids(state, LEVEL_ASTEROIDS_BASE + state.level);
}
function explode(
  state: State,
  x: number,
  y: number,
  count = PARTICLE_DEFAULT_COUNT,
) {
  for (let i = 0; i < count; i++) state.particles.push(new Particle(x, y));
}
function killShip(state: State) {
  const { ship } = state;
  explode(state, ship.x, ship.y, SHIP_EXPLOSION_PARTICLES);
  ship.dead = true;
  state.lives--;
  if (state.lives <= 0) {
    state.phase = "gameover";
  } else {
    state.phase = "dead";
    state.deadTimer = RESPAWN_DELAY;
  }
}
function updateParticles(state: State, dt: number) {
  state.particles.forEach((p) => p.update(dt));
  state.particles = state.particles.filter((p) => !p.dead);
}
function update(
  state: State,
  dt: number,
  keys: ReadonlySet<string>,
  shoot: boolean,
) {
  if (state.phase === "gameover") {
    updateParticles(state, dt);
    return;
  }
  if (state.phase === "dead") {
    state.deadTimer -= dt;
    updateParticles(state, dt);
    state.asteroids.forEach((a) => a.update(dt));
    if (state.deadTimer <= 0) {
      state.phase = "playing";
      state.ship.reset();
    }
    return;
  }
  const { ship } = state;
  // Disparar
  if (shoot) state.bullets.push(...ship.tryShoot());
  ship.update(dt, keys);
  state.bullets.forEach((b) => b.update(dt));
  state.asteroids.forEach((a) => a.update(dt));
  state.particles.forEach((p) => p.update(dt));
  state.powerUps.forEach((p) => p.update(dt));
  state.bullets = state.bullets.filter((b) => !b.dead);
  state.particles = state.particles.filter((p) => !p.dead);
  state.powerUps = state.powerUps.filter((p) => !p.dead);
  for (const p of state.powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      ship.tripleShot = POWERUP_DURATION;
    }
  }
  // Bala vs asteroide
  const newAsteroids: Asteroid[] = [];
  for (const b of state.bullets) {
    for (const a of state.asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        state.score += POINTS[a.size];
        explode(state, a.x, a.y, a.size * ASTEROID_PARTICLES_PER_SIZE);
        newAsteroids.push(...a.split());
        if (!state.powerUpSpawned) {
          state.killsSinceSpawn++;
          const guaranteed = state.killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
          if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
            state.powerUps.push(new PowerUp(a.x, a.y));
            state.powerUpSpawned = true;
          }
        }
      }
    }
  }
  state.asteroids = state.asteroids.filter((a) => !a.dead).concat(newAsteroids);
  state.bullets = state.bullets.filter((b) => !b.dead);
  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of state.asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * SHIP_HIT_FACTOR) {
        killShip(state);
        break;
      }
    }
  }
  // Nivel completado
  if (state.asteroids.length === 0) nextLevel(state);
}
/** Lienzo de baja resolución para las skins pixeladas (`pixelScale > 1`). */
type PixelBuffer = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scale: number;
};
/** Fondo y piezas: es lo que se pixela en RETRO. */
function drawWorld(ctx: CanvasRenderingContext2D, state: State, skin: Skin) {
  ctx.shadowBlur = 0;
  ctx.fillStyle = skin.palette.background;
  ctx.fillRect(0, 0, W, H);
  state.particles.forEach((p) => p.draw(ctx, skin));
  drawAsteroids(ctx, state.asteroids, skin);
  state.powerUps.forEach((p) => p.draw(ctx, skin));
  drawBullets(ctx, state.bullets, skin);
  state.ship.draw(ctx, skin);
  ctx.shadowBlur = 0;
}
/** Texto del canvas: siempre a resolución completa para que se lea en todas las skins. */
function drawText(ctx: CanvasRenderingContext2D, state: State, skin: Skin) {
  state.powerUps.forEach((p) => p.drawLabel(ctx, skin));
  // Único HUD dentro del canvas: el disparo triple activo.
  if (state.ship.tripleShot > 0) {
    ctx.shadowBlur = skin.glow;
    ctx.shadowColor = skin.glow > 0 ? skin.palette.hudText : "transparent";
    ctx.fillStyle = skin.palette.hudText;
    ctx.font = skin.hudFont;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`3x  ${state.ship.tripleShot.toFixed(1)}s`, 14, 26);
  }
  ctx.shadowBlur = 0;
}
function draw(
  ctx: CanvasRenderingContext2D,
  state: State,
  skin: Skin,
  buffer: PixelBuffer | null,
) {
  if (buffer) {
    buffer.ctx.setTransform(1 / buffer.scale, 0, 0, 1 / buffer.scale, 0, 0);
    drawWorld(buffer.ctx, state, skin);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buffer.canvas, 0, 0, W, H);
  } else {
    drawWorld(ctx, state, skin);
  }
  drawText(ctx, state, skin);
}
export const createAsteroidsGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
  options?: GameOptions,
): GameInstance => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
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
  const render = () => draw(ctx, state, skin, buffer);
  const keys = new Set<string>();
  const justPressed = new Set<string>();
  let state = createState();
  let rafId: number | null = null;
  let lastTime: number | null = null;
  let lastStats: GameStats | null = null;
  let gameOverNotified = false;
  let destroyed = false;
  const clearInput = () => {
    keys.clear();
    justPressed.clear();
  };
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
  const loop = (ts: number) => {
    rafId = null;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    const shoot = justPressed.has("Space");
    justPressed.delete("Space");
    update(state, dt, keys, shoot);
    render();
    emitStats();
    if (state.phase === "gameover") {
      // El motor se detiene; el modal de React toma el relevo.
      clearInput();
      if (!gameOverNotified) {
        gameOverNotified = true;
        callbacks.onGameOver(state.score);
      }
      return;
    }
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
    lastTime = null; // dt = 0 en el primer frame: no se acumula el tiempo parado.
    rafId = requestAnimationFrame(loop);
  };
  const stop = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (isTypingTarget(e.target) || state.phase === "gameover") return;
    if (isPauseKey(e.code)) {
      e.preventDefault();
      if (!e.repeat) callbacks.onPauseToggle();
      return;
    }
    if (state.paused || !isPlayKey(e.code)) return;
    e.preventDefault();
    if (!keys.has(e.code)) justPressed.add(e.code);
    keys.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
    if (isTypingTarget(e.target) || state.phase === "gameover" || state.paused)
      return;
    if (isPlayKey(e.code)) e.preventDefault();
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  start();
  return {
    pause() {
      if (destroyed || state.paused) return;
      state.paused = true;
      clearInput();
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
      clearInput();
      state = createState();
      lastStats = null;
      gameOverNotified = false;
      start();
    },
    setSkin(id: SkinId) {
      if (destroyed) return;
      skin = SKINS[id];
      buffer = pixelBuffer();
      // Con el bucle parado (pausa o fin) se redibuja ya; en juego lo hace el siguiente frame.
      if (rafId === null) render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      clearInput();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      pixelCanvas = null;
      buffer = null;
    },
  };
};
