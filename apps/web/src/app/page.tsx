import { Home } from "@/features/matches/home";
export default async function HomePage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const params = await searchParams;
  return <Home success={params.success} />;
}
