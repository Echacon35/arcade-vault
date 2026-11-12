/** Modelo de RANARIA: carriles, entidades y rana (en celdas, no en px). */
import {
  CELL,
  COLS,
  FPS_REF,
  SPEED_PER_LEVEL,
  TURTLE_DOWN_S,
  TURTLE_UP_S,
} from "./constants";
export type Direction = "up" | "down" | "left" | "right";
export type EntityType = "car" | "truck" | "log" | "turtle";
export interface Entity {
  /** Columna del borde izquierdo (puede ser fraccionaria y salir del tablero). */
  col: number;
  /** Longitud en celdas. */
  width: number;
  type: EntityType;
  /** Solo tortugas: bajo el agua no sirven de apoyo. */
  submerged?: boolean;
  /** Solo tortugas: segundos dentro del ciclo visible → sumergida. */
  phaseT?: number;
  /** Solo coches: índice de color. */
  variant?: number;
}
export interface Lane {
  row: number;
  /** Celdas por segundo (ya escaladas por nivel). */
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}
export interface Frog {
  /** Puede ser fraccionaria cuando un tronco o una tortuga la arrastra. */
  col: number;
  row: number;
  animating: boolean;
  /** ms transcurridos del salto en curso. */
  animT: number;
  targetCol: number;
  targetRow: number;
  facing: Direction;
}
/**
 * Plantilla de carril. `pxPerFrame` es la velocidad de la spec (px/frame a 60 fps),
 * `count` entidades de `width` celdas repartidas a intervalos iguales en el bucle
 * (`COLS + width` celdas) y `offset` desplaza el carril para que no arranquen alineados.
 */
type LaneTemplate = {
  row: number;
  pxPerFrame: number;
  dir: 1 | -1;
  type: EntityType;
  width: number;
  count: number;
  offset: number;
};
/** Carretera (filas 8–12): 1,5–4 px/frame, sentidos alternos, coches de 1 y camiones de 2–3 celdas. */
const ROAD: readonly LaneTemplate[] = [
  {
    row: 12,
    pxPerFrame: 1.5,
    dir: -1,
    type: "car",
    width: 1,
    count: 3,
    offset: 2,
  },
  {
    row: 11,
    pxPerFrame: 2.5,
    dir: 1,
    type: "car",
    width: 1,
    count: 3,
    offset: 0,
  },
  {
    row: 10,
    pxPerFrame: 2,
    dir: -1,
    type: "truck",
    width: 2,
    count: 3,
    offset: 4,
  },
  { row: 9, pxPerFrame: 4, dir: 1, type: "car", width: 1, count: 2, offset: 6 },
  {
    row: 8,
    pxPerFrame: 1.8,
    dir: -1,
    type: "truck",
    width: 3,
    count: 2,
    offset: 1,
  },
];
/** Río (filas 1–6): 1–3 px/frame, troncos de 2–4 celdas y grupos de 2–3 tortugas. */
const RIVER: readonly LaneTemplate[] = [
  {
    row: 6,
    pxPerFrame: 1.2,
    dir: -1,
    type: "turtle",
    width: 3,
    count: 3,
    offset: 0,
  },
  { row: 5, pxPerFrame: 1, dir: 1, type: "log", width: 3, count: 3, offset: 2 },
  { row: 4, pxPerFrame: 2, dir: 1, type: "log", width: 4, count: 3, offset: 5 },
  {
    row: 3,
    pxPerFrame: 1.5,
    dir: -1,
    type: "turtle",
    width: 2,
    count: 4,
    offset: 1,
  },
  {
    row: 2,
    pxPerFrame: 1.2,
    dir: 1,
    type: "log",
    width: 2,
    count: 4,
    offset: 3,
  },
  {
    row: 1,
    pxPerFrame: 1.6,
    dir: 1,
    type: "log",
    width: 3,
    count: 3,
    offset: 0,
  },
];
const TURTLE_CYCLE_S = TURTLE_UP_S + TURTLE_DOWN_S;
/** Multiplicador de velocidad: +15 % por nivel. */
export const levelSpeedFactor = (level: number) =>
  SPEED_PER_LEVEL ** (level - 1);
function buildLane(t: LaneTemplate, level: number): Lane {
  const loop = COLS + t.width;
  const spacing = loop / t.count;
  const entities: Entity[] = [];
  for (let i = 0; i < t.count; i++) {
    const col = ((i * spacing + t.offset) % loop) - t.width;
    const entity: Entity = { col, width: t.width, type: t.type };
    if (t.type === "car") entity.variant = (t.row + i) % 3;
    if (t.type === "turtle") {
      // Cada grupo con su propio reloj, escalonados para que no se hundan a la vez.
      entity.phaseT = (i * TURTLE_CYCLE_S) / t.count;
      entity.submerged = entity.phaseT >= TURTLE_UP_S;
    }
    entities.push(entity);
  }
  return {
    row: t.row,
    speed: ((t.pxPerFrame * FPS_REF) / CELL) * levelSpeedFactor(level),
    dir: t.dir,
    entities,
  };
}
/** Todos los carriles (carretera y río) para un nivel. */
export function buildLanes(level: number): Lane[] {
  return [...RIVER, ...ROAD].map((t) => buildLane(t, level));
}
/** Avanza las entidades de un carril `dt` segundos y las reintroduce por el lado opuesto al salir. */
export function moveLane(lane: Lane, dt: number) {
  const dx = lane.speed * lane.dir * dt;
  for (const e of lane.entities) {
    e.col += dx;
    if (lane.dir > 0 && e.col >= COLS) e.col -= COLS + e.width;
    else if (lane.dir < 0 && e.col + e.width <= 0) e.col += COLS + e.width;
    if (e.type === "turtle" && e.phaseT !== undefined) {
      e.phaseT = (e.phaseT + dt) % TURTLE_CYCLE_S;
      e.submerged = e.phaseT >= TURTLE_UP_S;
    }
  }
}
