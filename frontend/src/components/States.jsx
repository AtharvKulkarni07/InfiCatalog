export const Loading = ({ label = "Loading" }) => (
  <div className="state" role="status">
    <div className="spinner" aria-hidden="true" />
    <p>{label}…</p>
  </div>
);

export const ErrorBox = ({ message, onRetry }) => (
  <div className="state state-error" role="alert">
    <h2>We couldn't load this</h2>
    <p>{message}</p>
    {onRetry && <button className="btn btn-primary" onClick={onRetry}>Try again</button>}
  </div>
);

export const Empty = ({ title, children, icon }) => (
  <div className="state state-empty">
    <div className="state-icon" aria-hidden="true">
      {icon || (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="34" height="34">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      )}
    </div>
    <h2>{title}</h2>
    <p>{children}</p>
  </div>
);

export const SkeletonGrid = ({ count = 8 }) => (
  <div className="grid" aria-busy="true" aria-label="Loading products">
    {Array.from({ length: count }, (_, i) => (
      <div className="card skel" key={i}>
        <div className="skel-img" />
        <div className="skel-line" />
        <div className="skel-line short" />
      </div>
    ))}
  </div>
);
