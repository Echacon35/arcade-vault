/**
 * Lógica pura de VIBORITA (SPEC 09): sin estado de módulo y sin acceso a
 * `window` ni al canvas. Todas las funciones devuelven valores nuevos.
 */
import {
  BASE_SPEED,
  COLS,
  FRUITS_PER_LEVEL,
  MAX_SPEED,
  ROWS,
  SPEED_PER_LEVEL,
  START_HEAD,
  START_LENGTH,
  TURN_QUEUE_MAX,
} from "./constants";
export type Dir = "up" | "down" | "left" | "right";
export type Cell = { col: number; row: number };
export type StepResult = "moved" | "ate" | "dead" | "full";
const DELTAS: Record<Dir, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
/** Serpiente inicial: cabeza en START_HEAD y el cuerpo hacia la izquierda. */
export function initialSnake(): Cell[] {
  return Array.from({ length: START_LENGTH }, (_, i) => ({
    col: START_HEAD.col - i,
    row: START_HEAD.row,
  }));
}
export function isOpposite(a: Dir, b: Dir): boolean {
  return OPPOSITE[a] === b;
}
/**
 * Añade `dir` a la cola si no está llena y no es igual ni opuesta a la última
 * dirección encolada (o a `current` si la cola está vacía). Si no, la devuelve tal cual.
 */
export function enqueueTurn(turns: Dir[], dir: Dir, current: Dir): Dir[] {
  if (turns.length >= TURN_QUEUE_MAX) return turns;
  const last = turns.length > 0 ? turns[turns.length - 1] : current;
  if (dir === last || isOpposite(dir, last)) return turns;
  return [...turns, dir];
}
const sameCell = (a: Cell, b: Cell) => a.col === b.col && a.row === b.row;
/**
 * Avanza una celda en `dir`. Si la cabeza nueva sale del tablero o choca con el
 * cuerpo, devuelve `dead` y la serpiente sin cambios. La celda de la cola que se
 * libera en este paso cuenta como libre, salvo que se coma la fruta.
 */
export function step(
  snake: Cell[],
  dir: Dir,
  fruit: Cell,
): { snake: Cell[]; result: StepResult } {
  const d = DELTAS[dir];
  const head = { col: snake[0].col + d.col, row: snake[0].row + d.row };
  if (head.col < 0 || head.col >= COLS || head.row < 0 || head.row >= ROWS) {
    return { snake, result: "dead" };
  }
  const eats = sameCell(head, fruit);
  const body = eats ? snake : snake.slice(0, -1);
  if (body.some((c) => sameCell(c, head))) {
    return { snake, result: "dead" };
  }
  const next = [head, ...body];
  if (!eats) return { snake: next, result: "moved" };
  return { snake: next, result: next.length >= COLS * ROWS ? "full" : "ate" };
}
/** Elige al azar una celda libre; `null` si la serpiente ocupa todo el tablero. */
export function spawnFruit(snake: Cell[], random: () => number): Cell | null {
  const taken = new Set(snake.map((c) => c.row * COLS + c.col));
  const free: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!taken.has(row * COLS + col)) free.push({ col, row });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(random() * free.length)];
}
/** Nivel según las frutas comidas: 1 + floor(frutas / 5). */
export function levelFor(fruits: number): number {
  return 1 + Math.floor(fruits / FRUITS_PER_LEVEL);
}
/** Pasos por segundo del nivel, con tope MAX_SPEED. */
export function speedFor(level: number): number {
  return Math.min(BASE_SPEED + (level - 1) * SPEED_PER_LEVEL, MAX_SPEED);
}
