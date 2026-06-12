import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .getMe()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem("authToken");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { token, user } = await api.login(username, password);
    localStorage.setItem("authToken", token);
    setUser(user);
    return user;
  };

  const register = async (username, password) => {
    const { token, user } = await api.register(username, password);
    localStorage.setItem("authToken", token);
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setUser(null);
  };

  const refreshUser = async () => {
    const u = await api.getMe();
    setUser(u);
    return u;
  };

  const updateBalance = (balance) => {
    setUser((prev) => (prev ? { ...prev, balance } : prev));
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser, updateBalance }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
