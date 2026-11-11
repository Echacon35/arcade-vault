import type { SkinId } from "../types";
// Las skins solo cambian la apariencia: el tablero, las celdas y la mecánica
// siguen saliendo de `constants.ts`; ninguna medida de aquí entra en la lógica.
/** Paleta neón original de la SPEC 09: es la referencia de claves de todas las skins. */
const NEON = {
  bg: "#000",
  grid: "rgba(0, 245, 255, 0.08)",
  snake: "#00ff88",
  head: "#9dffd0",
  /** Contorno de los segmentos (solo si `outlineWidth > 0`). */
  snakeStroke: "transparent",
  eye: "#000",
  fruit: "#ff006e",
  /** Contorno de la fruta y de la hoja (solo si `outlineWidth > 0`). */
  fruitStroke: "transparent",
  stem: "#00ff88",
  leaf: "#00ff88",
  hint: "#00f5ff",
};
export type Palette = { [K in keyof typeof NEON]: string };
export type Skin = {
  palette: Palette;
  /** `shadowBlur` por pieza (0 = sin brillo). */
  glow: { snake: number; fruit: number; leaf: number; hint: number };
  gridLineWidth: number;
  /** Contorno de segmentos, fruta y hoja (0 = sin contorno). */
  outlineWidth: number;
  /** Radio de las esquinas de los segmentos (0 = cuadrados). */
  cornerRadius: number;
  stemWidth: number;
  /** Fruta en pixel-art, ojos cuadrados y sin suavizado. */
  pixelated: boolean;
  hintFont: string;
};
const PIXEL_FONT = "'Press Start 2P', monospace";
export const SKINS: Record<SkinId, Skin> = {
  neon: {
    palette: NEON,
    glow: { snake: 10, fruit: 14, leaf: 6, hint: 8 },
    gridLineWidth: 1,
    outlineWidth: 0,
    cornerRadius: 0,
    stemWidth: 2,
    pixelated: false,
    hintFont: "20px monospace",
  },
  // LCD portátil de los 90: 4 verdes oliva, sin brillo, fruta en pixel-art.
  retro: {
    palette: {
      bg: "#0f380f",
      grid: "rgba(48, 98, 48, 0.55)",
      snake: "#8bac0f",
      head: "#9bbc0f",
      snakeStroke: "transparent",
      eye: "#0f380f",
      fruit: "#9bbc0f",
      fruitStroke: "transparent",
      stem: "#8bac0f",
      leaf: "#8bac0f",
      hint: "#9bbc0f",
    },
    glow: { snake: 0, fruit: 0, leaf: 0, hint: 0 },
    gridLineWidth: 1,
    outlineWidth: 0,
    cornerRadius: 0,
    stemWidth: 3,
    pixelated: true,
    hintFont: `14px ${PIXEL_FONT}`,
  },
  // Arcade de los 80: blanco y grises, único acento rojo plano en la fruta.
  clasico: {
    palette: {
      bg: "#000",
      grid: "rgba(255, 255, 255, 0.06)",
      snake: "#c8c8c8",
      head: "#ffffff",
      snakeStroke: "transparent",
      eye: "#000",
      fruit: "#ff3b30",
      fruitStroke: "transparent",
      stem: "#a0a0a0",
      leaf: "#a0a0a0",
      hint: "#ffffff",
    },
    glow: { snake: 0, fruit: 0, leaf: 0, hint: 0 },
    gridLineWidth: 1,
    outlineWidth: 0,
    cornerRadius: 0,
    stemWidth: 1.5,
    pixelated: false,
    hintFont: "20px monospace",
  },
  // Única skin de fondo claro: piezas pastel con contorno ciruela de 2 px.
  pastel: {
    palette: {
      bg: "#fff6e9",
      grid: "rgba(74, 59, 92, 0.08)",
      snake: "#9ee6cf",
      head: "#a2d2ff",
      snakeStroke: "#4a3b5c",
      eye: "#4a3b5c",
      fruit: "#ffb3c6",
      fruitStroke: "#4a3b5c",
      stem: "#4a3b5c",
      leaf: "#9ee6cf",
      hint: "#4a3b5c",
    },
    glow: { snake: 0, fruit: 0, leaf: 0, hint: 0 },
    gridLineWidth: 1,
    outlineWidth: 2,
    cornerRadius: 5,
    stemWidth: 2,
    pixelated: false,
    hintFont: "bold 20px monospace",
  },
};
