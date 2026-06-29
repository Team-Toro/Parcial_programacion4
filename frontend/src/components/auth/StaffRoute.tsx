import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getMe } from '../../api/auth';
import { isAuthError } from './authErrors';
import { refreshSession } from './refreshSession';

const STAFF_ROLES = ['ADMIN', 'PEDIDOS', 'STOCK'];

export default function StaffRoute() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  const [isRecovering, setIsRecovering] = useState(false);
  const isRecoveringRef = useRef(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: true,
    retry: (failureCount, err) => !isAuthError(err) && failureCount < 2,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2000),
    staleTime: 5 * 60 * 1000,
  });

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

  const effectiveUser = user ?? data ?? null;

  if (!effectiveUser && (isLoading || isRecovering)) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Verificando sesión...</p>
      </div>
    );
  }

  if (!effectiveUser?.roles?.some((r) => STAFF_ROLES.includes(r))) {
    return <Navigate to="/productos" replace />;
  }
  return <Outlet />;
}
