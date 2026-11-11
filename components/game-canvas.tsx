"use client";

import {
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  type Ref,
} from "react";
import { DEFAULT_SKIN } from "@/games/shared/skins";
import type {
  GameFactory,
  GameInstance,
  GameStats,
  SkinId,
} from "@/games/types";

/** Resolución lógica del canvas; el CSS lo escala al 100 % de `.crt-screen` (4:3). */
const CANVAS_W = 800;
const CANVAS_H = 600;

export type GameCanvasHandle = {
  restart(): void;
};

type GameCanvasProps = {
  factory: GameFactory;
  title: string;
  paused: boolean;
  over: boolean;
  /** E4: skin activa. Cambiarla no recrea el motor: se aplica con `setSkin`. */
  skin?: SkinId;
  onStats: (stats: GameStats) => void;
  onGameOver: (finalScore: number) => void;
  onPauseToggle: () => void;
  ref?: Ref<GameCanvasHandle>;
};

export function GameCanvas({
  factory,
  title,
  paused,
  over,
  skin = DEFAULT_SKIN,
  onStats,
  onGameOver,
  onPauseToggle,
  ref,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<GameInstance | null>(null);

  // Siempre llaman a la versión más reciente de las props sin recrear el motor.
  const handleStats = useEffectEvent(onStats);
  const handleGameOver = useEffectEvent(onGameOver);
  const handlePauseToggle = useEffectEvent(onPauseToggle);
  // Skin vigente al crear la instancia, sin que sea dependencia del efecto (no reinicia la partida).
  const currentSkin = useEffectEvent(() => skin);

  // Una instancia por montaje. En Strict Mode el doble montaje se limpia con destroy().
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const instance = factory(
      canvas,
      {
        onStats: (stats) => handleStats(stats),
        onGameOver: (finalScore) => handleGameOver(finalScore),
        onPauseToggle: () => handlePauseToggle(),
      },
      { skin: currentSkin() },
    );
    instanceRef.current = instance;
    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, [factory]);

  // El motor queda parado mientras haya pausa o el modal de fin esté abierto.
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;
    if (paused || over) instance.pause();
    else instance.resume();
  }, [paused, over]);

  // Cambio de skin en caliente: mismo estado, se redibuja aunque esté en pausa.
  useEffect(() => {
    instanceRef.current?.setSkin?.(skin);
  }, [skin]);

  useImperativeHandle(
    ref,
    () => ({ restart: () => instanceRef.current?.restart() }),
    [],
  );

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className="block h-full w-full"
      role="img"
      aria-label={`Partida de ${title}`}
    />
  );
}
