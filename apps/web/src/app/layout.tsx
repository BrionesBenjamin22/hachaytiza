import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/features/auth/session";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "Hacha y Tiza",
  description: "Encontrá jugadores y completá tu partido de fútbol.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>{/* A small same-origin bootstrap sets the theme before paint; CSP needs only script-src 'self'. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" />
      </head>
      <body><Providers><Shell>{children}</Shell></Providers></body>
    </html>
  );
}
