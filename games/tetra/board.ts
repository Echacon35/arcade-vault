/**
 * Lógica de tablero de TETRA (SPEC 07), portada de `game.js` con tipos.
 *
 * Funciones sin estado propio: reciben el tablero y la pieza del motor.
 * Las que modifican (`merge`, `clearLines`) actúan sobre el tablero que se
 * les pasa, igual que el original.
 */
import {
  COLS,
  DROP_BASE_MS,
  DROP_MIN_MS,
  DROP_STEP_MS,
  LINES_PER_LEVEL,
  LINE_SCORES,
  PIECES,
  PIECE_COUNT,
  ROTATION_KICKS,
  ROWS,
} from "./constants";
/** 0 = vacía, 1–8 = índice de pieza. */
export type Cell = number;
export type Shape = Cell[][];
export type Board = Cell[][];
export type Piece = { type: number; shape: Shape; x: number; y: number };
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<Cell>(COLS).fill(0));
}
/** Pieza al azar entre las 8, con la misma probabilidad, centrada arriba. */
export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * PIECE_COUNT) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
export function collide(board: Board, shape: Shape, ox: number, oy: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
/** Rotación horaria: transpuesta + inversión de filas. */
export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () =>
    new Array<Cell>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      result[c][rows - 1 - r] = shape[r][c];
    }
  }
  return result;
}
/** Rota la pieza probando los wall kicks; si ninguno cabe, no cambia. */
export function tryRotate(board: Board, piece: Piece) {
  const rotated = rotateCW(piece.shape);
  for (const kick of ROTATION_KICKS) {
    if (!collide(board, rotated, piece.x + kick, piece.y)) {
      piece.shape = rotated;
      piece.x += kick;
      return;
    }
  }
}
/** Fija la pieza en el tablero. */
export function merge(board: Board, piece: Piece) {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        board[piece.y + r][piece.x + c] = piece.shape[r][c];
      }
    }
  }
}
/** Elimina las filas completas (de abajo arriba) y devuelve cuántas. */
export function clearLines(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<Cell>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}
/** Fila donde aterrizaría la pieza (pieza fantasma). */
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}
/** Puntos por `cleared` líneas a la vez con el nivel actual (previo a subir). */
export function lineScore(cleared: number, level: number): number {
  return (LINE_SCORES[cleared] ?? 0) * level;
}
export function levelForLines(lines: number): number {
  return Math.floor(lines / LINES_PER_LEVEL) + 1;
}
export function dropIntervalForLevel(level: number): number {
  return Math.max(DROP_MIN_MS, DROP_BASE_MS - (level - 1) * DROP_STEP_MS);
}
