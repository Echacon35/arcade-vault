export type SessionUser = { name: string };
export type SavedScore = { game: string; score: number; name: string; at: number };

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** Suscripción para `useSyncExternalStore`: cambios locales y de otras pestañas. */
export function subscribeUser(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === USER_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Snapshot en crudo (string) para que la referencia sea estable entre lecturas. */
export function readUserRaw(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function parseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (value && typeof value === "object" && typeof (value as SessionUser).name === "string") {
      return { name: (value as SessionUser).name };
    }
  } catch {}
  return null;
}

export function writeUser(user: SessionUser | null): void {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
  emit();
}

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
