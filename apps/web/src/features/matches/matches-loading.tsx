import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";

export function MatchesLoading() {
  return (
    <LoadingState label="Cargando partidos…">
      <div className="match-grid" aria-hidden="true">
        {[0, 1, 2].map(index => (
          <div className="match space-y-4" key={index}>
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-7 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-2/5" />
          </div>
        ))}
      </div>
    </LoadingState>
  );
}
