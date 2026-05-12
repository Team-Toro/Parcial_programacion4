import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Shield, UserCog, AlertTriangle, Check, XCircle, RefreshCw } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import { useDebounce } from '../hooks/useDebounce';
import { activateUsuario, deactivateUsuario, getUsuariosAdmin, updateUsuarioRoles } from '../api/usuarios';
import type { Usuario } from '../types';

const PAGE_SIZE = 12;
const ROLE_OPTIONS = ['ADMIN', 'CLIENTE', 'STOCK', 'PEDIDOS'];

type SortField = 'id' | 'first_name' | 'last_name' | 'email';
type SortOrder = 'asc' | 'desc';
type ToastState = { type: 'success' | 'error'; message: string } | null;

export default function AdminUsuariosPage() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [disabledFilter, setDisabledFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortField>('last_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useDebounce(searchInput, 300);

  const params = {
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    q: debouncedSearch.trim() || undefined,
    role: roleFilter || undefined,
    disabled: disabledFilter === 'all' ? undefined : disabledFilter === 'disabled',
    sort: sortBy,
    order: sortOrder,
  };

  const { data: usuarios = [], isLoading, isError } = useQuery({
    queryKey: ['usuarios-admin', params],
    queryFn: () => getUsuariosAdmin(params),
    placeholderData: (prev) => prev,
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    setToastVisible(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setToastVisible(true)));
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const roleMutation = useMutation({
    mutationFn: ({ id, roles }: { id: number; roles: string[] }) => updateUsuarioRoles(id, roles),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios-admin'] });
      closeModal();
      showToast('success', 'Roles actualizados');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: deactivateUsuario,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios-admin'] });
      showToast('success', 'Usuario desactivado');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const activateMutation = useMutation({
    mutationFn: activateUsuario,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios-admin'] });
      showToast('success', 'Usuario activado');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const openRoles = (user: Usuario) => {
    setEditing(user);
    setSelectedRoles(user.roles ?? []);
    setShowWarning(false);
  };

  const closeModal = () => {
    setEditing(null);
    setSelectedRoles([]);
    setShowWarning(false);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSaveRoles = () => {
    if (!editing) return;
    if (selectedRoles.length === 0 && !showWarning) {
      setShowWarning(true);
      return;
    }
    roleMutation.mutate({ id: editing.id, roles: selectedRoles });
  };

  const pageInfo = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = start + usuarios.length - 1;
    return { start, end };
  }, [page, usuarios.length]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (isLoading) return <div className="p-8 text-slate-500">Cargando usuarios...</div>;
  if (isError) return <div className="p-8 text-red-600">Error al cargar usuarios.</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-12 xl:px-16 py-8 max-w-screen-2xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administracion de usuarios</h1>
          <p className="text-slate-500 text-sm">Gestion de roles y acceso</p>
        </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Shield className="w-4 h-4" />
            Admin
          </div>
        </div>

      <div className="bg-white p-4 rounded-xl shadow border border-slate-200 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre o email"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Roles:</span>
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(roleFilter === role ? '' : role)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  roleFilter === role
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                {role}
              </button>
            ))}
            {roleFilter && (
              <button
                onClick={() => setRoleFilter('')}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Estado:</span>
            <button
              onClick={() => setDisabledFilter(disabledFilter === 'disabled' ? 'all' : 'disabled')}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                disabledFilter === 'disabled'
                  ? 'bg-red-500 border-red-500 text-white'
                  : 'border-slate-300 text-slate-600 hover:border-slate-400'
              }`}
            >
              Solo desactivados
            </button>
          </div>
        </div>
      </div>

      <Table
        columns={[
          { label: 'Usuario' },
          { label: 'Contacto' },
          { label: 'Roles' },
          { label: 'Estado' },
          { label: 'Acciones', className: 'text-right' },
        ]}
        rowCount={usuarios.length}
        empty="No hay usuarios."
      >
        {usuarios.map((user) => {
          const fullName = `${user.first_name} ${user.last_name}`.trim();
          return (
            <tr key={user.id} className="hover:bg-slate-50">
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-slate-800">{fullName}</div>
                <div className="text-xs text-slate-400">ID #{user.id}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-slate-700">{user.email}</div>
                <div className="text-xs text-slate-400">{user.celular}</div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {(user.roles ?? []).map((role) => (
                    <span key={role} className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {role}
                    </span>
                  ))}
                  {(user.roles ?? []).length === 0 && (
                    <span className="text-xs text-slate-400">Sin roles</span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                {user.disabled ? (
                  <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Desactivado</span>
                ) : (
                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Activo</span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => roleMutation.mutate({ id: user.id, roles: ['CLIENTE'] })}
                    className="text-sm text-slate-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />Cliente
                  </button>
                  <button
                    onClick={() => openRoles(user)}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <UserCog className="w-4 h-4" />Roles
                  </button>
                  {user.disabled ? (
                    <button
                      onClick={() => activateMutation.mutate(user.id)}
                      className="text-sm text-green-600 hover:underline"
                    >
                      Activar
                    </button>
                  ) : (
                    <button
                      onClick={() => deactivateMutation.mutate(user.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Desactivar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </Table>

      {usuarios.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
          <span>Mostrando {pageInfo.start}-{pageInfo.end}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-slate-300 rounded-lg disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              disabled={usuarios.length < PAGE_SIZE}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border border-slate-300 rounded-lg disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <Modal isOpen={!!editing} onClose={closeModal} title="Editar roles">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Shield className="w-4 h-4" />
            {editing?.email}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((role) => (
              <label key={role} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role)}
                  onChange={() => toggleRole(role)}
                  className="rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                />
                {role}
              </label>
            ))}
          </div>

          {showWarning && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <span>Si quitas todos los roles, la cuenta se desactiva. Confirmas?</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveRoles}
              disabled={roleMutation.isPending}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2 disabled:opacity-50"
            >
              {roleMutation.isPending ? <Check className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}
              Guardar
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm transition-all ${
          toast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
        } ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <Check className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
