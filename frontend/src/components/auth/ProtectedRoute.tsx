import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getMe } from '../../api/auth';
import { isAuthError } from './authErrors';
import { refreshSession } from './refreshSession';

export default function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [isRecovering, setIsRecovering] = useState(false);
  const isRecoveringRef = useRef(false);

  // Si no hay usuario en el store, intenta recuperarlo via cookie (page refresh)
  const { data, isLoading, error } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: !user,
    retry: (failureCount, err) => !isAuthError(err) && failureCount < 2,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2000),
    staleTime: 30_000,
  });

  const effectiveUser = user ?? data ?? null;

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  useEffect(() => {
    if (!error || !isAuthError(error)) return;
    if (isRecoveringRef.current) return;
    isRecoveringRef.current = true;
    setIsRecovering(true);

    refreshSession()
      .then((recovered) => {
        if (recovered) setUser(recovered);
        else setUser(null);
      })
      .finally(() => {
        isRecoveringRef.current = false;
        setIsRecovering(false);
      });
  }, [error, setUser]);

  // Sin usuario y sin carga en progreso → sin sesión → a login
  if (!effectiveUser && !isLoading && !isRecovering) return <Navigate to="/login" replace />;

  // Recuperando usuario desde cookie
  if ((isLoading || isRecovering) && !effectiveUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  return <Outlet />;
}
