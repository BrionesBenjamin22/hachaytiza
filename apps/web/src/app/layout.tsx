import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hacha y Tiza",
  description: "Encontrá jugadores y completá tu partido de fútbol.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
