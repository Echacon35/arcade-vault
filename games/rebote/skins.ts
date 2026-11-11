import type { SkinId } from "../types";
import type { BlockColor } from "./sprites";
// Las skins solo cambian la apariencia: las medidas de aquí (radios, huecos,
// trazos) son visuales; paleta, pelota y bloques colisionan con sus Rect de siempre.
/**
 * Paleta neón original de la SPEC 08 (fondo `#000`, carga cian, error magenta).
 * NEÓN dibuja las piezas con los sprites del spritesheet; las claves de piezas
 * son la referencia vectorial que usan RETRO, CLÁSICO y PASTEL.
 */
const NEON = {
  background: "#000",
  loading: "#00f5ff", // cian
  error: "#ff006e", // magenta
  /** Brillo de paleta y pelota (`shadowColor`). */
  glow: "#00f5ff",
  paddle: "#d8dce6",
  /** Topes de los extremos de la paleta (`transparent` = sin topes). */
  paddleAccent: "#ff2a4d",
  ball: "#d8dce6",
  /** Contorno de paleta, pelota y bloques (`transparent` = sin contorno). */
  outline: "transparent",
  /** Filo claro superior de los bloques (`transparent` = sin filo). */
  blockHighlight: "transparent",
  blockGray: "#7a7f8c",
  blockRed: "#d9304a",
  blockYellow: "#ffe600",
  blockCyan: "#00f5ff",
  blockMagenta: "#ff006e",
  blockHotpink: "#ff5fa2",
  blockGreen: "#00ff88",
};
export type Palette = { [K in keyof typeof NEON]: string };
export type Skin = {
  palette: Palette;
  /** `true`: paleta, pelota, bloques y explosiones salen del spritesheet (solo NEÓN). */
  sprites: boolean;
  /** `shadowBlur` de paleta y pelota (0 = sin brillo). */
  glow: number;
  /** Grosor del contorno (`palette.outline`). */
  lineWidth: number;
  /** Radio de las esquinas de bloques y paleta. */
  radius: number;
  /** Hueco visual entre bloques contiguos (px por lado). */
  blockInset: number;
  ballShape: "round" | "square";
  /** >1: el mundo se dibuja a 1/pixelScale y se escala sin suavizado (pixelado). */
  pixelScale: number;
  /** Fuente de los mensajes de carga y error. */
  messageFont: string;
};
const PIXEL_FONT = "'Press Start 2P', monospace";
export const SKINS: Record<SkinId, Skin> = {
  // Spritesheet original sin tocar + brillo cian en paleta y pelota.
  neon: {
    palette: NEON,
    sprites: true,
    glow: 10,
    lineWidth: 0,
    radius: 0,
    blockInset: 0,
    ballShape: "round",
    pixelScale: 1,
    messageFont: "bold 28px monospace",
  },
  // LCD portátil de los 90: 4 verdes oliva, formas rellenas, mundo pixelado a 400×300.
  retro: {
    palette: {
      background: "#0f380f",
      loading: "#9bbc0f",
      error: "#9bbc0f",
      glow: "transparent",
      paddle: "#9bbc0f",
      paddleAccent: "#306230",
      ball: "#9bbc0f",
      outline: "transparent",
      blockHighlight: "#9bbc0f",
      blockGray: "#306230",
      blockRed: "#9bbc0f",
      blockYellow: "#8bac0f",
      blockCyan: "#306230",
      blockMagenta: "#8bac0f",
      blockHotpink: "#9bbc0f",
      blockGreen: "#306230",
    },
    sprites: false,
    glow: 0,
    lineWidth: 0,
    radius: 0,
    blockInset: 2,
    ballShape: "round",
    pixelScale: 2,
    messageFont: `16px ${PIXEL_FONT}`,
  },
  // Arcade de los 80: escala de grises plana, pelota cuadrada, un único acento ámbar (paleta).
  clasico: {
    palette: {
      background: "#000",
      loading: "#ffffff",
      error: "#ffb000",
      glow: "transparent",
      paddle: "#ffb000",
      paddleAccent: "transparent",
      ball: "#ffffff",
      outline: "transparent",
      blockHighlight: "transparent",
      blockGray: "#8c8c8c",
      blockRed: "#ffffff",
      blockYellow: "#dcdcdc",
      blockCyan: "#b9b9b9",
      blockMagenta: "#969696",
      blockHotpink: "#787878",
      blockGreen: "#5f5f5f",
    },
    sprites: false,
    glow: 0,
    lineWidth: 1,
    radius: 0,
    blockInset: 2,
    ballShape: "square",
    pixelScale: 1,
    messageFont: "bold 28px monospace",
  },
  // Única skin de fondo claro: piezas pastel redondeadas con contorno ciruela de 2 px.
  pastel: {
    palette: {
      background: "#fff6e9",
      loading: "#4a3b5c",
      error: "#a3123f",
      glow: "transparent",
      paddle: "#a2d2ff",
      paddleAccent: "transparent",
      ball: "#ffb3c6",
      outline: "#4a3b5c",
      blockHighlight: "transparent",
      blockGray: "#ddd5e3",
      blockRed: "#ffb3c6",
      blockYellow: "#fdf0a6",
      blockCyan: "#a2d2ff",
      blockMagenta: "#cdb4db",
      blockHotpink: "#ffc9a8",
      blockGreen: "#9ee6cf",
    },
    sprites: false,
    glow: 0,
    lineWidth: 2,
    radius: 6,
    blockInset: 2,
    ballShape: "round",
    pixelScale: 1,
    messageFont: "bold 28px monospace",
  },
};
/** Clave de la paleta para cada color de bloque de los niveles. */
export const BLOCK_PALETTE_KEY: Readonly<Record<BlockColor, keyof Palette>> = {
  gray: "blockGray",
  red: "blockRed",
  yellow: "blockYellow",
  cyan: "blockCyan",
  magenta: "blockMagenta",
  hotpink: "blockHotpink",
  green: "blockGreen",
};
