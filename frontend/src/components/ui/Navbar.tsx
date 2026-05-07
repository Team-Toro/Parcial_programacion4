import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/categorias', label: 'Categorías' },
  { to: '/ingredientes', label: 'Ingredientes' },
  { to: '/productos', label: 'Productos' },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    queryClient.clear();
    navigate('/login');
  };

  const isActive = (to: string) => pathname.startsWith(to);

  return (
    <nav className="bg-slate-900 text-white shadow-lg">
      <div className="px-4 sm:px-8 py-4 flex items-center gap-4 sm:gap-8">
        <span className="font-bold text-xl text-orange-400 tracking-tight whitespace-nowrap">
          🍽 Food Store
        </span>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden ml-auto p-2 text-slate-300 hover:text-white"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <div className="hidden sm:flex gap-4 flex-1">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.to)
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {user && (
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-sm text-slate-300">
              Hola, <span className="font-medium text-white">{user.full_name?.split(' ')[0] || user.username}</span>
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
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-slate-700 px-4 pb-4 pt-2 flex flex-col gap-1">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.to)
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700">
              <span className="text-sm text-slate-300">
                {user.full_name?.split(' ')[0] || user.username}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-red-400 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
