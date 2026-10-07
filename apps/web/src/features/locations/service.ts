import { request } from "@/lib/http";
export interface Location { id: string; name: string; type: string; parentId?: string | null }
export const locationsService = { list: async () => (await request<{ items: Location[] }>("/locations")).items };
