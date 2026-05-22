import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LogIn, User, Lock, Loader2 } from 'lucide-react';
import { login, getMe } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async () => {
      // Las cookies ya fueron seteadas por el servidor — solo traemos el perfil
      const user = await getMe();
      useAuthStore.getState().login(user);
      const isAdmin = user.roles?.includes('ADMIN');
      navigate(isAdmin ? '/admin/usuarios' : '/productos');
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

      </div>
    </div>
  );
}
