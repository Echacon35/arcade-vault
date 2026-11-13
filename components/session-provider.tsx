"use client";
import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { signOutAction } from "@/app/acceso/actions";
import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  refreshSession,
  subscribeSession,
  type SessionUser,
} from "@/lib/session";
type SessionContextValue = {
  user: SessionUser | null;
  /** false hasta la primera lectura de la sesión (evita el parpadeo de «Iniciar sesión» en el nav). */
  ready: boolean;
  /** Vuelve a leer la sesión tras una Server Action que la cambie. */
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};
const SessionContext = createContext<SessionContextValue | null>(null);
/** Cierra la sesión en el servidor (borra las cookies) y vuelve a leerla. */
async function logout() {
  try {
    await signOutAction();
  } finally {
    await refreshSession();
  }
}
export function SessionProvider({ children }: { children: React.ReactNode }) {
  // En servidor y en la hidratación: `{ ready: false, user: null }`; luego, la sesión de Supabase.
  const { ready, user } = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getServerSessionSnapshot,
  );
  const value = useMemo(
    () => ({ user, ready, refresh: refreshSession, logout }),
    [user, ready],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context)
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return context;
}
