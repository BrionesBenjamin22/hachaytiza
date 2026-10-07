import type { Metadata } from "next";
import { NotFoundGlitch } from "@/components/ui/be-ui-404-not-found";

export const metadata: Metadata = { title: "Página no encontrada | Hacha y Tiza" };

export default function NotFound() {
  return <NotFoundGlitch />;
}
