"use client";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  dispatchKey,
  REPEAT_DELAY,
  REPEAT_INTERVAL,
  type TouchButton,
  type TouchLayout,
} from "@/games/shared/touch";
type TouchPadProps = {
  layout: TouchLayout;
  /** `false` en pausa o con el modal de fin: suelta todo e ignora toques. */
  active: boolean;
};
/** Temporizadores de autorrepetición de un botón pulsado. */
type RepeatTimers = { delay?: number; interval?: number };
/** Direcciones de la cruz, siempre las cuatro (SPEC 11). */
const DIRECTIONS = ["up", "left", "right", "down"] as const;
type Direction = (typeof DIRECTIONS)[number];
/** Triángulos de `references/gamepad-assets/gamepad.html` (viewBox 24×24). */
const ARROW_PATHS: Record<Direction, string> = {
  up: "M12 4 L20 16 L4 16 Z",
  right: "M8 4 L20 12 L8 20 Z",
  down: "M4 8 L20 8 L12 20 Z",
  left: "M16 4 L16 20 L4 12 Z",
};
function Arrow({ dir }: { dir: Direction }) {
  return (
    <svg className="tp-arrow" viewBox="0 0 24 24" aria-hidden>
      <path d={ARROW_PATHS[dir]} fill="currentColor" />
    </svg>
  );
}
/** Letra por posición: la última acción es A y la anterior, B. */
function actionLetters(count: number): ("A" | "B")[] {
  return count === 2 ? ["B", "A"] : count === 1 ? ["A"] : [];
}
/**
 * Pad táctil (SPEC 10) con el aspecto del Gamepad MK-II (SPEC 11): cada botón emite
 * `keydown`/`keyup` sintéticos con su `code`. Multitáctil por `pointerId`; un botón
 * sigue pulsado mientras lo mantenga algún dedo.
 */
export function TouchPad({ layout, active }: TouchPadProps) {
  // pointerId → botón que mantiene ese dedo.
  const holdsRef = useRef(new Map<number, TouchButton>());
  // id de botón → temporizadores de repetición.
  const timersRef = useRef(new Map<string, RepeatTimers>());
  const [pressed, setPressed] = useState<ReadonlySet<string>>(() => new Set());
  const syncPressed = () =>
    setPressed(new Set([...holdsRef.current.values()].map((b) => b.id)));
  const isHeld = (id: string) =>
    [...holdsRef.current.values()].some((b) => b.id === id);
  const stopRepeat = (id: string) => {
    const timers = timersRef.current.get(id);
    if (!timers) return;
    window.clearTimeout(timers.delay);
    window.clearInterval(timers.interval);
    timersRef.current.delete(id);
  };
  const press = (button: TouchButton) => {
    dispatchKey("keydown", button.code);
    if (!button.repeat) return;
    const timers: RepeatTimers = {};
    timers.delay = window.setTimeout(() => {
      timers.interval = window.setInterval(
        () => dispatchKey("keydown", button.code, true),
        REPEAT_INTERVAL,
      );
    }, REPEAT_DELAY);
    timersRef.current.set(button.id, timers);
  };
  const release = (button: TouchButton) => {
    stopRepeat(button.id);
    dispatchKey("keyup", button.code);
  };
  /** Suelta todos los botones pulsados (pausa, fin, desmontaje). */
  const releaseAll = () => {
    const holds = holdsRef.current;
    if (holds.size === 0) return;
    const buttons = new Map([...holds.values()].map((b) => [b.id, b]));
    holds.clear();
    buttons.forEach(release);
    setPressed(new Set());
  };
  const onPointerDown = (
    e: ReactPointerEvent<HTMLButtonElement>,
    button: TouchButton,
  ) => {
    // Sin foco, sin ratón emulado y sin selección.
    e.preventDefault();
    if (!active) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const already = isHeld(button.id);
    holdsRef.current.set(e.pointerId, button);
    if (!already) press(button);
    syncPressed();
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const button = holdsRef.current.get(e.pointerId);
    if (!button) return; // `lostpointercapture` tras `pointerup`: ya se soltó.
    holdsRef.current.delete(e.pointerId);
    if (!isHeld(button.id)) release(button);
    syncPressed();
  };
  // Al pausar o abrirse el modal, ningún botón queda pegado.
  const onRelease = useEffectEvent(releaseAll);
  useEffect(() => {
    if (!active) onRelease();
  }, [active]);
  // Al desmontar se sueltan las teclas que sigan pulsadas.
  useEffect(() => () => onRelease(), []);
  /** Botón táctil con la lógica de SPEC 10; el aspecto lo dan `className` y `children`. */
  const renderButton = (
    button: TouchButton,
    className: string,
    data: Record<`data-${string}`, string>,
    children: ReactNode,
  ) => (
    <button
      key={button.id}
      type="button"
      tabIndex={-1}
      className={className}
      {...data}
      data-pressed={pressed.has(button.id) || undefined}
      aria-label={button.ariaLabel}
      onPointerDown={(e) => onPointerDown(e, button)}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
  const renderKey = (dir: Direction) => {
    const button = layout.dpad.find((b) => b.id === dir);
    // Dirección que el juego no usa: se ve atenuada y no recibe toques.
    if (!button) {
      return (
        <span
          key={dir}
          className="tp-key"
          data-dir={dir}
          data-unused=""
          aria-hidden
        >
          <Arrow dir={dir} />
        </span>
      );
    }
    return renderButton(
      button,
      "tp-key",
      { "data-dir": dir },
      <Arrow dir={dir} />,
    );
  };
  const letters = actionLetters(layout.actions.length);
  return (
    <div
      className="touch-pad"
      role="group"
      aria-label="Controles táctiles"
      data-active={active || undefined}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="tp-side tp-side-dpad">
        <div className="tp-dpad">
          {DIRECTIONS.map(renderKey)}
          <div className="tp-hub" aria-hidden>
            <span className="tp-gem" />
          </div>
        </div>
      </div>
      {layout.actions.length > 0 && (
        <div className="tp-side tp-side-actions">
          <div className="tp-actions">
            {layout.actions.map((button, i) =>
              renderButton(
                button,
                "tp-ab",
                { "data-letter": letters[i] },
                <>
                  <span className="tp-ring" aria-hidden />
                  <span className="tp-letter" aria-hidden>
                    {letters[i]}
                  </span>
                </>,
              ),
            )}
          </div>
          <p className="tp-legend" aria-hidden>
            {layout.actions.map((button, i) => (
              <span key={button.id} className="tp-legend-item">
                <span className="tp-legend-letter" data-letter={letters[i]}>
                  {letters[i]}
                </span>{" "}
                {button.label}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
