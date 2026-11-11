"use client";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
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
/** Forma de la cruceta según los botones que tiene (ver `.tp-dpad[data-shape]`). */
function dpadShape(buttons: TouchButton[]) {
  const ids = new Set(buttons.map((b) => b.id));
  if (ids.has("up")) return "cross";
  if (ids.has("down")) return "row3";
  return "row2";
}
/**
 * Pad táctil (SPEC 10): cada botón emite `keydown`/`keyup` sintéticos con su `code`.
 * Multitáctil por `pointerId`; un botón sigue pulsado mientras lo mantenga algún dedo.
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
  const renderButton = (button: TouchButton) => (
    <button
      key={button.id}
      type="button"
      tabIndex={-1}
      className="tp-btn"
      data-id={button.id}
      data-pressed={pressed.has(button.id) || undefined}
      aria-label={button.ariaLabel}
      onPointerDown={(e) => onPointerDown(e, button)}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span aria-hidden>{button.label}</span>
    </button>
  );
  return (
    <div
      className="touch-pad"
      role="group"
      aria-label="Controles táctiles"
      data-active={active || undefined}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="tp-dpad" data-shape={dpadShape(layout.dpad)}>
        {layout.dpad.map(renderButton)}
      </div>
      {layout.actions.length > 0 && (
        <div className="tp-actions">{layout.actions.map(renderButton)}</div>
      )}
    </div>
  );
}
