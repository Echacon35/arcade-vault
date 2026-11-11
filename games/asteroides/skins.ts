import type { SkinId } from "../types";
// Las skins solo cambian la apariencia: ninguna medida de aquí entra en la física
// ni en las colisiones (las balas colisionan como punto, el radio es visual).
/** Paleta neón original de la SPEC 05: es la referencia de claves de todas las skins. */
const NEON = {
  background: "#000",
  ship: "#00f5ff", // cian
  shipFill: "transparent",
  asteroid: "#e6e9ff", // tinta
  asteroidFill: "transparent",
  bullet: "#f5ff00", // amarillo
  bulletStroke: "transparent",
  powerUp: "#ff006e", // magenta
  powerUpFill: "transparent",
  powerUpText: "#ff006e",
  flame: "rgba(245, 255, 0, 0.85)", // amarillo
  flameFill: "transparent",
  /** RGB (sin alfa) para el desvanecido de las partículas. */
  particleRgb: "230, 233, 255",
  /** Indicador `3x  N.Ns` del disparo triple. */
  hudText: "#ff006e",
};
export type Palette = { [K in keyof typeof NEON]: string };
export type Skin = {
  palette: Palette;
  /** `shadowBlur` de las piezas (0 = sin brillo). */
  glow: number;
  /** Trazo de nave, asteroides y llama. */
  lineWidth: number;
  powerUpLineWidth: number;
  particleLineWidth: number;
  bulletLineWidth: number;
  lineJoin: CanvasLineJoin;
  /** Radio visual de la bala. */
  bulletRadius: number;
  bulletShape: "round" | "square";
  /** >1: el mundo se dibuja a 1/pixelScale y se escala sin suavizado (pixelado). */
  pixelScale: number;
  labelFont: string;
  hudFont: string;
};
const PIXEL_FONT = "'Press Start 2P', monospace";
export const SKINS: Record<SkinId, Skin> = {
  neon: {
    palette: NEON,
    glow: 8,
    lineWidth: 1.5,
    powerUpLineWidth: 2,
    particleLineWidth: 1,
    bulletLineWidth: 0,
    lineJoin: "round",
    bulletRadius: 2,
    bulletShape: "round",
    pixelScale: 1,
    labelFont: "bold 12px monospace",
    hudFont: "15px monospace",
  },
  // LCD portátil de los 90: 4 verdes oliva, formas rellenas, mundo pixelado a 400×300.
  retro: {
    palette: {
      background: "#0f380f",
      ship: "#9bbc0f",
      shipFill: "#9bbc0f",
      asteroid: "#8bac0f",
      asteroidFill: "#306230",
      bullet: "#9bbc0f",
      bulletStroke: "transparent",
      powerUp: "#9bbc0f",
      powerUpFill: "#8bac0f",
      powerUpText: "#0f380f",
      flame: "#8bac0f",
      flameFill: "#8bac0f",
      particleRgb: "139, 172, 15",
      hudText: "#9bbc0f",
    },
    glow: 0,
    lineWidth: 2,
    powerUpLineWidth: 2,
    particleLineWidth: 2,
    bulletLineWidth: 0,
    lineJoin: "miter",
    bulletRadius: 2,
    bulletShape: "square",
    pixelScale: 2,
    labelFont: `8px ${PIXEL_FONT}`,
    hudFont: `10px ${PIXEL_FONT}`,
  },
  // Arcade vectorial de los 80: blanco y grises, un único acento ámbar plano.
  clasico: {
    palette: {
      background: "#000",
      ship: "#ffffff",
      shipFill: "transparent",
      asteroid: "#c8c8c8",
      asteroidFill: "transparent",
      bullet: "#ffffff",
      bulletStroke: "transparent",
      powerUp: "#ffb000",
      powerUpFill: "transparent",
      powerUpText: "#ffb000",
      flame: "#a0a0a0",
      flameFill: "transparent",
      particleRgb: "200, 200, 200",
      hudText: "#ffb000",
    },
    glow: 0,
    lineWidth: 1,
    powerUpLineWidth: 1.5,
    particleLineWidth: 1,
    bulletLineWidth: 0,
    lineJoin: "miter",
    bulletRadius: 2,
    bulletShape: "round",
    pixelScale: 1,
    labelFont: "bold 12px monospace",
    hudFont: "15px monospace",
  },
  // Única skin de fondo claro: piezas pastel con contorno ciruela de 2 px.
  pastel: {
    palette: {
      background: "#fff6e9",
      ship: "#4a3b5c",
      shipFill: "#9ee6cf",
      asteroid: "#4a3b5c",
      asteroidFill: "#cdb4db",
      bullet: "#a2d2ff",
      bulletStroke: "#4a3b5c",
      powerUp: "#4a3b5c",
      powerUpFill: "#ffb3c6",
      powerUpText: "#4a3b5c",
      flame: "#4a3b5c",
      flameFill: "#fdf0a6",
      particleRgb: "74, 59, 92",
      hudText: "#4a3b5c",
    },
    glow: 0,
    lineWidth: 2,
    powerUpLineWidth: 2,
    particleLineWidth: 1.5,
    bulletLineWidth: 1.5,
    lineJoin: "round",
    bulletRadius: 3.5,
    bulletShape: "round",
    pixelScale: 1,
    labelFont: "bold 12px monospace",
    hudFont: "bold 15px monospace",
  },
};
