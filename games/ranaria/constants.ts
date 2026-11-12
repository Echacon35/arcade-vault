import { SKINS } from "./skins";
/**
 * Constantes de RANARIA (spec `game-jam/frogger/01-frogger-core.md`). No hay
 * juego de referencia: estos valores son la única fuente de verdad de la mecánica.
 */
/** Espacio lógico del canvas (lo escala `GameCanvas` al CRT 4:3). */
export const W = 800;
export const H = 600;
/** Tope de `dt` en segundos. */
export const MAX_DT = 0.05;
/** Tablero: 16 × 14 celdas de 40 px. */
export const COLS = 16;
export const ROWS = 14;
export const CELL = 40; // px
export const BOARD_W = COLS * CELL; // 640
export const BOARD_H = ROWS * CELL; // 560
/** El tablero va centrado en horizontal y pegado abajo; la franja superior es la barra de tiempo. */
export const BOARD_X = (W - BOARD_W) / 2; // 80
export const BOARD_Y = H - BOARD_H; // 40
/** Zonas (índice de fila, 0 = arriba). */
export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_SAFE_MID = 7;
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;
/** Bocas destino: 5 bocas de 2 columnas; el resto de la fila 0 es muro. */
export const GOAL_COLS = [1, 4, 7, 10, 13] as const;
export const GOAL_WIDTH = 2;
/** La rana sale centrada en la fila de inicio. */
export const START_COL = COLS / 2 - 1; // 7
export const START_LIVES = 3;
/** Salto discreto de 1 celda con animación de 120 ms. */
export const JUMP_MS = 120;
/** Tras morir, la rana queda marcada este tiempo antes de volver a la salida. */
export const DEATH_MS = 600;
/** Puntuación. */
export const POINTS_STEP = 10; // por cada fila nueva alcanzada en el cruce
export const POINTS_GOAL = 50; // por ocupar una boca
export const POINTS_ROUND = 200; // por completar la ronda (5 bocas)
export const POINTS_TIME_PER_SEC = 10; // bonus: segundos restantes × 10 al ocupar una boca
/** Temporizador por cruce: max(TIMER_MIN, TIMER_BASE − (nivel − 1)) segundos. */
export const TIMER_BASE = 15;
export const TIMER_MIN = 8;
/** Las velocidades de la spec son px/frame a 60 fps; se pasan a celdas/s. */
export const FPS_REF = 60;
/** Cada nivel incrementa todas las velocidades un 15 %. */
export const SPEED_PER_LEVEL = 1.15;
/** Ciclo de inmersión de las tortugas, en segundos. */
export const TURTLE_UP_S = 3;
export const TURTLE_DOWN_S = 1.5;
/**
 * Margen lateral (en celdas) de la caja de la rana: los vehículos solo la
 * atropellan si la solapan de verdad, no por rozar el borde de la celda.
 */
export const FROG_HITBOX_INSET = 0.2;
/** Paleta neón del Vault para RANARIA (la de la spec): alias de la skin NEÓN de `skins.ts`. */
export const COLORS = SKINS.neon.palette;
