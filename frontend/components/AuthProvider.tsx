"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, API_BASE } from "@/lib/api"; // ← import API_BASE too


type Me = {
  authenticated: boolean;
  twofa_ok?: boolean;
  user?: { id: number; email: string; name?: string; picture?: string; totp_enabled?: boolean };
};

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  refresh: () => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try { setMe(await api<Me>("/auth/me")); }
    catch { setMe({ authenticated: false }); }
    finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

function loginWithGoogle() {
  // Full page redirect to backend login **via the proxy base**
  window.location.href = `${API_BASE}/auth/google/login`;
}

  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); }
    finally { await refresh(); }
  }

  return (
    <Ctx.Provider value={{ me, loading, refresh, loginWithGoogle, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider />");
  return v;
}