import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, formatPrice, parseError } from "../api.js";
import { useAuth } from "../auth.jsx";
import { Sparkle } from "../components/Icons.jsx";
import Pagination from "../components/Pagination.jsx";
import ProductCard from "../components/ProductCard.jsx";
import { Empty, ErrorBox, SkeletonGrid } from "../components/States.jsx";
import { useToast } from "../components/Toast.jsx";

const PAGE_SIZE = 12;
const SORTS = [
  { value: "", label: "Newest first" },
  { value: "price", label: "Price: low to high" },
  { value: "-price", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
  { value: "-name", label: "Name: Z to A" },
];
const FILTER_KEYS = ["search", "category", "brand", "min_price", "max_price", "mine"];

function describeFilters(f) {
  const chips = [];
  if (f.category) chips.push(`Category: ${f.category}`);
  if (f.brand) chips.push(`Brand: ${f.brand}`);
  if (f.search) chips.push(`Keywords: ${f.search}`);
  if (f.min_price != null) chips.push(`Over ${formatPrice(f.min_price)}`);
  if (f.max_price != null) chips.push(`Under ${formatPrice(f.max_price)}`);
  if (f.ordering) chips.push(SORTS.find((s) => s.value === f.ordering)?.label || f.ordering);
  return chips;
}

export default function Products() {
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const queryString = params.toString();
  const page = Number(params.get("page")) || 1;

  const [facets, setFacets] = useState({ categories: [], brands: [] });
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [tick, setTick] = useState(0);
  const [q, setQ] = useState(params.get("search") || "");
  const [smart, setSmart] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [price, setPrice] = useState({ min: params.get("min_price") || "", max: params.get("max_price") || "" });

  const update = useCallback((patch) => {
    setAiNote(null);
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => (v === "" || v == null ? next.delete(k) : next.set(k, String(v))));
      if (!("page" in patch)) next.delete("page");
      return next;
    });
  }, [setParams]);

  // facets for the dropdowns
  useEffect(() => {
    api.get("/products/facets/").then((r) => setFacets(r.data)).catch(() => {});
  }, []);

  // load products whenever the URL query changes
  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, status: "loading", error: "" }));
    api.get("/products/", { params: Object.fromEntries(new URLSearchParams(queryString)), signal: ctrl.signal })
      .then((r) => setState({ status: "ready", data: r.data, error: "" }))
      .catch((e) => {
        if (e.response?.status === 404 && page > 1) return update({ page: "" }); // page out of range
        const { message } = parseError(e);
        if (message) setState({ status: "error", data: null, error: message });
      });
    return () => ctrl.abort();
  }, [queryString, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep local inputs in sync with the URL (back/forward, AI search, clear)
  useEffect(() => {
    if (!smart) setQ(params.get("search") || "");
    setPrice({ min: params.get("min_price") || "", max: params.get("max_price") || "" });
  }, [queryString]); // eslint-disable-line react-hooks/exhaustive-deps

  // debounce keyword typing
  useEffect(() => {
    if (smart || q.trim() === (params.get("search") || "")) return;
    const t = setTimeout(() => update({ search: q.trim() }), 400);
    return () => clearTimeout(t);
  }, [q, smart]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchMode = (on) => { setSmart(on); setQ(on ? "" : params.get("search") || ""); };

  const runSmart = async (e) => {
    e.preventDefault();
    const text = q.trim();
    if (!text) return;
    setAiBusy(true);
    try {
      const { data } = await api.post("/ai/search/", { query: text });
      const next = new URLSearchParams();
      Object.entries(data.filters || {}).forEach(([k, v]) => next.set(k, String(v)));
      setParams(next);
      setAiNote({ chips: describeFilters(data.filters || {}), source: data.source, text });
    } catch (err) {
      toast(parseError(err).message || "Smart search failed.", "error");
    } finally {
      setAiBusy(false);
    }
  };

  const applyPrice = () => {
    let { min, max } = price;
    if (min !== "" && max !== "" && Number(min) > Number(max)) [min, max] = [max, min];
    update({ min_price: min, max_price: max });
  };

  const hasFilters = FILTER_KEYS.some((k) => params.get(k));
  const clearAll = () => { setAiNote(null); setQ(""); setParams(new URLSearchParams()); };
  const total = state.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <section className="page-head">
        <div>
          <h1>Product catalog</h1>
          <p className="sub">Search by keyword, or describe what you need and let AI set the filters.</p>
        </div>
        {user && <Link className="btn btn-primary" to="/products/new">Add product</Link>}
      </section>

      <form className={`searchbar ${smart ? "is-smart" : ""}`} role="search" onSubmit={smart ? runSmart : (e) => e.preventDefault()}>
        <div className="modes" role="group" aria-label="Search mode">
          <button type="button" aria-pressed={!smart} className={!smart ? "on" : ""} onClick={() => switchMode(false)}>Keyword</button>
          <button type="button" aria-pressed={smart} className={smart ? "on" : ""} onClick={() => switchMode(true)}><Sparkle size={14} /> Smart search</button>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={smart ? "Describe what you're looking for" : "Search products"}
          placeholder={smart ? 'Try "cheap snacks under 200" or "SonicWave headphones"' : "Search by name, brand or category"}
        />
        {smart && <button className="btn btn-accent" disabled={aiBusy || !q.trim()}>{aiBusy ? "Thinking…" : "Find"}</button>}
      </form>

      {aiNote && (
        <div className="ainote" role="status">
          <span className="ai-label"><Sparkle size={14} /> Understood “{aiNote.text}” as</span>
          {aiNote.chips.length ? aiNote.chips.map((c) => <span className="chip" key={c}>{c}</span>) : <span className="chip">no filters, showing everything</span>}
          <span className="src">{aiNote.source === "llm" ? "via Gemini" : "via built-in rules"}</span>
        </div>
      )}

      <button className="btn btn-outline filters-toggle" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
        {filtersOpen ? "Hide filters" : "Show filters"}
      </button>

      <div className="layout">
        <aside className={`filters ${filtersOpen ? "open" : ""}`} aria-label="Filters">
          <label>Category
            <select value={params.get("category") || ""} onChange={(e) => update({ category: e.target.value })}>
              <option value="">All categories</option>
              {facets.categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Brand
            <select value={params.get("brand") || ""} onChange={(e) => update({ brand: e.target.value })}>
              <option value="">All brands</option>
              {facets.brands.map((b) => <option key={b}>{b}</option>)}
            </select>
          </label>
          <fieldset>
            <legend>Price (₹)</legend>
            <div className="price-row">
              <input type="number" min="0" inputMode="decimal" placeholder="Min" aria-label="Minimum price" value={price.min} onChange={(e) => setPrice({ ...price, min: e.target.value })} onKeyDown={(e) => e.key === "Enter" && applyPrice()} />
              <input type="number" min="0" inputMode="decimal" placeholder="Max" aria-label="Maximum price" value={price.max} onChange={(e) => setPrice({ ...price, max: e.target.value })} onKeyDown={(e) => e.key === "Enter" && applyPrice()} />
            </div>
            <button type="button" className="btn btn-outline block" onClick={applyPrice}>Apply price</button>
          </fieldset>
          {user && (
            <label className="check">
              <input type="checkbox" checked={params.get("mine") === "true"} onChange={(e) => update({ mine: e.target.checked ? "true" : "" })} />
              Only my products
            </label>
          )}
          {hasFilters && <button type="button" className="linkbtn" onClick={clearAll}>Clear all filters</button>}
        </aside>

        <section aria-live="polite">
          <div className="results-head">
            <p className="count">{state.status === "ready" ? `${total} ${total === 1 ? "product" : "products"}` : "\u00a0"}</p>
            <label className="sort">Sort by
              <select value={params.get("ordering") || ""} onChange={(e) => update({ ordering: e.target.value })}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>

          {state.status === "loading" && <SkeletonGrid />}
          {state.status === "error" && <ErrorBox message={state.error} onRetry={() => setTick((t) => t + 1)} />}
          {state.status === "ready" && total === 0 && (
            hasFilters ? (
              <Empty title="No products match these filters">
                Try removing a filter or searching for something broader.{" "}
                <button className="linkbtn" onClick={clearAll}>Clear all filters</button>
              </Empty>
            ) : (
              <Empty title="The catalog is empty">
                {user ? <>Add the first product to get started. <Link to="/products/new">Add product</Link></> : <><Link to="/login">Sign in</Link> to add the first product.</>}
              </Empty>
            )
          )}
          {state.status === "ready" && total > 0 && (
            <>
              <div className="grid">{state.data.results.map((p) => <ProductCard key={p.id} product={p} />)}</div>
              <Pagination page={page} totalPages={totalPages} onChange={(p) => { update({ page: p }); window.scrollTo({ top: 0 }); }} />
            </>
          )}
        </section>
      </div>
    </>
  );
}
