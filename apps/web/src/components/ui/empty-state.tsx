import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state glass">
      <div role="status" aria-live="polite">
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      {action ? <div className="actions empty-actions">{action}</div> : null}
    </div>
  );
}
