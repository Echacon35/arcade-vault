import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { Game, GameCategory, GameColor } from "./games";
import type { Tables } from "./supabase/database.types";
import { createPublicClient } from "./supabase/public";

/**
 * Capa de datos del catálogo y el leaderboard (SPEC 06).
 *
 * Lecturas públicas cacheadas con `"use cache"`: usan el cliente sin cookies e
 * invalidan por tag desde la Server Action de guardar puntuación.
 * - `"games"`: catálogo completo (incluye `best` y `plays` de `game_stats`).
 * - `game-${id}`: detalle y leaderboard de un juego.
 *
 * Un error de Supabase se devuelve como `{ ok: false }` con `cacheLife("seconds")`
 * para que no quede cacheado como dato válido.
 */

export type CatalogResult<T> = { ok: true; data: T } | { ok: false };

export type LeaderboardRow = { rank: number; name: string; score: number; date: string };

type GameRow = Tables<"games">;
type StatsRow = Tables<"game_stats">;

function toGame(row: GameRow, stats: StatsRow | undefined): Game {
  return {
    id: row.id,
    title: row.title,
    short: row.short_description,
    long: row.long_description,
    // Los CHECK de la tabla garantizan estos valores.
    cat: row.category as GameCategory,
    cover: row.cover,
    color: row.color as GameColor,
    best: stats?.best ?? 0,
    plays: (stats?.plays ?? 0).toLocaleString("es-ES"),
  };
}

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export async function getCatalog(): Promise<CatalogResult<Game[]>> {
  "use cache";
  cacheTag("games");

  const supabase = createPublicClient();
  const [games, stats] = await Promise.all([
    supabase.from("games").select("*").order("sort_order", { ascending: true }),
    supabase.from("game_stats").select("*"),
  ]);

  if (games.error || stats.error) {
    console.error("[catalog] getCatalog falló:", games.error ?? stats.error);
    cacheLife("seconds");
    return { ok: false };
  }

  const statsById = new Map(stats.data.map((s) => [s.game_id, s]));
  cacheLife("hours");
  return { ok: true, data: games.data.map((g) => toGame(g, statsById.get(g.id))) };
}

export async function getCatalogGame(id: string): Promise<CatalogResult<Game | null>> {
  "use cache";
  cacheTag("games", `game-${id}`);

  const supabase = createPublicClient();
  const [game, stats] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).maybeSingle(),
    supabase.from("game_stats").select("*").eq("game_id", id).maybeSingle(),
  ]);

  if (game.error || stats.error) {
    console.error(`[catalog] getCatalogGame(${id}) falló:`, game.error ?? stats.error);
    cacheLife("seconds");
    return { ok: false };
  }

  cacheLife("hours");
  return { ok: true, data: game.data ? toGame(game.data, stats.data ?? undefined) : null };
}

export async function getLeaderboard(
  gameId: string,
  limit: number,
): Promise<CatalogResult<LeaderboardRow[]>> {
  "use cache";
  cacheTag(`game-${gameId}`);

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("rank, player_name, score, achieved_at")
    .eq("game_id", gameId)
    .order("rank", { ascending: true })
    .limit(limit);

  if (error) {
    console.error(`[catalog] getLeaderboard(${gameId}) falló:`, error);
    cacheLife("seconds");
    return { ok: false };
  }

  cacheLife("hours");
  return {
    ok: true,
    data: data.map((r) => ({
      rank: r.rank ?? 0,
      name: r.player_name ?? "",
      score: r.score ?? 0,
      date: r.achieved_at ? dateFormatter.format(new Date(r.achieved_at)) : "",
    })),
  };
}
