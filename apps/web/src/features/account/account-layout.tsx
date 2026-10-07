"use client";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/features/auth/session";
import { errorMessage } from "@/lib/http";
import { SessionLoading } from "@/features/auth/session-loading";
export function AccountLayout({ children }: { children: ReactNode }) {
  const session = useSession(); const router = useRouter(); const pathname = usePathname();
  useEffect(() => { if (!session.isPending && !session.isError && !session.session?.authenticated) router.replace("/auth/login"); }, [session.isPending, session.isError, session.session?.authenticated, router]);
  if (session.isPending) return <SessionLoading />;
  if (session.isError) return <><p className="error" role="alert">{errorMessage(session.error)}</p><button className="button" onClick={() => void session.refetch()}>Reintentar</button></>;
  if (!session.session?.authenticated) return <p role="status">Ingresá para acceder a tu cuenta.</p>;
  return <div className="account-layout"><nav className="account-nav" aria-label="Ajustes de cuenta">{[["/account/profile", "Perfil"], ["/account/security", "Seguridad"], ["/account/appearance", "Apariencia"]].map(([href, label]) => <Link href={href} key={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav><div className="account-content">{children}</div></div>;
}
