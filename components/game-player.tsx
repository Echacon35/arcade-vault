"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GameCanvas, type GameCanvasHandle } from "@/components/game-canvas";
import { useSession } from "@/components/session-provider";
import { GAME_ENGINES } from "@/games/registry";
import type { GameStats } from "@/games/types";
import type { Game } from "@/lib/games";
import { saveScore } from "@/lib/session";

const LIVES = 3;
const LEVEL_STEP = 2500;

export function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const { user } = useSession();
  // Motor real si el juego está registrado; si no, partida simulada.
  const engine = GAME_ENGINES[game.id];
  const canvasRef = useRef<GameCanvasHandle>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [engineLevel, setEngineLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  // FIN pulsado con motor real: la partida no se puede guardar.
  const [abandoned, setAbandoned] = useState(false);
  const [saved, setSaved] = useState(false);
  // `null` = el jugador no ha editado el nombre; así se usa el de la sesión
  // en cuanto se hidrata desde localStorage.
  const [nameInput, setNameInput] = useState<string | null>(null);
  const name = nameInput ?? user?.name ?? "INVITADO";

  // Con motor, el nivel lo dicta el juego. En la simulación sube cada 2.500 puntos.
  const level = engine ? engineLevel : 1 + Math.floor(score / LEVEL_STEP);

  // Partida simulada: solo para juegos sin motor.
  useEffect(() => {
    if (engine || over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [engine, over, paused]);

  // Pausa automática al ocultar la pestaña, para que el dt acumulado no mate al jugador.
  useEffect(() => {
    if (!engine) return;
    const onVisibility = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [engine]);

  const handleStats = (stats: GameStats) => {
    setScore(stats.score);
    setLives(stats.lives);
    setEngineLevel(stats.level);
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setAbandoned(false);
    setOver(true);
  };

  // P / Esc desde el motor. Con el modal abierto no hay nada que pausar.
  const togglePause = () => {
    if (!over) setPaused((p) => !p);
  };

  const finish = () => {
    if (engine) setAbandoned(true);
    setOver(true);
  };

  const restart = () => {
    setScore(0);
    setLives(LIVES);
    setEngineLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setAbandoned(false);
    canvasRef.current?.restart();
  };

  const save = () => {
    saveScore({ game: game.id, score, name });
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div className="flex flex-wrap gap-6">
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v text-ink">{name}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={finish}>
            FIN
          </button>
          <button className="btn ghost" onClick={() => router.push(`/juegos/${game.id}`)}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {engine ? (
            <GameCanvas
              ref={canvasRef}
              factory={engine}
              title={game.title}
              paused={paused}
              over={over}
              onStats={handleStats}
              onGameOver={handleGameOver}
              onPauseToggle={togglePause}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content z-[5] bg-black/60">
              <div>
                <div className="pixel neon-yellow text-[22px]">EN PAUSA</div>
                <div className="mono mt-2.5 text-[11px] tracking-[0.16em] text-ink-dim">
                  {engine ? "PULSA REANUDAR O P PARA CONTINUAR" : "PULSA REANUDAR PARA CONTINUAR"}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {abandoned ? (
              <div className="toast-saved abandoned">▸ PARTIDA ABANDONADA — NO SE GUARDA_</div>
            ) : !saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setNameInput(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={save}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/juegos")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
