import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, formatPrice, parseError } from "../api.js";
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
const FILTER_KEYS = ["search", "category", "brand", "min_price", "max_price", "tags", "exclude"];

const QUICK_SUGGESTIONS = [
  { label: "⚡ Morning workout energy", prompt: "something for morning workout energy" },
  { label: "🧴 Anti-dandruff care", prompt: "dry scalp and dandruff" },
  { label: "🍽️ Clean oily utensils", prompt: "clean oily utensils" },
  { label: "🍃 Sugar-free drinks", prompt: "drinks without sugar" },
  { label: "💻 Late night snacks", prompt: "crispy snacks under 150" },
];

function describeFilters(f) {
  const chips = [];
  if (f.category) chips.push({ key: "category", label: `Category: ${f.category}` });
  if (f.brand) chips.push({ key: "brand", label: `Brand: ${f.brand}` });
  if (f.tags) {
    const list = Array.isArray(f.tags) ? f.tags : String(f.tags).split(",");
    list.map((t) => t.trim()).filter(Boolean).forEach((t) => chips.push({ key: "tags", val: t, label: `#${t}` }));
  }
  if (f.search) chips.push({ key: "search", label: `Keyword: "${f.search}"` });
  if (f.exclude) {
    const list = Array.isArray(f.exclude) ? f.exclude : String(f.exclude).split(",");
    list.map((e) => e.trim()).filter(Boolean).forEach((e) => chips.push({ key: "exclude", val: e, label: `No: ${e}` }));
  }
  if (f.min_price != null && f.min_price !== "") chips.push({ key: "min_price", label: `Over ${formatPrice(f.min_price)}` });
  if (f.max_price != null && f.max_price !== "") chips.push({ key: "max_price", label: `Under ${formatPrice(f.max_price)}` });
  if (f.ordering) chips.push({ key: "ordering", label: SORTS.find((s) => s.value === f.ordering)?.label || f.ordering });
  return chips;
}

export default function Catalog() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const queryString = params.toString();
  const page = Number(params.get("page")) || 1;

  const [facets, setFacets] = useState({ categories: [], brands: [], category_brands: {} });
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [tick, setTick] = useState(0);
  const [q, setQ] = useState(params.get("search") || "");
  const [smart, setSmart] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [price, setPrice] = useState({ min: params.get("min_price") || "", max: params.get("max_price") || "" });

  const selectedCategory = params.get("category") || "";

  const sortedCategories = useMemo(() => {
    const set = new Set((facets.categories || []).map((c) => c?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [facets.categories]);

  const availableBrands = useMemo(() => {
    let list = [];
    if (!selectedCategory) {
      list = facets.brands || [];
    } else if (facets.category_brands) {
      const matchKey = Object.keys(facets.category_brands).find(
        (k) => k.toLowerCase() === selectedCategory.toLowerCase()
      );
      list = matchKey ? facets.category_brands[matchKey] : [];
    } else {
      list = facets.brands || [];
    }
    const set = new Set(list.map((b) => b?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [selectedCategory, facets]);

  const update = useCallback((patch) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => (v === "" || v == null ? next.delete(k) : next.set(k, String(v))));
      if (!("page" in patch)) next.delete("page");
      return next;
    });
  }, [setParams]);

  const removeFilter = (key, val) => {
    if (key === "tags" && val) {
      const current = (params.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean);
      const remaining = current.filter((t) => t.toLowerCase() !== val.toLowerCase());
      update({ tags: remaining.join(",") });
    } else if (key === "exclude" && val) {
      const current = (params.get("exclude") || "").split(",").map((e) => e.trim()).filter(Boolean);
      const remaining = current.filter((e) => e.toLowerCase() !== val.toLowerCase());
      update({ exclude: remaining.join(",") });
    } else {
      update({ [key]: "" });
    }
  };

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    const currentBrand = params.get("brand") || "";
    let shouldClearBrand = false;
    if (newCat && facets.category_brands) {
      const matchKey = Object.keys(facets.category_brands).find(
        (k) => k.toLowerCase() === newCat.toLowerCase()
      );
      const catBrands = matchKey ? facets.category_brands[matchKey] : [];
      if (currentBrand && !catBrands.some((b) => b.toLowerCase() === currentBrand.toLowerCase())) {
        shouldClearBrand = true;
      }
    }
    update({ category: newCat, ...(shouldClearBrand ? { brand: "" } : {}), page: "" });
  };

  useEffect(() => {
    api.get("/products/facets/").then((r) => setFacets(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setState((s) => ({ ...s, status: "loading", error: "" }));
    api.get("/products/", { params: Object.fromEntries(new URLSearchParams(queryString)), signal: ctrl.signal })
      .then((r) => setState({ status: "ready", data: r.data, error: "" }))
      .catch((e) => {
        if (e.response?.status === 404 && page > 1) return update({ page: "" });
        const { message } = parseError(e);
        if (message) setState({ status: "error", data: null, error: message });
      });
    return () => ctrl.abort();
  }, [queryString, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!smart) setQ(params.get("search") || "");
    setPrice({ min: params.get("min_price") || "", max: params.get("max_price") || "" });
  }, [queryString]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (smart || q.trim() === (params.get("search") || "")) return;
    const t = setTimeout(() => update({ search: q.trim() }), 400);
    return () => clearTimeout(t);
  }, [q, smart]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchMode = (on) => { setSmart(on); setQ(on ? "" : params.get("search") || ""); };

  const runSmart = async (e, directText = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const text = (directText != null ? directText : q).trim();
    if (!text) return;
    if (directText != null) setQ(text);
    setAiBusy(true);
    try {
      const { data } = await api.post("/ai/search/", { query: text });
      const next = new URLSearchParams();
      Object.entries(data.filters || {}).forEach(([k, v]) => {
        if (v !== "" && v != null) next.set(k, String(v));
      });
      setParams(next);
      setAiNote({
        filters: data.filters || {},
        reasoning: data.reasoning || "",
        source: data.source,
        text,
      });
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
          <div className="kicker">GLOBAL PRODUCT CATALOG</div>
          <h1>Explore Global Catalog</h1>
          <p className="sub">Browse all products from our community — no account needed.</p>
        </div>
        <Link className="btn btn-yellow" to="/register">
          Add your products ↗
        </Link>
      </section>

      <form className={`searchbar ${smart ? "is-smart" : ""}`} role="search" onSubmit={smart ? (e) => runSmart(e) : (e) => e.preventDefault()}>
        <div className="modes" role="group" aria-label="Search mode">
          <button type="button" aria-pressed={!smart} className={!smart ? "on" : ""} onClick={() => switchMode(false)}>Keyword</button>
          <button type="button" aria-pressed={smart} className={smart ? "on" : ""} onClick={() => switchMode(true)}><Sparkle size={14} /> Smart search</button>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={smart ? "Describe what you're looking for" : "Search products"}
          placeholder={smart ? 'Try "morning workout energy" or "clean oily utensils" or "sugar-free drinks"' : "Search by name, brand or category"}
        />
        {smart && <button className="btn btn-yellow" disabled={aiBusy || !q.trim()}>{aiBusy ? "Thinking…" : <>Find <span className="arrow">↗</span></>}</button>}
      </form>

      {smart && (
        <div className="search-suggestions" aria-label="Quick smart search prompts">
          <span className="suggestion-label">Try asking:</span>
          {QUICK_SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              type="button"
              className="suggestion-pill"
              onClick={() => runSmart(null, s.prompt)}
              disabled={aiBusy}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {aiNote && (
        <div className="ainote" role="status">
          <div className="ainote-header">
            <span className="ai-label">
              <Sparkle size={15} /> AI Search Intent
            </span>
            <span className="src">
              {aiNote.source === "llm" ? "✦ Gemini 3.5" : "✦ Rule Engine"}
            </span>
          </div>

          {aiNote.reasoning && (
            <div className="ainote-reasoning">
              {aiNote.reasoning}
            </div>
          )}

          <div className="ainote-chips">
            {describeFilters(aiNote.filters || {}).length ? (
              describeFilters(aiNote.filters || {}).map((c, idx) => (
                <span className="chip removable" key={`${c.key}-${c.val || idx}`}>
                  <span>{c.label}</span>
                  <button
                    type="button"
                    className="chip-remove"
                    title={`Remove ${c.label}`}
                    onClick={() => removeFilter(c.key, c.val)}
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className="chip">No restrictive filters applied</span>
            )}
          </div>
        </div>
      )}

      <button className="btn btn-outline filters-toggle" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
        {filtersOpen ? "Hide filters" : "Show filters"}
      </button>

      <div className="layout">
        <aside className={`filters ${filtersOpen ? "open" : ""}`} aria-label="Filters">
          <label>Category
            <select value={selectedCategory} onChange={handleCategoryChange}>
              <option value="">All categories</option>
              {sortedCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>Brand
            <select value={params.get("brand") || ""} onChange={(e) => update({ brand: e.target.value })}>
              <option value="">All brands</option>
              {availableBrands.map((b) => <option key={b} value={b}>{b}</option>)}
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

          {state.status === "ready" && state.data?.relaxed && (
            <div className="relaxation-banner" role="alert">
              <span className="relaxation-icon">💡</span>
              <div>
                <strong>Smart Relaxation Applied</strong>
                <p>{state.data.relaxation_note}</p>
              </div>
            </div>
          )}

          {state.status === "loading" && <SkeletonGrid />}
          {state.status === "error" && <ErrorBox message={state.error} onRetry={() => setTick((t) => t + 1)} />}
          {state.status === "ready" && total === 0 && (
            hasFilters ? (
              <Empty title="No products match these filters">
                Try removing a filter or searching for something broader.{" "}
                <button className="linkbtn" onClick={clearAll}>Clear all filters</button>
              </Empty>
            ) : (
              <Empty title="No products yet">
                Be the first to add a product. <Link to="/register">Create an account</Link>
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
