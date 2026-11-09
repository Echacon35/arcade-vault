// Constantes portadas sin cambios de references/started-games/02-asteroids/game.js.

// ── Espacio lógico ────────────────────────────────────────────────────────────
export const W = 800;
export const H = 600;
/** Límite de dt por frame (s), igual que el original. */
export const MAX_DT = 0.05;

// ── Partida ───────────────────────────────────────────────────────────────────
export const START_LIVES = 3;
export const START_ASTEROIDS = 4;
/** Asteroides por nivel a partir del 2: 3 + nivel. */
export const LEVEL_ASTEROIDS_BASE = 3;
/** Distancia mínima al centro al generar asteroides (px). */
export const SAFE_DIST = 130;
/** Segundos hasta reaparecer tras perder una vida. */
export const RESPAWN_DELAY = 2;

// ── Nave ──────────────────────────────────────────────────────────────────────
export const SHIP_RADIUS = 12;
export const SHIP_INVINCIBLE = 3;
export const SHIP_ROT = 3.5; // rad/s
export const SHIP_THRUST = 260; // px/s²
export const SHIP_DRAG = 0.987;
export const SHIP_SHOOT_COOLDOWN = 0.2;
export const SHIP_NOSE = 21;
/** Factor del radio del asteroide en la colisión con la nave. */
export const SHIP_HIT_FACTOR = 0.82;
export const SHIP_EXPLOSION_PARTICLES = 14;

// ── Balas ─────────────────────────────────────────────────────────────────────
export const BULLET_SPEED = 520;
export const BULLET_TTL = 1.1;
export const BULLET_RADIUS = 2;

// ── Asteroides (índice = tamaño 1, 2, 3) ─────────────────────────────────────
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const;
export const POINTS = [0, 100, 50, 20] as const;
export const ASTEROID_SPEED_JITTER = 15;
export const ASTEROID_ROT_SPEED = 1.2;
export const ASTEROID_MIN_VERTS = 8;
export const ASTEROID_MAX_VERTS = 13;
/** Partículas por explosión = tamaño × este valor. */
export const ASTEROID_PARTICLES_PER_SIZE = 5;

// ── Power-up ──────────────────────────────────────────────────────────────────
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const POWERUP_RADIUS = 12;
export const POWERUP_GUARANTEED_KILLS = 5;
export const TRIPLE_SPREAD = 0.18;

// ── Partículas ────────────────────────────────────────────────────────────────
export const PARTICLE_DEFAULT_COUNT = 8;

// ── Paleta neón del Vault ─────────────────────────────────────────────────────
export const COLORS = {
  background: "#000",
  ship: "#00f5ff", // cian
  asteroid: "#e6e9ff", // tinta
  bullet: "#f5ff00", // amarillo
  powerUp: "#ff006e", // magenta
  flame: "rgba(245, 255, 0, 0.85)", // amarillo
  /** Tinta en RGB, para el desvanecido de las partículas. */
  particleRgb: "230, 233, 255",
} as const;
