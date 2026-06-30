import { useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { getMe } from '../api/auth';
import { isAuthError } from '../components/auth/authErrors';
import { refreshSession } from '../components/auth/refreshSession';
import Navbar from '../components/ui/Navbar';
import Footer from '../components/ui/Footer';

export default function MainLayout() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const isRecoveringRef = useRef(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Intentamos recuperar la sesión vía cookie si no hay usuario en el store (útil al recargar páginas públicas)
  const { data, error } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: !user,
    retry: (failureCount, err) => !isAuthError(err) && failureCount < 2,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2000),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data, setUser]);

  useEffect(() => {
    if (!error || !isAuthError(error)) return;
    if (isRecoveringRef.current) return;
    isRecoveringRef.current = true;

    refreshSession()
      .then((recovered) => {
        if (recovered) setUser(recovered);
        else setUser(null);
      })
      .finally(() => {
        isRecoveringRef.current = false;
      });
  }, [error, setUser]);

  // Si el usuario tiene PEDIDOS pero no ADMIN ni STOCK, lo forzamos a /admin/pedidos
  const isPedidosOnly = !!user && user.roles?.includes('PEDIDOS') && !user.roles?.includes('ADMIN') && !user.roles?.includes('STOCK');

  useEffect(() => {
    if (isPedidosOnly && !pathname.startsWith('/admin/pedidos')) {
      navigate('/admin/pedidos', { replace: true });
    }
  }, [isPedidosOnly, pathname, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}


