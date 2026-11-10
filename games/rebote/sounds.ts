import { BOUNCE_SRC, BREAK_SRC } from "./constants";
export type Sounds = {
  /** Rebote de la pelota en paredes y paleta. */
  bounce(): void;
  /** Rotura de un bloque. */
  breakBlock(): void;
  /** Pausa todos los clones que estén sonando. */
  stopAll(): void;
  /** Para todo y deja la instancia inservible. */
  dispose(): void;
};
/**
 * Sonidos de REBOTE (E3). Todo el estado vive en el cierre: el módulo no crea
 * `Audio` al importarse. Cada reproducción es un `cloneNode()` para que dos
 * sonidos seguidos se solapen sin cortarse, como en el original.
 */
export function createSounds(): Sounds {
  const bounceBase = new Audio(BOUNCE_SRC);
  const breakBase = new Audio(BREAK_SRC);
  bounceBase.preload = "auto";
  breakBase.preload = "auto";
  const active = new Set<HTMLAudioElement>();
  let disposed = false;
  function play(base: HTMLAudioElement) {
    if (disposed) return;
    const clone = base.cloneNode() as HTMLAudioElement;
    active.add(clone);
    clone.addEventListener("ended", () => active.delete(clone), {
      once: true,
    });
    // Los navegadores rechazan `play()` antes del primer gesto del usuario.
    clone.play().catch(() => {
      active.delete(clone);
    });
  }
  function stopAll() {
    for (const clone of active) clone.pause();
    active.clear();
  }
  return {
    bounce: () => play(bounceBase),
    breakBlock: () => play(breakBase),
    stopAll,
    dispose() {
      disposed = true;
      stopAll();
    },
  };
}
