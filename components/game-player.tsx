"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { saveScoreAction } from "@/app/juegos/[id]/jugar/actions";
import { GameCanvas, type GameCanvasHandle } from "@/components/game-canvas";
import { useSession } from "@/components/session-provider";
import { TouchPad } from "@/components/touch-pad";
import { GAME_ENGINES, GAME_SKINS, GAME_TOUCH } from "@/games/registry";
import { DEFAULT_SKIN, SKIN_LABELS, SKIN_SWATCHES } from "@/games/shared/skins";
import type { GameStats, SkinId } from "@/games/types";
import type { Game } from "@/lib/games";
import { saveScore } from "@/lib/session";
const LIVES = 3;
const LEVEL_STEP = 2500;
type SaveState = "idle" | "saving" | "saved" | "error";
/** SPEC 10: puntero grueso (móvil/tablet). En el servidor y al hidratar vale `false`. */
const COARSE_QUERY = "(pointer: coarse)";
function subscribeCoarse(onChange: () => void) {
  const mql = window.matchMedia(COARSE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
function useCoarsePointer() {
  return useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia(COARSE_QUERY).matches,
    () => false,
  );
}
export function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  const { user } = useSession();
  // Motor real si el juego está registrado; si no, partida simulada.
  const engine = GAME_ENGINES[game.id];
  // E4: skins del motor; sin entrada en GAME_SKINS no hay selector.
  const skins = engine ? GAME_SKINS[game.id] : undefined;
  const [skin, setSkin] = useState<SkinId>(DEFAULT_SKIN);
  // SPEC 10: pad táctil solo con motor, distribución y puntero grueso.
  const coarse = useCoarsePointer();
  const touchLayout = engine && coarse ? GAME_TOUCH[game.id] : undefined;
  const canvasRef = useRef<GameCanvasHandle>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [engineLevel, setEngineLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  // FIN pulsado con motor real: la partida no se puede guardar.
  const [abandoned, setAbandoned] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  // `null` = el jugador no ha editado el nombre; así se usa el de la sesión
  // en cuanto se hidrata desde localStorage.
  const [nameInput, setNameInput] = useState<string | null>(null);
  const name = nameInput ?? user?.name ?? "INVITADO";
  // Con motor, el nivel lo dicta el juego. En la simulación sube cada 2.500 puntos.
  const level = engine ? engineLevel : 1 + Math.floor(score / LEVEL_STEP);
  // Partida simulada: solo para juegos sin motor.
  useEffect(() => {
    if (engine || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
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
    setSaveState("idle");
    setAbandoned(false);
    canvasRef.current?.restart();
  };
  const save = async () => {
    // Juegos simulados: siguen en localStorage (la FK de `scores` los rechazaría).
    if (!engine) {
      saveScore({ game: game.id, score, name });
      setSaveState("saved");
      return;
    }
    // Juegos con motor: Supabase vía Server Action.
    setSaveState("saving");
    try {
      const result = await saveScoreAction({ gameId: game.id, name, score });
      setSaveState(result.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  };
  const saving = saveState === "saving";
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
        {skins && (
          <div
            role="group"
            aria-label="Skin del juego"
            className="flex items-stretch border border-line bg-bg"
          >
            <span className="flex items-center px-3 font-mono text-[10px] tracking-[0.14em] text-ink-faint">
              SKIN
            </span>
            {skins.map((id) => {
              const active = id === skin;
              const [bg, fg] = SKIN_SWATCHES[id];
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  // Sin foco al hacer clic: flechas y espacio siguen yendo al juego.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSkin(id)}
                  className={`flex cursor-pointer items-center gap-2 border-l border-line px-3 py-2.5 font-pixel text-[9px] tracking-[0.12em] transition-colors ${
                    active
                      ? "bg-cyan/10 text-cyan [text-shadow:0_0_6px_rgba(0,245,255,0.5)]"
                      : "bg-transparent text-ink-dim hover:text-ink"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`size-2.5 shrink-0 border ${active ? "border-cyan" : "border-ink-faint"}`}
                    style={{
                      background: `linear-gradient(135deg, ${bg} 50%, ${fg} 50%)`,
                    }}
                  />
                  {SKIN_LABELS[id]}
                </button>
              );
            })}
          </div>
        )}
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={finish}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/juegos/${game.id}`)}
          >
            SALIR
          </button>
        </div>
      </div>
      <div className="player-stage" data-touch={touchLayout ? "" : undefined}>
        <div className="crt">
          <div className="crt-screen">
            {engine ? (
              <GameCanvas
                ref={canvasRef}
                factory={engine}
                title={game.title}
                paused={paused}
                over={over}
                skin={skin}
                swipe={touchLayout?.swipe}
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
              // PASTEL es la única skin de fondo claro: el velo se oscurece para que el texto se lea.
              <div
                className={`crt-content z-[5] ${skin === "pastel" ? "bg-black/80" : "bg-black/60"}`}
              >
                <div>
                  <div className="pixel neon-yellow text-[22px]">EN PAUSA</div>
                  <div className="mono mt-2.5 text-[11px] tracking-[0.16em] text-ink-dim">
                    {engine
                      ? "PULSA REANUDAR O P PARA CONTINUAR"
                      : "PULSA REANUDAR PARA CONTINUAR"}
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
        {touchLayout && (
          // Ocultar la pestaña ya pausa, así que `active` también cubre `visibilitychange`.
          <TouchPad layout={touchLayout} active={!paused && !over} />
        )}
      </div>
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {abandoned ? (
              <div className="toast-saved abandoned">
                ▸ PARTIDA ABANDONADA — NO SE GUARDA_
              </div>
            ) : saveState !== "saved" ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    disabled={saving}
                    onChange={(e) =>
                      setNameInput(e.target.value.toUpperCase().slice(0, 10))
                    }
                    placeholder="TUS INICIALES"
                  />
                  <button
                    className="btn yellow"
                    onClick={save}
                    disabled={saving}
                    aria-busy={saving}
                  >
                    {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {saveState === "error" && (
                  <div role="alert" className="toast-saved abandoned">
                    ▸ NO SE PUDO GUARDAR — REINTENTA_
                  </div>
                )}
              </>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/juegos")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
