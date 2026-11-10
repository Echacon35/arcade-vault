/**
 * Constantes de VIBORITA (SPEC 09). No hay juego de referencia: estos valores
 * son la única fuente de verdad de la mecánica.
 */
/** Espacio lógico del canvas (lo escala `GameCanvas` al CRT 4:3). */
export const W = 800;
export const H = 600;
/** Tope de `dt` en segundos. Con `MAX_SPEED = 20` da como máximo un paso por frame. */
export const MAX_DT = 0.05;
/** Tablero: 32 × 24 celdas de 25 px, que llenan exactamente 800 × 600. */
export const COLS = 32;
export const ROWS = 24;
export const CELL = 25;
/** Serpiente inicial: cabeza en (16, 12), cuerpo hacia la izquierda, mirando a la derecha. */
export const START_LENGTH = 3;
export const START_HEAD = { col: 16, row: 12 } as const;
export const START_DIR = "right" as const;
/** Velocidad en pasos por segundo: BASE + (nivel − 1) × PER_LEVEL, con tope MAX. */
export const BASE_SPEED = 8;
export const SPEED_PER_LEVEL = 1;
export const MAX_SPEED = 20;
/** Giros pendientes como máximo en la cola. */
export const TURN_QUEUE_MAX = 2;
/** Cada fruta vale FRUIT_POINTS × nivel; se sube de nivel cada FRUITS_PER_LEVEL frutas. */
export const FRUIT_POINTS = 10;
export const FRUITS_PER_LEVEL = 5;
export const START_LIVES = 1;
/** Paleta neón del Vault. */
export const COLORS = {
  bg: "#000",
  grid: "rgba(0, 245, 255, 0.08)",
  snake: "#00ff88",
  head: "#9dffd0",
  eye: "#000",
  fruit: "#ff006e",
  leaf: "#00ff88",
  hint: "#00f5ff",
} as const;
