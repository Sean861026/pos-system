import { create } from 'zustand';
import type { User } from '../types';
import { authApi } from '../api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('pos_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    const res = await authApi.login(email, password);
    const { token, user } = res.data;
    localStorage.setItem('pos_token', token);
    set({ token, user, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('pos_token');
    set({ user: null, token: null });
  },

  loadUser: async () => {
    const token = localStorage.getItem('pos_token');
    if (!token) return;
    try {
      const res = await authApi.me();
      set({ user: res.data });
    } catch {
      localStorage.removeItem('pos_token');
      set({ user: null, token: null });
    }
  },
}));
