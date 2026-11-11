import type { TouchLayout } from "../shared/touch";

/** SPEC 10: ◀ ▶ ▼ se repiten al mantenerlos, como el teclado del sistema. */
export const TETRA_TOUCH: TouchLayout = {
  dpad: [
    {
      id: "left",
      label: "◀",
      code: "ArrowLeft",
      repeat: true,
      ariaLabel: "Mover a la izquierda",
    },
    {
      id: "right",
      label: "▶",
      code: "ArrowRight",
      repeat: true,
      ariaLabel: "Mover a la derecha",
    },
    {
      id: "down",
      label: "▼",
      code: "ArrowDown",
      repeat: true,
      ariaLabel: "Bajar la pieza",
    },
  ],
  actions: [
    {
      id: "rotate",
      label: "ROTAR",
      code: "ArrowUp",
      ariaLabel: "Rotar la pieza",
    },
    {
      id: "drop",
      label: "CAÍDA",
      code: "Space",
      ariaLabel: "Dejar caer la pieza",
    },
  ],
};
