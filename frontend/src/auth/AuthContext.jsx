import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setAuthToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => localStorage.getItem("hg_token"));
  const [bootstrapped, setBootstrapped] = useState(false);

  const login = useCallback((tok, u) => {
    localStorage.setItem("hg_token", tok);
    setAuthToken(tok);
    setTokenState(tok);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("hg_token");
    setAuthToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!token) {
        setBootstrapped(true);
        return;
      }
      setAuthToken(token);
      try {
        const { data } = await api.get("/auth/me");
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) {
          localStorage.removeItem("hg_token");
          setAuthToken(null);
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    }
    boot();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, bootstrapped, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
