import { request } from "@/lib/http";
import type { Location } from "@/features/locations/service";
export interface Match { id: string; location: Location; footballType: "FIVE" | "SIX" | "SEVEN"; startsAt: string; venueName: string; address: string; pricePerPerson: string; availablePlaces: number; status: "OPEN" | "CLOSED"; description: string | null }
export interface MatchPage { items: Match[]; total: number; page: number; pageSize: number; hasMore: boolean }
export const matchesService = { list: (locationId: string, page: number) => request<MatchPage>(`/matches?locationId=${encodeURIComponent(locationId)}&page=${page}`) };
