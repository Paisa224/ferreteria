import { create } from "zustand";
import type { MeResponse } from "./auth.types";
import { apiLogin, apiMe } from "./auth.api";

type AuthState = {
  token: string | null;
  me: MeResponse | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loadMe: () => Promise<void>;
  logout: () => void;
  hasPerm: (perm: string) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("access_token"),
  me: null,
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      const res = await apiLogin(username, password);
      localStorage.setItem("access_token", res.access_token);
      set({ token: res.access_token });
      await get().loadMe();
    } finally {
      set({ isLoading: false });
    }
  },

  loadMe: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      set({ token: null, me: null });
      return;
    }
    const me = await apiMe();
    set({ token, me });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    set({ token: null, me: null });
  },

  hasPerm: (perm) => {
    const me = get().me;
    return !!me?.permissions?.includes(perm);
  },
}));
