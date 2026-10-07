"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService, type Session } from "./service";
import { errorMessage } from "@/lib/http";
const SessionContext = createContext<ReturnType<typeof useSessionState> | null>(null);
export const sessionKey = ["session"] as const;
function useSessionState() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: sessionKey, queryFn: authService.session, retry: false, staleTime: 0 });
  const [now, setNow] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [homeLocation, setHomeLocation] = useState<{ owner: string; id: string } | null>(null);
  const expires = query.data?.accessExpiresAt ? Date.parse(query.data.accessExpiresAt) : 0;
  const warningSeconds = Number(process.env.NEXT_PUBLIC_SESSION_WARNING_SECONDS ?? "120");
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const start = setTimeout(tick, 0);
    const warning = setTimeout(tick, Math.max(0, expires - warningSeconds * 1000 - Date.now()));
    const expiration = setTimeout(tick, Math.max(0, expires - Date.now()));
    return () => { clearTimeout(start); clearTimeout(warning); clearTimeout(expiration); };
  }, [expires, warningSeconds]);
  const expired = expires > 0 && now >= expires;
  const { refetch } = query;
  useEffect(() => { if (expired) void refetch(); }, [expired, refetch]);
  async function synchronize() { await client.invalidateQueries({ queryKey: sessionKey }); }
  async function refresh() {
    setPending(true); setFeedback("");
    try { await authService.refresh(); await synchronize(); setFeedback("Sesión renovada correctamente."); }
    catch (error) { await synchronize(); setFeedback(errorMessage(error)); }
    finally { setPending(false); }
  }
  async function logout() {
    setPending(true); setFeedback("");
    try { await authService.logout(); setHomeLocation(null); client.clear(); await refetch(); setFeedback("Sesión cerrada correctamente."); }
    catch (error) { setFeedback(errorMessage(error)); }
    finally { setPending(false); }
  }
  const session: Session | undefined = expired && query.data ? { ...query.data, authenticated: false, user: null } : query.data;
  const owner = session?.user?.id ?? "visitor";
  const selectedHomeLocation = homeLocation?.owner === owner ? homeLocation.id : session?.user?.primaryLocation?.id ?? "";
  function selectHomeLocation(id: string) { setHomeLocation({ owner, id }); }
  async function clearRevokedSession() { setHomeLocation(null); client.clear(); await refetch(); }
  return { ...query, session, synchronize, refresh, logout, feedback, pending, now, expires, selectedHomeLocation, selectHomeLocation, clearRevokedSession };
}
function SessionProvider({ children }: { children: ReactNode }) {
  const state = useSessionState();
  return <SessionContext value={state}>{children}</SessionContext>;
}
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return <QueryClientProvider client={client}><SessionProvider>{children}</SessionProvider></QueryClientProvider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("SessionProvider required");
  return value;
}
