import { create } from "zustand";
import api from "../services/api";

const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  // Called on app start — checks if we have a token and loads the user
  init: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ loading: false });
      return;
    }
    try {
      const res = await api.get("/api/auth/me");
      set({ user: res.data, loading: false });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ user: null, loading: false });
    }
  },

  login: async (username, password) => {
    const res = await api.post("/api/auth/login", { username, password });
    localStorage.setItem("access_token", res.data.access_token);
    localStorage.setItem("refresh_token", res.data.refresh_token);
    const me = await api.get("/api/auth/me");
    set({ user: me.data });
    return me.data;
  },

  register: async (username, email, password, role) => {
    const res = await api.post("/api/auth/register", { username, email, password, role });
    localStorage.setItem("access_token", res.data.access_token);
    localStorage.setItem("refresh_token", res.data.refresh_token);
    const me = await api.get("/api/auth/me");
    set({ user: me.data });
    return me.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null });
  },
}));

export default useAuthStore;
