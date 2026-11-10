/** Coordenadas del spritesheet (`public/games/rebote/spritesheet-breakout.png`), portadas de `spritesheet.js`. */
export type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
export type Frame = { sx: number; sy: number; sw: number; sh: number };
/** Los 4 frames de explosión de una fila del spritesheet (32×16, desde `sx = 256`). */
function explosionRow(sy: number): Frame[] {
  return [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));
}
export const EXPLOSION_FRAMES: Readonly<Record<BlockColor, readonly Frame[]>> =
  {
    red: explosionRow(176),
    cyan: explosionRow(192),
    green: explosionRow(208),
    magenta: explosionRow(224),
    yellow: explosionRow(240),
    hotpink: explosionRow(256),
    // El gris usa los frames del rojo, como el original.
    gray: explosionRow(176),
  };
/** Duración total de la explosión, en ms. */
export const EXPLOSION_DURATION = 150;
export const SPRITES: {
  readonly paddle: Frame;
  readonly ball: Frame;
  readonly blocks: Readonly<Record<BlockColor, Frame>>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};
/** Dibuja un frame del spritesheet escalado a `w`×`h` en (`x`, `y`). */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  frame: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.drawImage(img, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}
