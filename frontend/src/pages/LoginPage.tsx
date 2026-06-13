import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LogIn, User, Lock, Loader2, ChevronDown } from 'lucide-react';
import { login, getMe } from '../api/auth';
import { useAuthStore } from '../store/authStore';

const DEMO_USERS = [
  { rol: 'Admin',    email: 'admin@example.com',          password: 'Admin1234!' },
  { rol: 'Cliente',  email: 'juan@example.com',            password: 'Juan1234!' },
  { rol: 'Stock',    email: 'sofia.stock@example.com',     password: 'Sofia1234!' },
  { rol: 'Pedidos',  email: 'marcos.pedidos@example.com',  password: 'Marcos1234!' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [validationError, setValidationError] = useState('');

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      // Las cookies ya fueron seteadas por el servidor — solo traemos el perfil
      const user = await getMe();
      useAuthStore.getState().login(user);
      const roles = user.roles ?? [];
      if (roles.includes('ADMIN')) {
        navigate('/admin/usuarios');
      } else if (roles.includes('PEDIDOS')) {
        navigate('/admin/pedidos');
      } else {
        navigate('/productos');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    if (!username.trim() || !password.trim()) {
      setValidationError('Completá email y contraseña');
      return;
    }
    mutation.mutate({ username, password });
  };

  const errorMessage = validationError || mutation.error?.message;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
            <LogIn className="w-6 h-6 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Iniciar sesión</h1>
          <p className="text-slate-500 text-sm mt-1">Ingresá tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {errorMessage && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              {errorMessage}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="tu@email.com"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 mt-2"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {mutation.isPending ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-orange-500 hover:underline font-medium">
            Registrate
          </Link>
        </p>

        {/* Demo credentials */}
        <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDemo(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <span className="font-medium">Usuarios de prueba</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDemo ? 'rotate-180' : ''}`} />
          </button>
          {showDemo && (
            <div className="border-t border-slate-200 divide-y divide-slate-100">
              {DEMO_USERS.map(u => (
                <div key={u.rol} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{u.rol}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setUsername(u.email); setPassword(u.password); setShowDemo(false); }}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 font-medium transition-colors"
                  >
                    Autocompletar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
