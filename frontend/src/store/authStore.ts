import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Usuario } from '../types';

interface AuthState {
  user: Usuario | null;
  setUser: (user: Usuario | null) => void;
  login: (user: Usuario) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  isProductManager: () => boolean;
  isPedidosStaff: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      isAdmin: () => !!get().user?.roles?.includes('ADMIN'),
      isStaff: () =>
        (get().user?.roles ?? []).some(
          (r) => r === 'ADMIN' || r === 'STOCK' || r === 'PEDIDOS'
        ),
      isProductManager: () =>
        (get().user?.roles ?? []).some((r) => r === 'ADMIN' || r === 'STOCK'),
      isPedidosStaff: () =>
        (get().user?.roles ?? []).some((r) => r === 'ADMIN' || r === 'PEDIDOS'),
    }),
    {
      name: 'auth-storage',
      // Solo persistir info del usuario para evitar el flash al recargar.
      // El accessToken vive en cookie HttpOnly — NO almacenar en localStorage (XSS).
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// Selectores con suscripción granular (evitan re-renders innecesarios)
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAdmin = () => useAuthStore((s) => s.user?.roles?.includes('ADMIN'));
export const useIsAuthenticated = () => useAuthStore((s) => s.user !== null);
