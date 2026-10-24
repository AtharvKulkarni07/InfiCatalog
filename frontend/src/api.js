import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
const KEY = "catalog.tokens";

// Tokens live in localStorage (simple + survives refresh). Trade-off documented in the README.
export const tokens = {
  read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  },
  write(t) {
    try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* storage unavailable */ }
  },
  clear() {
    try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
  },
};

export const api = axios.create({ baseURL: API_URL, timeout: 60000 });

api.interceptors.request.use((config) => {
  const { access } = tokens.read();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (!config) return Promise.reject(error);

    const url = config?.url || "";
    const isAuthCall = /\/auth\/(login|register|refresh)/.test(url);

    // Automatic retry for transient cold starts or network drop on GET requests
    const isColdBootOrNetwork = !response || response.status === 502 || response.status === 503 || error.code === "ECONNABORTED";
    if (isColdBootOrNetwork && !config._networkRetried && config.method?.toLowerCase() === "get") {
      config._networkRetried = true;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return api(config);
    }

    if (response?.status === 401 && !isAuthCall && tokens.read().access) {
      const { refresh } = tokens.read();
      if (refresh && !config._retried) {
        config._retried = true;
        try {
          refreshing = refreshing || axios.post(`${API_URL}/auth/refresh/`, { refresh }).finally(() => { refreshing = null; });
          const { data } = await refreshing;
          tokens.write({ ...tokens.read(), access: data.access });
          config.headers.Authorization = `Bearer ${data.access}`;
          return api(config);
        } catch { /* fall through to logout */ }
      }
      tokens.clear();
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(error);
  }
);

let cachedFacets = null;
let facetsPromise = null;
export async function getCachedFacets(category = "") {
  if (category) {
    const res = await api.get(`/products/facets/?category=${encodeURIComponent(category)}`);
    return res.data;
  }
  if (cachedFacets) return cachedFacets;
  if (!facetsPromise) {
    facetsPromise = api.get("/products/facets/").then((r) => {
      cachedFacets = r.data;
      facetsPromise = null;
      return cachedFacets;
    }).catch((e) => {
      facetsPromise = null;
      throw e;
    });
  }
  return facetsPromise;
}

export function invalidateCachedFacets() {
  cachedFacets = null;
}

/** Normalise any failure into { message, fields } for the UI. */
export function parseError(err) {
  if (err?.code === "ERR_CANCELED") return { message: "", fields: {} };
  if (!err?.response) return { message: "Server is waking up or connection was interrupted. Please retry in a few seconds.", fields: {} };
  const e = err.response.data?.error;
  if (e) {
    const fields = e.details && typeof e.details === "object" ? e.details : {};
    return { message: e.message || "Request failed.", fields };
  }
  return { message: "Something went wrong. Please try again.", fields: {} };
}

export const firstError = (fields, name) => {
  const v = fields?.[name];
  return Array.isArray(v) ? v[0] : v || "";
};

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const formatPrice = (value) => inr.format(Number(value));
