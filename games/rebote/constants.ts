/**
 * Constantes de REBOTE (SPEC 08), portadas de
 * `references/started-games/04-arkanoid/game.js` sin cambiar la mecánica.
 */
/** Espacio lógico del canvas (lo escala `GameCanvas` al CRT 4:3). */
export const W = 800;
export const H = 600;
/** Tope de `dt` en segundos: evita que la pelota atraviese algo en un frame lento. */
export const MAX_DT = 0.05;
/** Paleta: 81 × 14 (la del código del original, no los 162 px del sprite). */
export const PADDLE_SPEED = 400; // px/s
export const PADDLE_Y = 560;
export const PADDLE_W = 81;
export const PADDLE_H = 14;
/** Margen por debajo de la paleta en el que todavía cuenta el rebote. */
export const PADDLE_CATCH = 8;
export const BALL_SIZE = 16;
/** Velocidad base de la pelota (px/s), multiplicada por `speed` del nivel. */
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;
/** Rejilla de bloques: 10 × 6 de 64 × 24, centrada en horizontal. */
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2; // 80
export const BLOCKS_ORIGIN_Y = 80;
export const BLOCK_POINTS = 10;
export const START_LIVES = 3;
export const LAST_LEVEL = 5;
/** Paleta neón del Vault para el fondo y los textos de carga y error. */
export const COLORS = {
  bg: "#000",
  loading: "#00f5ff",
  error: "#ff006e",
} as const;
export const SPRITESHEET_SRC = "/games/rebote/spritesheet-breakout.png";
export const BOUNCE_SRC = "/games/rebote/sounds/ball-bounce.mp3";
export const BREAK_SRC = "/games/rebote/sounds/break-sound.mp3";
