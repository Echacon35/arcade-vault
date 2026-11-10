import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HallOfFame, type HallEntry } from "@/components/hall-of-fame";
import { SignalLost } from "@/components/signal-lost";
import { getCatalog, getLeaderboard } from "@/lib/catalog";
export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
};
/**
 * El título y VOLVER quedan fuera del `<Suspense>` para que se vean también
 * cuando Supabase falla (SPEC 06.5).
 */
export default function SalonPage() {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel text-[10px]">
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <Suspense fallback={null}>
        <HallContent />
      </Suspense>
      <div className="mt-8 text-center">
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
async function HallContent() {
  const catalog = await getCatalog();
  if (!catalog.ok) return <SignalLost />;
  const leaderboards = await Promise.all(
    catalog.data.map((game) => getLeaderboard(game.id, 10)),
  );
  const entries: HallEntry[] = [];
  for (const [i, game] of catalog.data.entries()) {
    const result = leaderboards[i];
    if (!result.ok) return <SignalLost />;
    entries.push({ game, rows: result.data });
  }
  return <HallOfFame entries={entries} />;
}
