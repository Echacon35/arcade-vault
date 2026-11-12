import type { TouchLayout } from "../shared/touch";
/**
 * SPEC 10 en RANARIA: cruceta de 4 (un salto por toque; el motor ignora `repeat`,
 * así que no hay autorrepetición) y deslizar sobre el canvas, que salta en la
 * dirección del gesto. Sin acciones: el juego solo usa las flechas.
 */
export const RANARIA_TOUCH: TouchLayout = {
  dpad: [
    { id: "up", label: "▲", code: "ArrowUp", ariaLabel: "Saltar hacia arriba" },
    {
      id: "down",
      label: "▼",
      code: "ArrowDown",
      ariaLabel: "Saltar hacia abajo",
    },
    {
      id: "left",
      label: "◀",
      code: "ArrowLeft",
      ariaLabel: "Saltar a la izquierda",
    },
    {
      id: "right",
      label: "▶",
      code: "ArrowRight",
      ariaLabel: "Saltar a la derecha",
    },
  ],
  actions: [],
  swipe: true,
};
