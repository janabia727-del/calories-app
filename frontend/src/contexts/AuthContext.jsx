import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip /me. AuthCallback handles session.
    if (typeof window !== "undefined" && window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };
  const register = async (payload) => {
    const res = await api.post("/auth/register", payload);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };
  const logout = async () => {
    try { await api.post("/auth/logout"); }
    catch (err) { console.error("Logout request failed", err); }
    setToken(null);
    setUser(null);
  };
  const refresh = checkAuth;

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
