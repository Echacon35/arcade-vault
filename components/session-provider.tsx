"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { parseUser, readUserRaw, subscribeUser, writeUser, type SessionUser } from "@/lib/session";

type SessionContextValue = {
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

const getServerSnapshot = () => null;
const login = (user: SessionUser) => writeUser(user);
const logout = () => writeUser(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // En servidor y en la hidratación el snapshot es `null`; luego se lee `localStorage`.
  const raw = useSyncExternalStore(subscribeUser, readUserRaw, getServerSnapshot);
  const user = useMemo(() => parseUser(raw), [raw]);
  const value = useMemo(() => ({ user, login, logout }), [user]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return context;
}
