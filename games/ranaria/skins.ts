import type { SkinId } from "../types";
// Las skins solo cambian la apariencia: el tablero, las celdas, las hitboxes y
// la mecánica siguen saliendo de `constants.ts`; ninguna medida de aquí entra en la lógica.
/** Paleta neón original de RANARIA: es la referencia de claves de todas las skins. */
const NEON = {
  bg: "#000000",
  road: "#07070d",
  roadLine: "#2a2a40",
  river: "#031a3a",
  riverWave: "#0b3a7a",
  safe: "#0a2a12",
  safeEdge: "#1f6b2e",
  goalWall: "#0d3d18",
  /** Rana dibujada en una boca ocupada. */
  goal: "#46ff8a",
  goalBg: "#03130a",
  goalBorder: "#f5ff00",
  frog: "#39ff14",
  /** Patas de la rana. */
  frogDark: "#1a8f0a",
  frogDead: "#ff006e",
  /** Contorno de la rana muerta (solo si `outlineWidth > 0`). */
  frogDeadStroke: "transparent",
  eyeWhite: "#e6e9ff",
  eyePupil: "#000000",
  /** Coches: una clave por `Entity.variant` (0, 1, 2). */
  car0: "#ff006e",
  car1: "#f5ff00",
  car2: "#00f5ff",
  wheel: "#e6e9ff",
  windshield: "#000000",
  truck: "#9aa0b8",
  truckCab: "#00f5ff",
  log: "#a0522d",
  logLine: "#5c2e14",
  turtle: "#2ecc71",
  turtleScale: "#0f5c2e",
  turtleSubmerged: "rgba(46, 204, 113, 0.25)",
  timeLabel: "#e6e9ff",
  timeTrack: "#1a1a2a",
  timeOk: "#39ff14",
  timeWarn: "#f5ff00",
  timeDanger: "#ff006e",
  hint: "#00f5ff",
  /** Contorno de las piezas (solo si `outlineWidth > 0`). */
  outline: "transparent",
};
export type Palette = { [K in keyof typeof NEON]: string };
export type Skin = {
  palette: Palette;
  /** `shadowBlur` por grupo de piezas (0 = sin brillo). */
  glow: {
    vehicle: number;
    frog: number;
    goal: number;
    time: number;
    hint: number;
  };
  /** Contorno de vehículos, troncos, tortugas, rana y barra de tiempo (0 = sin contorno). */
  outlineWidth: number;
  /** Trazo de las líneas de carril, borde de filas seguras y bocas. */
  lineWidth: number;
  /** Radio de las esquinas de coches y cabinas (0 = cuadradas). */
  cornerRadius: number;
  /** Mundo dibujado a media resolución y escalado sin suavizado (LCD). */
  pixelated: boolean;
  timeFont: string;
  hintFont: string;
};
const PIXEL_FONT = "'Press Start 2P', monospace";
// Tonos LCD de RETRO.
const LCD_0 = "#0f380f";
const LCD_1 = "#306230";
const LCD_2 = "#8bac0f";
const LCD_3 = "#9bbc0f";
// Tinta de PASTEL (contornos y texto).
const INK = "#4a3b5c";
export const SKINS: Record<SkinId, Skin> = {
  neon: {
    palette: NEON,
    glow: { vehicle: 10, frog: 12, goal: 6, time: 8, hint: 10 },
    outlineWidth: 0,
    lineWidth: 2,
    cornerRadius: 5,
    pixelated: false,
    timeFont: "bold 16px monospace",
    hintFont: "bold 20px monospace",
  },
  // LCD portátil de los 90: 4 verdes oliva, sin brillo, contorno oscuro y mundo pixelado.
  retro: {
    palette: {
      bg: LCD_0,
      road: LCD_0,
      roadLine: LCD_1,
      river: LCD_1,
      riverWave: LCD_0,
      safe: LCD_2,
      safeEdge: LCD_1,
      goalWall: LCD_1,
      goal: LCD_2,
      goalBg: LCD_0,
      goalBorder: LCD_3,
      frog: LCD_3,
      frogDark: LCD_2,
      frogDead: LCD_0,
      frogDeadStroke: LCD_3,
      eyeWhite: LCD_3,
      eyePupil: LCD_0,
      car0: LCD_3,
      car1: LCD_2,
      car2: LCD_3,
      wheel: LCD_2,
      windshield: LCD_0,
      truck: LCD_2,
      truckCab: LCD_3,
      log: LCD_2,
      logLine: LCD_1,
      turtle: LCD_2,
      turtleScale: LCD_0,
      turtleSubmerged: LCD_0,
      timeLabel: LCD_3,
      timeTrack: LCD_1,
      timeOk: LCD_3,
      timeWarn: LCD_2,
      timeDanger: LCD_2,
      hint: LCD_0,
      outline: LCD_0,
    },
    glow: { vehicle: 0, frog: 0, goal: 0, time: 0, hint: 0 },
    outlineWidth: 2,
    lineWidth: 2,
    cornerRadius: 0,
    pixelated: true,
    timeFont: `12px ${PIXEL_FONT}`,
    hintFont: `14px ${PIXEL_FONT}`,
  },
  // Arcade de los 80: blanco y grises, único acento verde plano en la rana.
  clasico: {
    palette: {
      bg: "#000000",
      road: "#000000",
      roadLine: "#5f5f5f",
      river: "#161616",
      riverWave: "#4a4a4a",
      safe: "#2a2a2a",
      safeEdge: "#808080",
      goalWall: "#3a3a3a",
      goal: "#00d84a",
      goalBg: "#000000",
      goalBorder: "#ffffff",
      frog: "#00d84a",
      frogDark: "#00d84a",
      frogDead: "#ffffff",
      frogDeadStroke: "transparent",
      eyeWhite: "#ffffff",
      eyePupil: "#000000",
      car0: "#ffffff",
      car1: "#c8c8c8",
      car2: "#a0a0a0",
      wheel: "#808080",
      windshield: "#000000",
      truck: "#a0a0a0",
      truckCab: "#ffffff",
      log: "#808080",
      logLine: "#3a3a3a",
      turtle: "#c8c8c8",
      turtleScale: "#3a3a3a",
      turtleSubmerged: "rgba(200, 200, 200, 0.3)",
      timeLabel: "#ffffff",
      timeTrack: "#2a2a2a",
      timeOk: "#ffffff",
      timeWarn: "#c8c8c8",
      timeDanger: "#8a8a8a",
      hint: "#ffffff",
      outline: "transparent",
    },
    glow: { vehicle: 0, frog: 0, goal: 0, time: 0, hint: 0 },
    outlineWidth: 0,
    lineWidth: 1,
    cornerRadius: 0,
    pixelated: false,
    timeFont: "bold 16px monospace",
    hintFont: "bold 20px monospace",
  },
  // Única skin de fondo claro: piezas pastel con contorno ciruela de 2 px.
  pastel: {
    palette: {
      bg: "#fff6e9",
      road: "#ebe3ee",
      roadLine: "#b8aec4",
      river: "#cfe8ff",
      riverWave: "#8fbde8",
      safe: "#fdf0a6",
      safeEdge: "#e2cf6a",
      goalWall: "#cdb4db",
      goal: "#9ee6cf",
      goalBg: "#fff6e9",
      goalBorder: INK,
      frog: "#9ee6cf",
      frogDark: INK,
      frogDead: "#ff8fab",
      frogDeadStroke: INK,
      eyeWhite: "#ffffff",
      eyePupil: INK,
      car0: "#ffb3c6",
      car1: "#cdb4db",
      car2: "#a2d2ff",
      wheel: INK,
      windshield: "#fff6e9",
      truck: "#fdf0a6",
      truckCab: "#ffc9a8",
      log: "#e6c4a3",
      logLine: "#a07c5f",
      turtle: "#ffd6a5",
      turtleScale: "#b07d62",
      turtleSubmerged: "rgba(74, 59, 92, 0.35)",
      timeLabel: INK,
      timeTrack: "#efe3d3",
      timeOk: "#9ee6cf",
      timeWarn: "#fdf0a6",
      timeDanger: "#ffb3c6",
      hint: INK,
      outline: INK,
    },
    glow: { vehicle: 0, frog: 0, goal: 0, time: 0, hint: 0 },
    outlineWidth: 2,
    lineWidth: 2,
    cornerRadius: 8,
    pixelated: false,
    timeFont: "bold 16px monospace",
    hintFont: "bold 20px monospace",
  },
};
