/** Modelo de RANARIA: carriles, entidades y rana (en celdas, no en px). */
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
