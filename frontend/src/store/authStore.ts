import { create } from 'zustand';
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

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
  isAdmin: () => !!get().user?.roles?.includes('ADMIN'),
  isStaff: () => (get().user?.roles ?? []).some((r) => r === 'ADMIN' || r === 'STOCK' || r === 'PEDIDOS'),
  isProductManager: () => (get().user?.roles ?? []).some((r) => r === 'ADMIN' || r === 'STOCK'),
  isPedidosStaff: () => (get().user?.roles ?? []).some((r) => r === 'ADMIN' || r === 'PEDIDOS'),
}));

// Selectores con suscripción granular (evitan re-renders innecesarios)
export const useUser = () => useAuthStore((s) => s.user);
export const useIsAdmin = () => useAuthStore((s) => s.user?.roles?.includes('ADMIN'));
export const useIsAuthenticated = () => useAuthStore((s) => s.user !== null);
