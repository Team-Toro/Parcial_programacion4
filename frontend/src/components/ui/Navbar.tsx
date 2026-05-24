import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, ShoppingCart } from 'lucide-react';
import { logoutBackend } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { useCarritoStore } from '../../store/carritoStore';

interface NavLink {
  to: string;
  label: string;
  adminOnly: boolean;
  staffOnly: boolean;
  hideForAdmin?: boolean;
  authRequired?: boolean;
}

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const isStaff = useAuthStore((s) => s.isStaff());
  const totalCarrito = useCarritoStore((s) => s.totalItems());

  const handleLogout = async () => {
    await logoutBackend();
    logout();
    queryClient.clear();
    navigate('/login');
  };

  const links: NavLink[] = [
    { to: '/categorias', label: 'Categorías', adminOnly: false, staffOnly: false, authRequired: false },
    { to: '/productos', label: 'Productos', adminOnly: false, staffOnly: false, authRequired: false },
    { to: '/mis-direcciones', label: 'Mis direcciones', adminOnly: false, staffOnly: false, hideForAdmin: true, authRequired: true },
    { to: '/mis-pedidos', label: 'Mis pedidos', adminOnly: false, staffOnly: false, hideForAdmin: true, authRequired: true },
    { to: '/ingredientes', label: 'Ingredientes', adminOnly: true, staffOnly: false, authRequired: true },
    { to: '/admin/usuarios', label: 'Usuarios', adminOnly: true, staffOnly: false, authRequired: true },
    { to: '/admin/pedidos', label: 'Pedidos', adminOnly: false, staffOnly: true, authRequired: true },
  ];

  return (
    <nav className="bg-slate-900 text-white px-8 py-4 flex items-center gap-8 shadow-lg">
      <span className="font-bold text-xl text-orange-400 tracking-tight">🍽 Food Store</span>

      <div className="flex gap-4 flex-1">
        {links
          .filter(
            (l) =>
              (!l.authRequired || !!user) &&
              (!l.adminOnly || isAdmin) &&
              (!l.staffOnly || isStaff) &&
              (!l.hideForAdmin || !isAdmin)
          )
          .map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname.startsWith(l.to)
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {l.label}
            </Link>
          ))}
      </div>

      {user ? (
        <div className="flex items-center gap-3">
          {/* Carrito badge — oculto para staff */}
          {!isStaff && (
            <Link
              to="/carrito"
              className="relative flex items-center text-slate-300 hover:text-white hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              title="Carrito"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalCarrito > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
                  {totalCarrito > 99 ? '99+' : totalCarrito}
                </span>
              )}
            </Link>
          )}

          <span className="text-sm text-slate-300">
            Hola, <span className="font-medium text-white">{user.first_name || user.email}</span>
            {isAdmin && (
              <span className="ml-2 text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded font-semibold">Admin</span>
            )}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-slate-300 hover:text-white hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors font-medium"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
          >
            Registrarse
          </Link>
        </div>
      )}
    </nav>
  );
}
