export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }
  return (
    <nav className="pager" aria-label="Pagination">
      <button className="btn btn-outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
      <ul>
        {pages.map((p, i) =>
          p === "…" ? <li key={`e${i}`} className="gap">…</li> : (
            <li key={p}>
              <button className={`pg ${p === page ? "on" : ""}`} aria-current={p === page ? "page" : undefined} onClick={() => onChange(p)}>{p}</button>
            </li>
          )
        )}
      </ul>
      <button className="btn btn-outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </nav>
  );
}
