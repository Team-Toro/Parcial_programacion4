import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getMe } from '../../api/auth';

export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // Si no hay usuario en el store, intenta recuperarlo via cookie (page refresh)
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: !user,
    retry: false,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  // Sin usuario y sin carga en progreso → sin sesión → a login
  if (!user && !isLoading) return <Navigate to="/login" replace />;

  // Recuperando usuario desde cookie
  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Cargando...</p>
      </div>
    );
  }

  return <Outlet />;
}
