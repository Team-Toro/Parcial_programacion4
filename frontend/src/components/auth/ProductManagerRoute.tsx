import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getMe } from '../../api/auth';
import { isAuthError } from './authErrors';
import { refreshSession } from './refreshSession';

const ALLOWED_ROLES = ['ADMIN', 'STOCK'];

export default function ProductManagerRoute() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [isRecovering, setIsRecovering] = useState(false);
  const isRecoveringRef = useRef(false);

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
        if (recovered) {
          setUser(recovered);
          navigate('/productos', { replace: true });
        } else {
          setUser(null);
        }
      })
      .finally(() => {
        isRecoveringRef.current = false;
        setIsRecovering(false);
      });
  }, [error, navigate, setUser]);

  if (!effectiveUser && (isLoading || isRecovering)) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  const isProductManager = !!effectiveUser?.roles?.some((r) => ALLOWED_ROLES.includes(r));
  if (!isProductManager) return <Navigate to="/productos" replace />;
  return <Outlet />;
}
