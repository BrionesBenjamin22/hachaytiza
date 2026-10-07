import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileLoading() {
  return (
    <LoadingState label="Cargando perfil…">
      <div className="panel glass space-y-6" aria-hidden="true">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-4/5" />
        {[0, 1, 2].map(index => (
          <div className="space-y-2" key={index}>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-12" />
          </div>
        ))}
        <Skeleton className="h-11 w-2/5" />
      </div>
    </LoadingState>
  );
}
