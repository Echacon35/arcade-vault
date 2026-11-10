"use server";

import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SaveScoreResult = { ok: true } | { ok: false; error: string };

const NAME_RE = /^[A-Z0-9_]{1,10}$/;
const GAME_ID_RE = /^[a-z0-9-]+$/;
const MAX_SCORE = 10_000_000;
const GENERIC_ERROR = "No se pudo guardar la puntuación.";

/**
 * Guarda una partida en `scores` (SPEC 06).
 *
 * La validación duplica los CHECK de la tabla. Tras insertar, `updateTag`
 * expira el detalle/leaderboard del juego (`game-${id}`) y el catálogo
 * (`games`, por `game_stats`) para que la siguiente visita lea datos frescos.
 */
export async function saveScoreAction(input: {
  gameId: string;
  name: string;
  score: number;
}): Promise<SaveScoreResult> {
  const { gameId, name, score } = input ?? {};

  if (
    typeof gameId !== "string" ||
    !GAME_ID_RE.test(gameId) ||
    typeof name !== "string" ||
    !NAME_RE.test(name) ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    console.error("[saveScoreAction] entrada inválida:", input);
    return { ok: false, error: GENERIC_ERROR };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, player_name: name, score });

    if (error) {
      console.error("[saveScoreAction] insert falló:", error);
      return { ok: false, error: GENERIC_ERROR };
    }
  } catch (err) {
    console.error("[saveScoreAction] error inesperado:", err);
    return { ok: false, error: GENERIC_ERROR };
  }

  updateTag(`game-${gameId}`);
  updateTag("games");

  return { ok: true };
}
