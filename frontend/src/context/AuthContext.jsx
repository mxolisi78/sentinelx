import { createContext, useContext, useEffect, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: if a token exists, try to fetch the current user
  useEffect(() => {
    const token = localStorage.getItem("sentinelx_access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    client
      .get("/auth/me/")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("sentinelx_access_token");
        localStorage.removeItem("sentinelx_refresh_token");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const res = await client.post("/auth/login/", { username, password });
    const { access, refresh } = res.data;
    localStorage.setItem("sentinelx_access_token", access);
    localStorage.setItem("sentinelx_refresh_token", refresh);

    const me = await client.get("/auth/me/");
    setUser(me.data);
    return me.data;
  }

  function logout() {
    localStorage.removeItem("sentinelx_access_token");
    localStorage.removeItem("sentinelx_refresh_token");
    setUser(null);
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
}