import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getMe } from '../../api/auth';

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // Solo busca el usuario si hay token pero el store no lo tiene aún
  // (ej: token persistido pero página refrescada antes de que el user se hidratase)
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: !!token && !user,
    retry: false,
  });

  // Hidratar el store cuando llegue la respuesta
  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  // Sin token → a login
  if (!token) return <Navigate to="/login" replace />;

  // Hay token pero todavía no tenemos el user: esperar getMe
  if (isLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Cargando...</p>
      </div>
    );
  }

  return <Outlet />;
}
