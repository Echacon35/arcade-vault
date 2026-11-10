"use client";
import { useMemo, useState } from "react";
import { useSession } from "@/components/session-provider";
import type { LeaderboardRow } from "@/lib/catalog";
import { GAMES, type Game } from "@/lib/games";
import { seededScores, seedFor } from "@/lib/scores";
export type HallEntry = { game: Game; rows: LeaderboardRow[] }; // rows: máx. 10, ordenadas por rank
// TODO(SPEC 06.5, paso 2): usar `entries` en lugar de GAMES/seededScores.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function HallOfFame({ entries }: { entries: HallEntry[] }) {
  const { user } = useSession();
  const [tab, setTab] = useState(GAMES[0].id);
  const rows = useMemo(() => seededScores(seedFor(tab), 12), [tab]);
  const game = GAMES.find((g) => g.id === tab) ?? GAMES[0];
  // Rango y puntaje de "tu mejor marca", calculados como en el template.
  const youRank = Math.floor(8 + (tab.length % 4));
  const youScore = rows[5].score - 2400;
  return (
    <>
      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>
      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{rows[1].name}</div>
          <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
          <div className="date">{rows[1].date}</div>
        </div>
        <div className="podium-slot gold">
          <div className="pixel text-[9px] tracking-[0.18em] text-gold">
            CAMPEÓN
          </div>
          <div className="rank-num mt-1 text-[36px]">01</div>
          <div className="name">{rows[0].name}</div>
          <div className="score text-[20px]">
            {rows[0].score.toLocaleString("es-ES")}
          </div>
          <div className="date">{rows[0].date}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{rows[2].name}</div>
          <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
          <div className="date">{rows[2].date}</div>
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
            key={r.name + i}
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
        {user && (
          <>
            <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
            <div
              className="tr you"
              style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
            >
              <div className="rk text-yellow">
                #{String(youRank).padStart(2, "0")}
              </div>
              <div className="pl text-yellow">{user.name}</div>
              <div className="sc text-yellow [text-shadow:0_0_6px_rgba(245,255,0,0.5)]">
                {(youScore || 9999).toLocaleString("es-ES")}
              </div>
              <div className="dt">11/05/2026</div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
