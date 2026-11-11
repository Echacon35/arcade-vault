import type { TouchLayout } from "../shared/touch";

/** SPEC 10: ◀ ▶ mueven la pala; arrastrar el dedo por el canvas también (pointermove en el motor). */
export const REBOTE_TOUCH: TouchLayout = {
  dpad: [
    {
      id: "left",
      label: "◀",
      code: "ArrowLeft",
      ariaLabel: "Mover la pala a la izquierda",
    },
    {
      id: "right",
      label: "▶",
      code: "ArrowRight",
      ariaLabel: "Mover la pala a la derecha",
    },
  ],
  actions: [],
};
