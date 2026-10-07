import { useQuery } from "@tanstack/react-query";
import { locationsService } from "./service";
export function useLocations() { return useQuery({ queryKey: ["locations"], queryFn: locationsService.list, staleTime: 5 * 60_000 }); }
