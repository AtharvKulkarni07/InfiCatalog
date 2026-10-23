import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, firstError, parseError } from "../api.js";
import { Sparkle } from "../components/Icons.jsx";
import { ProductImage } from "../components/ProductCard.jsx";
import { ErrorBox, Loading } from "../components/States.jsx";
import { useToast } from "../components/Toast.jsx";

const EMPTY = { name: "", brand: "", category: "", price: "", image_url: "", description: "", tags: "" };

export default function ProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState(editing ? "loading" : "ready");
  const [loadError, setLoadError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);
  const [ai, setAi] = useState({ desc: false, tags: false, note: "" });
  const [facets, setFacets] = useState({ categories: [], brands: [] });

  useEffect(() => {
    api.get("/products/facets/").then((r) => setFacets(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editing) return;
    const ctrl = new AbortController();
    api.get(`/products/${id}/`, { signal: ctrl.signal })
      .then(({ data }) => {
        if (!data.is_owner) setForbidden(true);
        setForm({ ...EMPTY, ...data, price: data.price, tags: (data.tags || []).join(", ") });
        setStatus("ready");
      })
      .catch((e) => {
        const { message } = parseError(e);
        if (message) { setLoadError(e.response?.status === 404 ? "This product no longer exists." : message); setStatus("error"); }
      });
    return () => ctrl.abort();
  }, [id, editing]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const hasBasics = form.name.trim() && form.brand.trim() && form.category.trim();

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = ["Enter a product name."];
    if (!form.brand.trim()) errs.brand = ["Enter a brand."];
    if (!form.category.trim()) errs.category = ["Enter a category."];
    if (!(Number(form.price) > 0)) errs.price = ["Enter a price greater than zero."];
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const payload = {
      name: form.name, brand: form.brand, category: form.category,
      price: form.price, image_url: form.image_url.trim(), description: form.description,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    setSaving(true);
    try {
      const { data } = editing ? await api.put(`/products/${id}/`, payload) : await api.post("/products/", payload);
      toast(editing ? "Changes saved" : "Product added");
      navigate(`/products/${data.id}`);
    } catch (err) {
      const parsed = parseError(err);
      setErrors(parsed.fields);
      setBanner(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  const writeDescription = async () => {
    if (!hasBasics) return setAi((a) => ({ ...a, note: "Add a name, brand and category first so the AI has something to work with." }));
    setAi((a) => ({ ...a, desc: true, note: "" }));
    try {
      const { data } = await api.post("/ai/generate-description/", { name: form.name, brand: form.brand, category: form.category });
      setForm((f) => ({ ...f, description: data.description }));
      setAi((a) => ({ ...a, desc: false, note: data.source === "llm" ? "Drafted by AI. Review and edit before saving." : "AI is unavailable right now, so this is a template draft. Edit it before saving." }));
    } catch (err) {
      setAi((a) => ({ ...a, desc: false, note: parseError(err).message }));
    }
  };

  const suggestTags = async () => {
    if (!hasBasics) return setAi((a) => ({ ...a, note: "Add a name, brand and category first so the AI has something to work with." }));
    setAi((a) => ({ ...a, tags: true, note: "" }));
    try {
      const { data } = await api.post("/ai/suggest-tags/", { name: form.name, brand: form.brand, category: form.category, description: form.description });
      const existing = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const merged = [...new Set([...existing, ...data.tags])].slice(0, 10);
      setForm((f) => ({ ...f, tags: merged.join(", ") }));
      setAi((a) => ({ ...a, tags: false, note: "Tags added. Remove any that don't fit." }));
    } catch (err) {
      setAi((a) => ({ ...a, tags: false, note: parseError(err).message }));
    }
  };

  if (status === "loading") return <Loading label="Loading product" />;
  if (status === "error") return <ErrorBox message={loadError} />;
  if (forbidden) {
    return (
      <div className="state">
        <h2>You can't edit this product</h2>
        <p>Only the person who added a product can change or delete it.</p>
        <Link className="btn btn-primary" to={`/products/${id}`}>View product</Link>
      </div>
    );
  }

  const fieldErr = (n) => firstError(errors, n);

  return (
    <div className="formpage">
      <Link to={editing ? `/products/${id}` : "/"} className="back">{editing ? "Back to product" : "Back to catalog"}</Link>
      <h1>{editing ? "Edit product" : "Add product"}</h1>
      {banner && <div className="banner banner-error" role="alert">{banner}</div>}
      <form className="form two" onSubmit={submit} noValidate>
        <div className="cols">
          <label>Product name
            <input value={form.name} onChange={set("name")} maxLength={200} aria-invalid={Boolean(fieldErr("name"))} />
            {fieldErr("name") && <span className="err">{fieldErr("name")}</span>}
          </label>
          <label>Brand
            <input value={form.brand} onChange={set("brand")} list="brands" maxLength={100} aria-invalid={Boolean(fieldErr("brand"))} />
            <datalist id="brands">{facets.brands.map((b) => <option key={b} value={b} />)}</datalist>
            {fieldErr("brand") && <span className="err">{fieldErr("brand")}</span>}
          </label>
          <label>Category
            <input value={form.category} onChange={set("category")} list="cats" maxLength={100} aria-invalid={Boolean(fieldErr("category"))} />
            <datalist id="cats">{facets.categories.map((c) => <option key={c} value={c} />)}</datalist>
            {fieldErr("category") && <span className="err">{fieldErr("category")}</span>}
          </label>
          <label>Price (₹)
            <input type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={set("price")} aria-invalid={Boolean(fieldErr("price"))} />
            {fieldErr("price") && <span className="err">{fieldErr("price")}</span>}
          </label>
        </div>

        <label>Image URL
          <input type="url" value={form.image_url} onChange={set("image_url")} placeholder="https://…" aria-invalid={Boolean(fieldErr("image_url"))} />
          {fieldErr("image_url") && <span className="err">{fieldErr("image_url")}</span>}
        </label>
        {form.image_url && <div className="preview"><ProductImage src={form.image_url} alt="Image preview" /></div>}

        <div className="field">
          <div className="label-row">
            <label htmlFor="desc">Description</label>
            <button type="button" className="btn btn-ai" onClick={writeDescription} disabled={ai.desc}><Sparkle size={14} /> {ai.desc ? "Writing…" : "Write with AI"}</button>
          </div>
          <textarea id="desc" rows={5} value={form.description} onChange={set("description")} />
          {fieldErr("description") && <span className="err">{fieldErr("description")}</span>}
        </div>

        <div className="field">
          <div className="label-row">
            <label htmlFor="tags">Tags <span className="hint">separate with commas</span></label>
            <button type="button" className="btn btn-ai" onClick={suggestTags} disabled={ai.tags}><Sparkle size={14} /> {ai.tags ? "Thinking…" : "Suggest tags"}</button>
          </div>
          <input id="tags" value={form.tags} onChange={set("tags")} placeholder="e.g. protein, snack, gym" />
          {fieldErr("tags") && <span className="err">{fieldErr("tags")}</span>}
        </div>
        {ai.note && <p className="ainote-line" role="status">{ai.note}</p>}

        <div className="row end">
          <Link className="btn btn-outline" to={editing ? `/products/${id}` : "/"}>Cancel</Link>
          <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add product"}</button>
        </div>
      </form>
    </div>
  );
}
