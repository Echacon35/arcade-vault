import type { TouchLayout } from "../shared/touch";
/** SPEC 10: girar a la izquierda; propulsar y disparar a la derecha. */
export const ASTEROIDES_TOUCH: TouchLayout = {
  dpad: [
    {
      id: "left",
      label: "◀",
      code: "ArrowLeft",
      ariaLabel: "Girar a la izquierda",
    },
    {
      id: "right",
      label: "▶",
      code: "ArrowRight",
      ariaLabel: "Girar a la derecha",
    },
  ],
  actions: [
    {
      id: "thrust",
      label: "PROPULSAR",
      code: "ArrowUp",
      ariaLabel: "Propulsar",
    },
    { id: "fire", label: "FUEGO", code: "Space", ariaLabel: "Disparar" },
  ],
};
