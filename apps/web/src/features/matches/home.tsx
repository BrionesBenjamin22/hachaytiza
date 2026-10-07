"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { authService } from "@/features/auth/service";
import { useLocations } from "@/features/locations/hooks";
import { errorMessage } from "@/lib/http";
import { matchesService } from "./service";
import { Landing } from "@/features/landing/landing";
import { LocationCombobox } from "@/features/locations/location-combobox";
import { EmptyState } from "@/components/ui/empty-state";
import { SessionLoading } from "@/features/auth/session-loading";
import { MatchesLoading } from "./matches-loading";
import { MatchCard } from "./match-card";

export function Home({ success, discovery = false }: { success?: string; discovery?: boolean }) {
  const session = useSession(); const router = useRouter();
  useEffect(() => { if (session.session?.authenticated && !session.session.user?.primaryLocation) router.replace("/auth/location"); }, [session.session, router]);
  if (session.isPending) return <SessionLoading />;
  if (session.isError) return <><p role="alert">{errorMessage(session.error)}</p><button className="button" onClick={() => void session.refetch()}>Reintentar</button></>;
  if (session.session?.authenticated && !session.session.user?.primaryLocation) return <p role="status">Vamos a configurar su localidad…</p>;
  if (!session.session?.authenticated && !discovery) return <Landing />;
  return <HomeList key={session.session?.user?.id ?? "visitor"} success={success} />;
}
function HomeList({ success }: { success?: string }) {
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const session = useSession(); const locations = useLocations();
  const selected = session.selectedHomeLocation;
  const matches = useInfiniteQuery({ queryKey: ["matches", selected], queryFn: ({ pageParam }) => matchesService.list(selected, pageParam), initialPageParam: 1, getNextPageParam: last => last.hasMore ? last.page + 1 : undefined, enabled: !!selected });
  const locality = locations.data?.find(location => location.id === selected)?.name ?? session.session?.user?.primaryLocation?.name;
  const messages: Record<string, string> = { registered: "Cuenta creada correctamente.", login: "Sesión iniciada correctamente.", location: "Localidad guardada correctamente." };
  function openLocationSelector() {
    const control = document.getElementById("home-location");
    control?.focus();
    control?.click();
  }
  return <>{success && messages[success] ? <p className="notice" role="status">{messages[success]}</p> : null}
    <h1>Partidos disponibles</h1><p className="muted">Encontrá un lugar para jugar cerca tuyo.</p>
    {session.session?.authenticated && session.session.user && !session.session.user.emailVerified ? <section className="notice"><p>Verificá tu email con el enlace que enviamos a tu correo.</p><button className="button secondary" disabled={sending} onClick={async () => { setSending(true); try { await authService.resendVerification(); setFeedback("Si corresponde, recibirá un nuevo enlace de verificación."); } catch (error) { setFeedback(errorMessage(error)); } finally { setSending(false); } }}>Reenviar enlace</button>{feedback ? <p role="status" className="mt-4">{feedback}</p> : null}</section> : null}
    <div className="filters glass"><LocationCombobox id="home-location" label="Localidad seleccionada" value={selected} onChange={session.selectHomeLocation} /><p className="muted filter-help">{session.session?.authenticated ? "Podés explorar otra zona. Tu localidad principal se mantiene." : "Elegí dónde querés jugar."}</p></div>
    {selected && !session.session?.authenticated ? <h2 className="listing-title">Partidos en {locality ?? "tu localidad"}</h2> : null}
    {!selected ? <EmptyState title="Elegí dónde querés jugar" description="Seleccioná una localidad para ver los partidos." action={<button type="button" className="button secondary" onClick={openLocationSelector}>Elegir localidad</button>} /> : matches.isPending ? <MatchesLoading /> : matches.isError && !matches.data ? <><p className="error" role="alert">{errorMessage(matches.error)}</p><button className="button secondary" onClick={() => void matches.refetch()}>Reintentar partidos</button></> : <>
      {matches.data?.pages[0].total === 0 ? <EmptyState title="Busquemos en otra zona" description="Todavía no hay partidos en esta localidad. Probá con otra zona." action={<button type="button" className="button secondary" onClick={openLocationSelector}>Cambiar localidad</button>} /> : <div className="match-grid">{matches.data?.pages.flatMap(page => page.items).map(match => <MatchCard match={match} key={match.id} />)}</div>}
      {matches.isFetchNextPageError ? <p className="error" role="alert">{errorMessage(matches.error)} Vuelva a cargar más partidos.</p> : null}{matches.hasNextPage ? <button className="button secondary" disabled={matches.isFetchingNextPage} onClick={() => void matches.fetchNextPage()}>{matches.isFetchingNextPage ? "Cargando…" : "Cargar más partidos"}</button> : null}
    </>}
  </>;
}
