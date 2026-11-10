/**
 * Constantes de TETRA (SPEC 07), portadas de
 * `references/started-games/03-tetris/game.js` sin cambiar la mecánica.
 */
/** Espacio lógico del canvas (lo escala `GameCanvas` al CRT 4:3). */
export const W = 800;
export const H = 600;
/** Tablero: 10 × 20 celdas de 30 px → 300 × 600, centrado en el canvas. */
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const BOARD_X = (W - COLS * BLOCK) / 2; // 250
export const BOARD_Y = 0;
/** Panel derecho: NEXT (vista previa 4 × 4 celdas de 30 px) y LÍNEAS. */
export const PANEL_X = 590;
export const NEXT_CELLS = 4;
export const NEXT_BLOCK = 30;
/**
 * Las 8 piezas del original, indexadas 1–8 (el 0 es "vacía").
 * La 8 es la "tuerca", un anillo de 3 × 3 propio de este código.
 */
export const PIECES: readonly (readonly (readonly number[])[])[] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];
export const PIECE_COUNT = 8;
/** Puntos por 0–4 líneas a la vez, multiplicados por el nivel previo a la subida. */
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;
export const HARD_DROP_POINTS = 2; // por celda recorrida
export const SOFT_DROP_POINTS = 1; // por fila bajada
/** Desplazamientos horizontales que se prueban al rotar (wall kicks). */
export const ROTATION_KICKS = [0, -1, 1, -2, 2] as const;
/** Nivel = floor(líneas / 10) + 1; caída = max(100, 1000 − (nivel − 1) × 90) ms. */
export const LINES_PER_LEVEL = 10;
export const DROP_BASE_MS = 1000;
export const DROP_STEP_MS = 90;
export const DROP_MIN_MS = 100;
export const GHOST_ALPHA = 0.2;
/** Paleta neón del Vault. `pieces` va indexada igual que `PIECES` (1–8). */
export const COLORS = {
  background: "#000",
  grid: "#4a4f70", // ink-faint: cuadrícula y borde del tablero
  label: "#8a8fb5", // ink-dim
  value: "#e6e9ff", // ink
  highlight: "rgba(255,255,255,0.12)",
  pieces: [
    "",
    "#00f5ff", // I — cian
    "#f5ff00", // O — amarillo
    "#ff006e", // T — magenta
    "#00ff88", // S — verde
    "#d97a3a", // Z — bronce
    "#c7d0e0", // J — plata
    "#ffcf3a", // L — oro
    "#e6e9ff", // N (tuerca) — tinta
  ],
} as const;
