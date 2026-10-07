"use client";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { CircleUserRound, UserRound, ShieldCheck, Palette, LogOut, ChevronDown } from "lucide-react";
import { useSession } from "@/features/auth/session";
export function AccountMenu() {
  const session = useSession();
  return <DropdownMenu.Root><DropdownMenu.Trigger asChild><button type="button" className="account-trigger" aria-label="Mi cuenta"><CircleUserRound size={22} aria-hidden="true" /><span className="account-name">{session.session?.user?.name}</span><ChevronDown size={16} aria-hidden="true" /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="account-menu glass" align="end" sideOffset={10}><DropdownMenu.Label className="menu-label">Mi cuenta</DropdownMenu.Label><DropdownMenu.Item asChild><Link href="/account/profile"><UserRound size={17} aria-hidden="true" />Perfil</Link></DropdownMenu.Item><DropdownMenu.Item asChild><Link href="/account/security"><ShieldCheck size={17} aria-hidden="true" />Seguridad</Link></DropdownMenu.Item><DropdownMenu.Item asChild><Link href="/account/appearance"><Palette size={17} aria-hidden="true" />Apariencia</Link></DropdownMenu.Item><DropdownMenu.Separator className="menu-separator" /><DropdownMenu.Item disabled={session.pending} onSelect={() => void session.logout()}><LogOut size={17} aria-hidden="true" />Cerrar sesión</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
}
