"use server";
import { updateTag } from "next/cache";
import { ALIAS_RE } from "@/lib/auth-rules";
import { createClient } from "@/lib/supabase/server";
export type SaveScoreResult = { ok: true } | { ok: false; error: string };
const GAME_ID_RE = /^[a-z0-9-]+$/;
const MAX_SCORE = 10_000_000;
const GENERIC_ERROR = "No se pudo guardar la puntuación.";
/**
 * Guarda una partida en `scores` (SPEC 06, SPEC 14).
 *
 * - Con sesión en el servidor: `user_id` y nombre salen de la cuenta
 *   (`getUser()` → `id` y `user_metadata.alias`); el `name` del cliente se
 *   ignora. La política RLS exige `user_id = auth.uid()`.
 * - Sin sesión (invitado, o sesión caducada entre jugar y guardar): se
 *   guarda el `name` del cliente con `user_id` nulo, como antes.
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
    !Number.isInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    console.error("[saveScoreAction] entrada inválida:", input);
    return { ok: false, error: GENERIC_ERROR };
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let row: {
      game_id: string;
      player_name: string;
      score: number;
      user_id: string | null;
    };
    if (user) {
      const alias: unknown = user.user_metadata?.alias;
      if (typeof alias !== "string" || !ALIAS_RE.test(alias)) {
        // No debería pasar: el guardián de SPEC 13 obliga a elegir alias.
        console.error("[saveScoreAction] cuenta sin alias válido");
        return { ok: false, error: GENERIC_ERROR };
      }
      row = { game_id: gameId, player_name: alias, score, user_id: user.id };
    } else {
      if (typeof name !== "string" || !ALIAS_RE.test(name)) {
        console.error("[saveScoreAction] nombre de invitado inválido:", input);
        return { ok: false, error: GENERIC_ERROR };
      }
      row = { game_id: gameId, player_name: name, score, user_id: null };
    }
    const { error } = await supabase.from("scores").insert(row);
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
