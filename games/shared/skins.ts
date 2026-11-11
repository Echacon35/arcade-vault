import type { SkinId } from "../types";

/** Skins obligatorias de la extensión E4, en el orden del selector. */
export const SKIN_IDS = [
  "neon",
  "retro",
  "clasico",
  "pastel",
] as const satisfies readonly SkinId[];

export const DEFAULT_SKIN: SkinId = "neon";

export const SKIN_LABELS: Record<SkinId, string> = {
  neon: "NEÓN",
  retro: "RETRO",
  clasico: "CLÁSICO",
  pastel: "PASTEL",
};

/** Muestra de color del selector: [fondo, color principal] de cada skin. */
export const SKIN_SWATCHES: Record<SkinId, readonly [string, string]> = {
  neon: ["#000000", "#00f5ff"],
  retro: ["#0f380f", "#9bbc0f"],
  clasico: ["#000000", "#ffffff"],
  pastel: ["#fff6e9", "#ffb3c6"],
};

export function isSkinId(value: unknown): value is SkinId {
  return (
    typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value)
  );
}
