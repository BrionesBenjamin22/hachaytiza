import type { ReactNode } from "react";

export function LoadingState({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="loading-state" role="status" aria-live="polite" aria-busy="true">
      <p className="loading-label muted">{label}</p>
      {children ? <div className="loading-content" aria-hidden="true">{children}</div> : null}
    </div>
  );
}
