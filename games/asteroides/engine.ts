import { isTypingTarget } from "../shared/input";
import type {
  GameCallbacks,
  GameFactory,
  GameInstance,
  GameStats,
} from "../types";
import {
  ASTEROID_PARTICLES_PER_SIZE,
  COLORS,
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
  rand,
} from "./entities";
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
function draw(ctx: CanvasRenderingContext2D, state: State) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);
  state.particles.forEach((p) => p.draw(ctx));
  state.asteroids.forEach((a) => a.draw(ctx));
  state.powerUps.forEach((p) => p.draw(ctx));
  state.bullets.forEach((b) => b.draw(ctx));
  state.ship.draw(ctx);
  // Único HUD dentro del canvas: el disparo triple activo.
  if (state.ship.tripleShot > 0) {
    ctx.fillStyle = COLORS.powerUp;
    ctx.font = "15px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`3x  ${state.ship.tripleShot.toFixed(1)}s`, 14, 26);
  }
}
export const createAsteroidsGame: GameFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameCallbacks,
): GameInstance => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
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
    draw(ctx, state);
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
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      clearInput();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
};
