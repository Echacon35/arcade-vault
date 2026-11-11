/** Controles táctiles (SPEC 10): el pad emite teclas sintéticas con el mismo `code` que el teclado. */
export type TouchButton = {
  /** Único dentro de la distribución, p. ej. "left", "fire". */
  id: string;
  /** Texto o glifo del botón: "◀", "FUEGO". */
  label: string;
  /** `KeyboardEvent.code` que emite: "ArrowLeft", "Space". */
  code: string;
  /** Autorrepetición al mantener (solo TETRA ◀ ▶ ▼). */
  repeat?: boolean;
  /** "Girar a la izquierda", "Disparar". */
  ariaLabel: string;
};
export type TouchLayout = {
  /** Bloque izquierdo. */
  dpad: TouchButton[];
  /** Bloque derecho (puede estar vacío). */
  actions: TouchButton[];
  /** Deslizar sobre el canvas emite flechas (VIBORITA). */
  swipe?: boolean;
};
/** Espera antes de la primera repetición, en ms. */
export const REPEAT_DELAY = 170;
/** Intervalo entre repeticiones, en ms. */
export const REPEAT_INTERVAL = 50;
/** Recorrido mínimo del dedo para un giro, en px CSS. */
export const SWIPE_THRESHOLD = 30;
/** `key` equivalente a un `code`: `Space` → " ", `KeyX` → "x", las flechas y el resto se quedan igual. */
function keyForCode(code: string) {
  if (code === "Space") return " ";
  if (code.startsWith("Key")) return code.slice(3).toLowerCase();
  return code;
}
/** Despacha una tecla sintética en `window`; los motores la leen igual que una real. */
export function dispatchKey(
  type: "keydown" | "keyup",
  code: string,
  repeat = false,
): void {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key: keyForCode(code),
      repeat,
      bubbles: true,
      cancelable: true,
    }),
  );
}
