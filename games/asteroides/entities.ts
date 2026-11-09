import {
  ASTEROID_MAX_VERTS,
  ASTEROID_MIN_VERTS,
  ASTEROID_ROT_SPEED,
  ASTEROID_SPEED_JITTER,
  BULLET_RADIUS,
  BULLET_SPEED,
  BULLET_TTL,
  COLORS,
  H,
  POWERUP_RADIUS,
  POWERUP_TTL,
  RADII,
  SHIP_DRAG,
  SHIP_INVINCIBLE,
  SHIP_NOSE,
  SHIP_RADIUS,
  SHIP_ROT,
  SHIP_SHOOT_COOLDOWN,
  SHIP_THRUST,
  SPEEDS,
  TRIPLE_SPREAD,
  W,
} from "./constants";

// ── Utils ─────────────────────────────────────────────────────────────────────
export const wrap = (v: number, max: number) => ((v % max) + max) % max;
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const rand = (min: number, max: number) => min + Math.random() * (max - min);
export const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

export type Point = { x: number; y: number };
/** Códigos (`KeyboardEvent.code`) de las teclas mantenidas. */
export type KeyState = ReadonlySet<string>;
export type AsteroidSize = 1 | 2 | 3;

// ── Bullet ────────────────────────────────────────────────────────────────────
export class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = BULLET_TTL;
  radius = BULLET_RADIUS;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * BULLET_SPEED;
    this.vy = Math.sin(angle) * BULLET_SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = COLORS.bullet;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
export class Asteroid {
  x: number;
  y: number;
  size: AsteroidSize;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][];

  constructor(x: number, y: number, size: AsteroidSize = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-ASTEROID_SPEED_JITTER, ASTEROID_SPEED_JITTER);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-ASTEROID_ROT_SPEED, ASTEROID_ROT_SPEED);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(ASTEROID_MIN_VERTS, ASTEROID_MAX_VERTS);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    const next = (this.size - 1) as AsteroidSize;
    return [new Asteroid(this.x, this.y, next), new Asteroid(this.x, this.y, next)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = COLORS.asteroid;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
export class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = POWERUP_RADIUS;
  ttl = POWERUP_TTL;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = COLORS.powerUp;
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.fillStyle = COLORS.powerUp;
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
export class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = SHIP_RADIUS;
  thrusting = false;
  invincible = SHIP_INVINCIBLE;
  shootCooldown = 0;
  dead = false;
  tripleShot = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = SHIP_RADIUS;
    this.thrusting = false;
    this.invincible = SHIP_INVINCIBLE;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, keys: KeyState) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    if (keys.has("ArrowLeft")) this.angle -= SHIP_ROT * dt;
    if (keys.has("ArrowRight")) this.angle += SHIP_ROT * dt;

    this.thrusting = keys.has("ArrowUp");
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * SHIP_THRUST * dt;
      this.vy += Math.sin(this.angle) * SHIP_THRUST * dt;
    }

    this.vx *= SHIP_DRAG;
    this.vy *= SHIP_DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = SHIP_SHOOT_COOLDOWN;
    const ox = this.x + Math.cos(this.angle) * SHIP_NOSE;
    const oy = this.y + Math.sin(this.angle) * SHIP_NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = COLORS.ship;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = COLORS.flame;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Particle (explosión) ──────────────────────────────────────────────────────
export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${COLORS.particleRgb}, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}
