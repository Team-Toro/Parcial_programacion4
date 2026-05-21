import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const STAFF_ROLES = ['ADMIN', 'PEDIDOS'];

export default function StaffRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user?.roles?.some((r) => STAFF_ROLES.includes(r))) {
    return <Navigate to="/productos" replace />;
  }
  return <Outlet />;
}
