import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, formatPrice, parseError } from "../api.js";
import ConfirmModal from "../components/ConfirmModal.jsx";
import { ProductImage } from "../components/ProductCard.jsx";
import { ErrorBox, Loading } from "../components/States.jsx";
import { useToast } from "../components/Toast.jsx";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = useState({ status: "loading", product: null, error: "", notFound: false });
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: "loading", product: null, error: "", notFound: false });
    api.get(`/products/${id}/`, { signal: ctrl.signal })
      .then((r) => setState({ status: "ready", product: r.data, error: "", notFound: false }))
      .catch((e) => {
        const { message } = parseError(e);
        if (message) setState({ status: "error", product: null, error: message, notFound: e.response?.status === 404 });
      });
    return () => ctrl.abort();
  }, [id, tick]);

  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/products/${id}/`);
      toast("Product deleted");
      navigate("/products", { replace: true });
    } catch (e) {
      toast(parseError(e).message, "error");
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (state.status === "loading") return <Loading label="Loading product" />;
  if (state.notFound) {
    return (
      <div className="state">
        <h2>Product not found</h2>
        <p>It may have been deleted by its owner.</p>
        <Link className="btn btn-primary" to="/products">Back to catalog</Link>
      </div>
    );
  }
  if (state.status === "error") return <ErrorBox message={state.error} onRetry={() => setTick((t) => t + 1)} />;

  const p = state.product;
  return (
    <article className="detail">
      <Link to="/products" className="back">Back to catalog</Link>
      <div className="detail-grid">
        <div className="detail-img"><ProductImage src={p.image_url} alt={p.name} /></div>
        <div>
          <p className="meta">{p.brand} in {p.category}</p>
          <h1>{p.name}</h1>
          <div className="big-tag"><span className="tag-price">{formatPrice(p.price)}</span></div>
          <p className="desc">{p.description || "No description yet."}</p>
          {p.tags?.length > 0 && <ul className="tags" aria-label="Tags">{p.tags.map((t) => <li key={t}>{t}</li>)}</ul>}
          <p className="small">Added by {p.owner_username || "a former user"} on {new Date(p.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
          {p.is_owner && (
            <div className="row">
              <Link className="btn btn-yellow" to={`/products/${p.id}/edit`}>Edit product <span className="arrow">↗</span></Link>
              <button className="btn btn-danger-outline" onClick={() => setConfirming(true)}>Delete</button>
            </div>
          )}
        </div>
      </div>
      {confirming && (
        <ConfirmModal
          title={`Delete “${p.name}”?`}
          body="This removes the product from the catalog for everyone. You can't undo it."
          confirmLabel="Delete product"
          busy={deleting}
          onConfirm={remove}
          onCancel={() => !deleting && setConfirming(false)}
        />
      )}
    </article>
  );
}
