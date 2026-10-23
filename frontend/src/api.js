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

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

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
    const url = config?.url || "";
    const isAuthCall = /\/auth\/(login|register|refresh)/.test(url);
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

/** Normalise any failure into { message, fields } for the UI. */
export function parseError(err) {
  if (err?.code === "ERR_CANCELED") return { message: "", fields: {} };
  if (!err?.response) return { message: "Can't reach the server. Check your connection and try again.", fields: {} };
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
