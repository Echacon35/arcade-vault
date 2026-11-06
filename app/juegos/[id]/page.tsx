import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GAMES, getGame } from "@/lib/games";
import { seededScores, seedFor } from "@/lib/scores";

export function generateStaticParams() {
  return GAMES.map((game) => ({ id: game.id }));
}

/**
 * Con `cacheComponents`, un id fuera de `generateStaticParams` se resuelve en
 * petición y el streaming ya empezó (Suspense del Nav). `notFound()` debe
 * ocurrir dentro de un `<Suspense>` para que el 404 temático se pinte en su lugar.
 */
export default function GameDetailPage({ params }: PageProps<"/juegos/[id]">) {
  return (
    <Suspense fallback={null}>
      <GameDetail params={params} />
    </Suspense>
  );
}

async function GameDetail({ params }: Pick<PageProps<"/juegos/[id]">, "params">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  // Mismas 12 filas que el Salón; se toman las 10 primeras para que coincidan.
  const rows = seededScores(seedFor(game.id)).slice(0, 10);
  const playColor = game.color === "magenta" ? "magenta" : game.color === "yellow" ? "yellow" : "";

  return (
    <div className="av-detail fade-in">
      <div className="detail-cover">
        <div className={"cover-bg " + game.cover}></div>
      </div>

      <div className="detail-info">
        <h2>{game.title}</h2>
        <div className="detail-tags">
          <span>{game.cat}</span>
          <span>1 JUGADOR</span>
        </div>
        <p>{game.long}</p>

        <div className="stat-strip">
          <div>
            <div className="l">Mejor puntuación</div>
            <div className="v">{game.best.toLocaleString("es-ES")}</div>
          </div>
          <div>
            <div className="l">Partidas</div>
            <div className="v">{game.plays}</div>
          </div>
          <div>
            <div className="l">Categoría</div>
            <div className="v">{game.cat}</div>
          </div>
        </div>

        <div className="detail-actions">
          <Link href={`/juegos/${game.id}/jugar`} className={"btn lg " + playColor}>
            JUGAR
          </Link>
          <Link href="/" className="btn lg ghost">
            VOLVER
          </Link>
        </div>

        <div className="leaderboard">
          <h3>TOP 10</h3>
          {rows.map((row) => (
            <div key={row.rank} className={"lb-row" + (row.rank <= 3 ? ` top${row.rank}` : "")}>
              <span className="rk">#{String(row.rank).padStart(2, "0")}</span>
              <span className="pl">{row.name}</span>
              <span className="sc">{row.score.toLocaleString("es-ES")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
