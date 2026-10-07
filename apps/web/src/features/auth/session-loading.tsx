import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";

export function SessionLoading() {
  return (
    <LoadingState label="Recuperando sesión…">
      <div className="panel glass space-y-4" aria-hidden="true">
        <Skeleton className="h-8 w-3/5" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </LoadingState>
  );
}
