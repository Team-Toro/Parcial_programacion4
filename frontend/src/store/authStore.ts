import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Usuario } from '../types';

interface AuthState {
  token: string | null;
  user: Usuario | null;
  setToken: (token: string | null) => void;
  setUser: (user: Usuario | null) => void;
  login: (token: string, user: Usuario) => void;
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
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      isAdmin: () => !!get().user?.roles?.includes('ADMIN'),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

// Para leer el token fuera de componentes React
export const getAuthToken = (): string | null => useAuthStore.getState().token;

// Selectores con suscripción granular (evitan re-renders innecesarios)
export const useUser = () => useAuthStore((s) => s.user);
export const useToken = () => useAuthStore((s) => s.token);
export const useIsAdmin = () => useAuthStore((s) => s.user?.role === 'admin');
export const useIsAuthenticated = () => useAuthStore((s) => !!s.token);
