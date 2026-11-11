import type { TouchLayout } from "../shared/touch";

/** SPEC 10: cruceta de 4 y, además, deslizar sobre el canvas gira la víbora. */
export const VIBORITA_TOUCH: TouchLayout = {
  dpad: [
    { id: "up", label: "▲", code: "ArrowUp", ariaLabel: "Girar hacia arriba" },
    {
      id: "down",
      label: "▼",
      code: "ArrowDown",
      ariaLabel: "Girar hacia abajo",
    },
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
  actions: [],
  swipe: true,
};
