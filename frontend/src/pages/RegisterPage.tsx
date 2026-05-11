import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { UserPlus, User, Lock, Mail, IdCard, Loader2 } from 'lucide-react';
import { register, login, getMe } from '../api/auth';
import { useAuthStore } from '../store/authStore';

interface FieldErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: async () => {
      // Login automático tras registro exitoso
      const loginData = await login({ username, password });
      useAuthStore.getState().setToken(loginData.access_token);
      const user = await getMe();
      useAuthStore.getState().login(loginData.access_token, user);
      navigate('/ingredientes');
    },
  });

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!username.trim()) {
      errors.username = 'El usuario es obligatorio';
    }
    if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (email && !email.includes('@')) {
      errors.email = 'Ingresá un email válido';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      username,
      full_name: fullName || undefined,
      email: email || undefined,
      password,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">

        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
            <UserPlus className="w-6 h-6 text-orange-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Crear cuenta</h1>
          <p className="text-slate-500 text-sm mt-1">Completá el formulario para registrarte</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mutation.error && (
            <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">
              {mutation.error.message}
            </p>
          )}

          {/* Usuario */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Usuario *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej: juan123"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                  fieldErrors.username ? 'border-red-400' : 'border-slate-300'
                }`}
              />
            </div>
            {fieldErrors.username && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.username}</p>
            )}
          </div>

          {/* Nombre completo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre completo
            </label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan García"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej: juan@email.com"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                  fieldErrors.email ? 'border-red-400' : 'border-slate-300'
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: undefined })); }}
                placeholder="Mínimo 8 caracteres"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                  fieldErrors.password ? 'border-red-400' : 'border-slate-300'
                }`}
              />
            </div>
            {fieldErrors.password && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmar contraseña *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí tu contraseña"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                  fieldErrors.confirmPassword ? 'border-red-400' : 'border-slate-300'
                }`}
              />
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 mt-2"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {mutation.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-orange-500 hover:underline font-medium">
            Iniciá sesión
          </Link>
        </p>

      </div>
    </div>
  );
}
