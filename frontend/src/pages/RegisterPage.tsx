import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { UserPlus, User, Lock, Mail, IdCard, Loader2 } from 'lucide-react';
import { register, login, getMe } from '../api/auth';
import { useAuthStore } from '../store/authStore';

interface FieldErrors {
  first_name?: string;
  last_name?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  celular?: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: async () => {
      // Login automático tras registro exitoso
      const loginData = await login({ username: email, password });
      useAuthStore.getState().setToken(loginData.access_token);
      const user = await getMe();
      useAuthStore.getState().login(loginData.access_token, loginData.refresh_token, user);
      const isAdmin = user.roles?.includes('ADMIN');
      navigate(isAdmin ? '/admin/usuarios' : '/productos');
    },
  });

  const validate = (): boolean => {
    const errors: FieldErrors = {};
    if (!firstName.trim()) {
      errors.first_name = 'El nombre es obligatorio';
    }
    if (!lastName.trim()) {
      errors.last_name = 'El apellido es obligatorio';
    }
    if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (!email.trim()) {
      errors.email = 'El email es obligatorio';
    } else if (!email.includes('@')) {
      errors.email = 'Ingresá un email válido';
    }
    if (!celular.trim()) {
      errors.celular = 'El celular es obligatorio';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      first_name: firstName,
      last_name: lastName,
      email,
      celular,
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

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ej: Juan"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                  fieldErrors.first_name ? 'border-red-400' : 'border-slate-300'
                }`}
              />
            </div>
            {fieldErrors.first_name && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.first_name}</p>
            )}
          </div>

          {/* Apellido */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Apellido *
            </label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ej: Garcia"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                  fieldErrors.last_name ? 'border-red-400' : 'border-slate-300'
                }`}
              />
            </div>
            {fieldErrors.last_name && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.last_name}</p>
            )}
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

          {/* Celular */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Celular
            </label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                placeholder="Ej: 1133334444"
                className={`w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                  fieldErrors.celular ? 'border-red-400' : 'border-slate-300'
                }`}
              />
            </div>
            {fieldErrors.celular && (
              <p className="text-red-600 text-xs mt-1">{fieldErrors.celular}</p>
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
