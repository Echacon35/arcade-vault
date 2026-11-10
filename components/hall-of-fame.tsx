"use client";
import { useState } from "react";
import type { LeaderboardRow } from "@/lib/catalog";
import type { Game } from "@/lib/games";
export type HallEntry = { game: Game; rows: LeaderboardRow[] }; // rows: máx. 10, ordenadas por rank
/**
 * Pestañas, podio y tabla del Salón de la Fama (SPEC 06.5).
 *
 * Los datos llegan ya cargados desde `app/salon/page.tsx`; cambiar de pestaña
 * no hace peticiones. Pestaña inicial: la primera entrada (orden `sort_order`).
 */
export function HallOfFame({ entries }: { entries: HallEntry[] }) {
  const [tab, setTab] = useState(entries[0]?.game.id);
  const current = entries.find((e) => e.game.id === tab) ?? entries[0];
  const rows = current?.rows ?? [];
  return (
    <>
      <div className="hall-tabs">
        {entries.map(({ game }) => (
          <button
            key={game.id}
            className={"chip" + (current?.game.id === game.id ? " active" : "")}
            onClick={() => setTab(game.id)}
          >
            {game.title}
          </button>
        ))}
      </div>
      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{rows[1]?.name}</div>
          <div className="score">{rows[1]?.score.toLocaleString("es-ES")}</div>
          <div className="date">{rows[1]?.date}</div>
        </div>
        <div className="podium-slot gold">
          <div className="pixel text-[9px] tracking-[0.18em] text-gold">
            CAMPEÓN
          </div>
          <div className="rank-num mt-1 text-[36px]">01</div>
          <div className="name">{rows[0]?.name}</div>
          <div className="score text-[20px]">
            {rows[0]?.score.toLocaleString("es-ES")}
          </div>
          <div className="date">{rows[0]?.date}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{rows[2]?.name}</div>
          <div className="score">{rows[2]?.score.toLocaleString("es-ES")}</div>
          <div className="date">{rows[2]?.date}</div>
        </div>
      </div>
      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.map((r, i) => (
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
        ))}
      </div>
    </>
  );
}
