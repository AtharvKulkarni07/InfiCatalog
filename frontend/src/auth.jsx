import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokens } from "./api.js";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!tokens.read().access) {
      setReady(true);
    } else {
      api.get("/auth/me/")
        .then((r) => alive && setUser(r.data))
        .catch(() => tokens.clear())
        .finally(() => alive && setReady(true));
    }
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => {
      alive = false;
      window.removeEventListener("auth:logout", onLogout);
    };
  }, []);

  const finish = useCallback(({ access, refresh, user }) => {
    tokens.write({ access, refresh });
    setUser(user);
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post("/auth/login/", { username, password });
    finish(data);
  }, [finish]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register/", payload);
    finish(data);
  }, [finish]);

  const logout = useCallback(() => {
    tokens.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout }), [user, ready, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
