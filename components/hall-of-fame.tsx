"use client";
import { useState } from "react";
import type { LeaderboardRow } from "@/lib/catalog";
import type { Game } from "@/lib/games";
export type HallEntry = { game: Game; rows: LeaderboardRow[] }; // rows: máx. 10, ordenadas por rank
/** Puesto del podio sin jugador. */
const EMPTY = "—";
/**
 * Pestañas, podio y tabla del Salón de la Fama (SPEC 06.5).
 *
 * Los datos llegan ya cargados desde `app/salon/page.tsx`; cambiar de pestaña
 * no hace peticiones. Pestaña inicial: la primera entrada (orden `sort_order`).
 */
export function HallOfFame({ entries }: { entries: HallEntry[] }) {
  const [tab, setTab] = useState(entries[0]?.game.id);
  const current = entries.find((e) => e.game.id === tab) ?? entries[0];
  // Sin juegos en la tabla `games`: solo el mensaje de vacío.
  if (!current) return <NoScores />;
  const rows = current.rows;
  const [gold, silver, bronze] = [rows[0], rows[1], rows[2]];
  return (
    <>
      <div className="hall-tabs">
        {entries.map(({ game }) => (
          <button
            key={game.id}
            className={"chip" + (current.game.id === game.id ? " active" : "")}
            onClick={() => setTab(game.id)}
          >
            {game.title}
          </button>
        ))}
      </div>
      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{silver?.name ?? EMPTY}</div>
          <div className="score">{formatScore(silver)}</div>
          <div className="date">{silver?.date ?? EMPTY}</div>
        </div>
        <div className="podium-slot gold">
          <div className="pixel text-[9px] tracking-[0.18em] text-gold">
            CAMPEÓN
          </div>
          <div className="rank-num mt-1 text-[36px]">01</div>
          <div className="name">{gold?.name ?? EMPTY}</div>
          <div className="score text-[20px]">{formatScore(gold)}</div>
          <div className="date">{gold?.date ?? EMPTY}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{bronze?.name ?? EMPTY}</div>
          <div className="score">{formatScore(bronze)}</div>
          <div className="date">{bronze?.date ?? EMPTY}</div>
        </div>
      </div>
      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.length === 0 ? (
          <NoScores />
        ) : (
          rows.map((r, i) => (
            <div
              key={r.rank}
              className={
                "tr" +
                (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
              }
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              <div className="dt">{r.date}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
function formatScore(row: LeaderboardRow | undefined) {
  return row ? row.score.toLocaleString("es-ES") : EMPTY;
}
/** Mismo texto y estilo que el TOP 10 vacío del detalle (SPEC 06). */
function NoScores() {
  return (
    <div className="p-8 text-center text-ink-faint">
      <div className="pixel text-[12px] text-cyan">
        ▸ SIN PUNTUACIONES — SÉ EL PRIMERO<span className="blink">_</span>
      </div>
    </div>
  );
}
