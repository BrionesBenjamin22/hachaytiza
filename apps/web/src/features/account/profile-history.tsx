"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { accountService } from "./service";
import { errorMessage } from "@/lib/http";
import { useSession } from "@/features/auth/session";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";
export function ProfileHistory() {
  const [page, setPage] = useState(1);
  const session = useSession();
  const query = useQuery({ queryKey: ["profile-history", session.session?.user?.id, page], queryFn: () => accountService.history(page), enabled: !!session.session?.authenticated });
  return <section className="panel glass"><h2>Historial de cambios</h2>{query.isPending ? <LoadingState label="Cargando historial…"><div className="space-y-4" aria-hidden="true"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-5 w-4/5" /><Skeleton className="h-5 w-2/3" /></div></LoadingState> : query.isError ? <><p role="alert" className="error">{errorMessage(query.error)}</p><button className="button secondary" onClick={() => void query.refetch()}>Reintentar historial</button></> : query.data.items.length === 0 ? <EmptyState title="El historial empieza con tu primer cambio" description="Todavía no hay cambios en tu perfil." action={<Link className="button secondary" href="#profile-name">Editar perfil</Link>} /> : <><ul className="history-list">{query.data.items.map(item => <li key={item.id}><time dateTime={item.occurredAt}>{new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(item.occurredAt))}</time>{item.changes.name ? <p>Nombre: {item.changes.name.before} → {item.changes.name.after}</p> : null}{item.changes.primaryLocation ? <p>Localidad: {item.changes.primaryLocation.before?.name ?? "Sin localidad"} → {item.changes.primaryLocation.after.name}</p> : null}</li>)}</ul><div className="actions"><button className="button secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page}</span><button className="button secondary" disabled={!query.data.hasMore} onClick={() => setPage(page + 1)}>Siguiente</button></div></>}</section>;
}
