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

export const Empty = ({ title, children }) => (
  <div className="state">
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
