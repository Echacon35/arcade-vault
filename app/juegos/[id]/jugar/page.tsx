import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GamePlayer } from "@/components/game-player";
import { GAMES, getGame } from "@/lib/games";

export function generateStaticParams() {
  return GAMES.map((game) => ({ id: game.id }));
}

/** `notFound()` dentro de `<Suspense>`: mismo motivo que en `app/juegos/[id]/page.tsx`. */
export default function PlayPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  return (
    <Suspense fallback={null}>
      <Player params={params} />
    </Suspense>
  );
}

async function Player({ params }: Pick<PageProps<"/juegos/[id]/jugar">, "params">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
