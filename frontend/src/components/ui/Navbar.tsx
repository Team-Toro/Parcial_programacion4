import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore((s) => s.isAdmin());

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login');
  };

  const links = [
    { to: '/categorias', label: 'Categorías', adminOnly: false },
    { to: '/ingredientes', label: 'Ingredientes', adminOnly: true },
    { to: '/productos', label: 'Productos', adminOnly: false },
  ];

  return (
    <nav className="bg-slate-900 text-white px-8 py-4 flex items-center gap-8 shadow-lg">
      <span className="font-bold text-xl text-orange-400 tracking-tight">🍽 Food Store</span>

      <div className="flex gap-4 flex-1">
        {links
          .filter(l => !l.adminOnly || isAdmin)
          .map(l => (
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

      {user && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300">
            Hola, <span className="font-medium text-white">{user.full_name?.split(' ')[0] || user.username}</span>
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
      )}
    </nav>
  );
}
