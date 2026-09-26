export function Skeleton({ className = "" }: { className?: string }) {
  return <span className={`skeleton ${className}`} aria-hidden="true" />;
}
export function FormListSkeleton() {
  return (
    <div className="form-list-skeleton" role="status" aria-label="Loading forms">
      {[0, 1, 2, 3].map((i) => (
        <div className="skeleton-form-row" key={i}>
          <Skeleton className="skeleton-form-title" />
          <Skeleton className="skeleton-form-meta" />
        </div>
      ))}
    </div>
  );
}
export function WorkspaceSkeleton() {
  return (
    <div className="dashboard" role="status" aria-label="Loading workspace">
      <aside className="workspace-sidebar">
        <Skeleton className="skeleton-account" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton className="skeleton-nav" key={i} />
        ))}
      </aside>
      <main className="workspace-main">
        <div className="workspace-topbar" />
        <div className="workspace-content">
          <div className="workspace-heading">
            <Skeleton className="skeleton-heading" />
            <Skeleton className="skeleton-button" />
          </div>
          <FormListSkeleton />
        </div>
      </main>
    </div>
  );
}
export function BuilderSkeleton() {
  const sidebar = location.pathname.startsWith("/forms/");
  return (
    <div
      className={`builder${sidebar ? " with-sidebar" : ""}`}
      role="status"
      aria-label="Loading form"
    >
      {sidebar && (
        <aside className="workspace-sidebar">
          <Skeleton className="skeleton-account" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton className="skeleton-nav" key={i} />
          ))}
        </aside>
      )}
      <header className="builder-header">
        <Skeleton className="skeleton-heading" />
        <span className="header-actions">
          <Skeleton className="skeleton-button" />
          <Skeleton className="skeleton-button" />
        </span>
      </header>
      <div className="builder-canvas">
        <Skeleton className="skeleton-form-title large" />
        {[0, 1, 2].map((i) => (
          <div className="skeleton-question" key={i}>
            <Skeleton className="skeleton-form-title" />
            <Skeleton className="skeleton-input" />
          </div>
        ))}
      </div>
    </div>
  );
}
export function PanelSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="panel-skeleton">
      <Skeleton className="skeleton-heading" />
      <Skeleton className="skeleton-input" />
      <Skeleton className="skeleton-input" />
      <Skeleton className="skeleton-form-meta" />
    </div>
  );
}
