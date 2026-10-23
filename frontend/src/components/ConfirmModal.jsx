import { useEffect, useRef } from "react";

export default function ConfirmModal({ title, body, confirmLabel, busy, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="m-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="m-title">{title}</h2>
        <p>{body}</p>
        <div className="row end">
          <button ref={ref} className="btn btn-outline" onClick={onCancel} disabled={busy}>Keep it</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={busy}>{busy ? "Deleting…" : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
