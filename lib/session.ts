import type { User } from "@supabase/supabase-js";
import { ALIAS_RE, FALLBACK_ALIAS, suggestAlias } from "@/lib/auth-rules";
import { createClient } from "@/lib/supabase/client";
// ─── Sesión (SPEC 12) ───────────────────────────────────────────────────────
//
// Store externo para `useSyncExternalStore` sobre el cliente de navegador de
// Supabase. Solo lee la sesión: registro, login, logout y recuperación van por
// las Server Actions de `app/acceso/actions.ts`, que escriben las cookies.
// Es el único módulo de cliente que habla con Supabase (lo usa `SessionProvider`).
export type SessionUser = {
  id: string; // auth.users.id
  email: string;
  name: string; // alias válido o "JUGADOR"
  /** false si `user_metadata.alias` falta o no cumple ALIAS_RE (cuenta OAuth nueva, SPEC 13). */
  hasAlias: boolean;
  /** Propuesta para /acceso/alias, calculada con `suggestAlias(user_metadata)`. */
  aliasSuggestion: string;
};
export type SessionSnapshot = {
  /** false hasta la primera lectura de la sesión. */
  ready: boolean;
  user: SessionUser | null;
};
/** Clave de la sesión simulada anterior: se borra al arrancar. */
const LEGACY_USER_KEY = "av_user";
const SERVER_SNAPSHOT: SessionSnapshot = { ready: false, user: null };
let snapshot: SessionSnapshot = SERVER_SNAPSHOT;
let started = false;
const listeners = new Set<() => void>();
function toSessionUser(user: User | null | undefined): SessionUser | null {
  if (!user) return null;
  const metadata: Record<string, unknown> = user.user_metadata ?? {};
  const alias = metadata.alias;
  const hasAlias = typeof alias === "string" && ALIAS_RE.test(alias);
  return {
    id: user.id,
    email: user.email ?? "",
    name: hasAlias ? alias : FALLBACK_ALIAS,
    hasAlias,
    aliasSuggestion: suggestAlias(metadata, user.email),
  };
}
const sameUser = (a: SessionUser | null, b: SessionUser | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.id === b.id &&
    a.email === b.email &&
    a.name === b.name &&
    a.hasAlias === b.hasAlias &&
    a.aliasSuggestion === b.aliasSuggestion);
/** Publica un usuario nuevo solo si cambia algo, para no re-renderizar en vano. */
function publish(user: SessionUser | null) {
  if (snapshot.ready && sameUser(snapshot.user, user)) return;
  snapshot = { ready: true, user };
  listeners.forEach((listener) => listener());
}
function removeLegacyUser() {
  try {
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch {}
}
/**
 * Vuelve a leer la sesión de las cookies y la valida con Supabase Auth.
 * Se llama al arrancar y tras cada Server Action que cambie la sesión.
 * Si falla la red, se mantiene el usuario que hubiera.
 */
export async function refreshSession(): Promise<void> {
  try {
    const { data, error } = await createClient().auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") {
      console.error("[session] getUser falló:", error.message);
      publish(snapshot.user);
      return;
    }
    publish(toSessionUser(data.user));
  } catch (err) {
    console.error("[session] error inesperado:", err);
    publish(snapshot.user);
  }
}
/** Arranca una sola vez, en el navegador, con el primer suscriptor. */
function start() {
  if (started) return;
  started = true;
  removeLegacyUser();
  // Cambios que hace el propio cliente (refresco de token, otras pestañas).
  // El callback no debe esperar llamadas a Supabase: solo publica.
  createClient().auth.onAuthStateChange((_event, session) => {
    if (snapshot.ready) publish(toSessionUser(session?.user));
  });
  void refreshSession();
}
export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}
export const getSessionSnapshot = (): SessionSnapshot => snapshot;
/** En el servidor y durante la hidratación no hay sesión leída. */
export const getServerSessionSnapshot = (): SessionSnapshot => SERVER_SNAPSHOT;
// ─── Puntuaciones de juegos simulados (sin motor) ──────────────────────────
export type SavedScore = {
  game: string;
  score: number;
  name: string;
  at: number;
};
const SCORES_KEY = "av_scores";
export function readScores(): SavedScore[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
    return Array.isArray(value) ? (value as SavedScore[]) : [];
  } catch {
    return [];
  }
}
export function saveScore(entry: Omit<SavedScore, "at">): void {
  try {
    const all = readScores();
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {}
}
