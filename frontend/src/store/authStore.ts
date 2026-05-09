import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Usuario } from '../types';

interface AuthState {
  token: string | null;
  user: Usuario | null;
  setToken: (token: string | null) => void;
  setUser: (user: Usuario | null) => void;
  logout: () => void;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      isAdmin: () => get().user?.role === 'admin',
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

// Para leer el token fuera de componentes React
export const getAuthToken = (): string | null => useAuthStore.getState().token;
