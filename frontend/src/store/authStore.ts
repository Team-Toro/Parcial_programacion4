import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Usuario } from '../types';

interface AuthState {
  user: Usuario | null;
  setUser: (user: Usuario | null) => void;
  login: (user: Usuario) => void;
  logout: () => void;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      isAdmin: () => !!get().user?.roles?.includes('ADMIN'),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Selectores con suscripción granular (evitan re-renders innecesarios)
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAdmin = () => useAuthStore((s) => s.user?.roles?.includes('ADMIN'));
export const useIsAuthenticated = () => useAuthStore((s) => s.user !== null);
