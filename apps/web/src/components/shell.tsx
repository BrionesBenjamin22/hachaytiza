"use client";
import type { ReactNode } from "react";
import { useSession } from "@/features/auth/session";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
export function Shell({ children }: { children: ReactNode }) {
  const state = useSession();
  const seconds = Number(process.env.NEXT_PUBLIC_SESSION_WARNING_SECONDS ?? "120");
  const warning = state.session?.authenticated && state.expires > 0 && state.now > 0 && state.expires - state.now <= seconds * 1000;
  const restore = !state.session?.authenticated && state.session?.refreshAvailable;
  return <><a className="skip-link" href="#contenido">Ir al contenido</a>
    <SiteHeader authenticated={!!state.session?.authenticated} /><main id="contenido" className="container">
      {warning || restore ? <section className="notice" aria-label="Estado de sesión"><p>{restore ? "Su sesión finalizó. Puede recuperarla para continuar." : "Su sesión está por finalizar."}</p><div className="actions"><button className="button" disabled={state.pending} onClick={() => void state.refresh()}>{restore ? "Recuperar sesión" : "Mantener sesión"}</button><button className="button secondary" disabled={state.pending} onClick={() => void state.logout()}>Cerrar sesión</button></div></section> : null}
      {state.feedback ? <p className="notice" role="status">{state.feedback}</p> : null}{children}
    </main><SiteFooter /></>;
}
