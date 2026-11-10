import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SignalLost } from "@/components/signal-lost";
import { getCatalog, getCatalogGame, getLeaderboard } from "@/lib/catalog";

/**
 * Ids de la tabla `games`. Con `cacheComponents` no se puede devolver un array
 * vacío, así que si Supabase falla en build se aborta con un error claro.
 */
export async function generateStaticParams() {
  const result = await getCatalog();
  if (!result.ok) {
    throw new Error(
      "No se pudo leer la tabla `games` de Supabase para generateStaticParams.",
    );
  }
  return result.data.map((game) => ({ id: game.id }));
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

async function GameDetail({
  params,
}: Pick<PageProps<"/juegos/[id]">, "params">) {
  const { id } = await params;
  const [gameResult, leaderboard] = await Promise.all([
    getCatalogGame(id),
    getLeaderboard(id, 10),
  ]);

  if (!gameResult.ok) return <SignalLost />;

  const game = gameResult.data;
  if (!game) notFound();

  const playColor =
    game.color === "magenta"
      ? "magenta"
      : game.color === "yellow"
        ? "yellow"
        : "";

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
          <Link
            href={`/juegos/${game.id}/jugar`}
            className={"btn lg " + playColor}
          >
            JUGAR
          </Link>
          <Link href="/juegos" className="btn lg ghost">
            VOLVER
          </Link>
        </div>

        <div className="leaderboard">
          <h3>TOP 10</h3>
          {!leaderboard.ok ? (
            <SignalLost className="p-8" />
          ) : leaderboard.data.length === 0 ? (
            <div className="p-8 text-center text-ink-faint">
              <div className="pixel text-[12px] text-cyan">
                ▸ SIN PUNTUACIONES — SÉ EL PRIMERO
                <span className="blink">_</span>
              </div>
            </div>
          ) : (
            leaderboard.data.map((row) => (
              <div
                key={row.rank}
                className={"lb-row" + (row.rank <= 3 ? ` top${row.rank}` : "")}
              >
                <span className="rk">#{String(row.rank).padStart(2, "0")}</span>
                <span className="pl">{row.name}</span>
                <span className="sc">{row.score.toLocaleString("es-ES")}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
