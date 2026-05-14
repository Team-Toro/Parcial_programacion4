import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Plus, Loader2, PenLine, Trash2, Star } from 'lucide-react';
import {
  getDirecciones, createDireccion, updateDireccion,
  deleteDireccion, marcarDireccionPrincipal,
} from '../api/direcciones';
import type { Direccion, DireccionCreate } from '../types';
import Modal from '../components/ui/Modal';

type ToastState = { type: 'success' | 'error'; message: string } | null;

type FormData = {
  alias: string;
  linea1: string;
  linea2: string;
  ciudad: string;
  provincia: string;
  codigo_postal: string;
  es_principal: boolean;
};

const defaultForm: FormData = {
  alias: '',
  linea1: '',
  linea2: '',
  ciudad: '',
  provincia: '',
  codigo_postal: '',
  es_principal: false,
};

function buildPayload(form: FormData): DireccionCreate {
  return {
    alias: form.alias.trim() || undefined,
    linea1: form.linea1.trim(),
    linea2: form.linea2.trim() || undefined,
    ciudad: form.ciudad.trim(),
    provincia: form.provincia.trim() || undefined,
    codigo_postal: form.codigo_postal.trim() || undefined,
    es_principal: form.es_principal,
  };
}

export default function MisDireccionesPage() {
  const qc = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Direccion | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [modalError, setModalError] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [toast, setToast] = useState<ToastState>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    setToastVisible(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setToastVisible(true)));
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const { data: direcciones = [], isLoading, isError } = useQuery({
    queryKey: ['direcciones'],
    queryFn: getDirecciones,
  });

  const createMutation = useMutation({
    mutationFn: createDireccion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['direcciones'] });
      closeForm();
      showToast('success', 'Dirección agregada');
    },
    onError: (e: Error) => { setModalError(e.message); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: DireccionCreate }) => updateDireccion(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['direcciones'] });
      closeForm();
      showToast('success', 'Dirección actualizada');
    },
    onError: (e: Error) => { setModalError(e.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDireccion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['direcciones'] });
      setConfirmDeleteId(null);
      showToast('success', 'Dirección eliminada');
    },
    onError: (e: Error) => {
      setConfirmDeleteId(null);
      showToast('error', e.message);
    },
  });

  const marcarPrincipalMutation = useMutation({
    mutationFn: marcarDireccionPrincipal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['direcciones'] });
      showToast('success', 'Dirección marcada como principal');
    },
    onError: (e: Error) => showToast('error', e.message),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setModalError('');
    setIsFormOpen(true);
  };

  const openEdit = (dir: Direccion) => {
    setEditing(dir);
    setForm({
      alias: dir.alias ?? '',
      linea1: dir.linea1,
      linea2: dir.linea2 ?? '',
      ciudad: dir.ciudad,
      provincia: dir.provincia ?? '',
      codigo_postal: dir.codigo_postal ?? '',
      es_principal: dir.es_principal,
    });
    setModalError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(null);
    setModalError('');
  };

  const handleSubmit = () => {
    if (!form.linea1.trim()) { setModalError('La línea 1 es obligatoria'); return; }
    if (!form.ciudad.trim()) { setModalError('La ciudad es obligatoria'); return; }

    const payload = buildPayload(form);
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) return <div className="p-8 text-slate-500">Cargando direcciones...</div>;
  if (isError) return <div className="p-8 text-red-600">Error al cargar las direcciones.</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-12 xl:px-16 py-8 max-w-screen-2xl mx-auto">

      {/* Cabecera */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Mis direcciones</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva dirección
        </button>
      </div>

      {/* Estado vacío */}
      {direcciones.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center flex flex-col items-center gap-4">
          <MapPin className="w-16 h-16 text-slate-300" />
          <p className="text-slate-500 max-w-sm">Todavía no tenés direcciones de entrega cargadas.</p>
          <button
            onClick={openCreate}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Agregar tu primera dirección
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {direcciones.map((dir) => (
            <div
              key={dir.id}
              className="bg-white rounded-2xl shadow border border-slate-200 p-5 flex flex-col gap-3"
            >
              {/* Cabecera de la card */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  {dir.alias && (
                    <p className="font-semibold text-slate-800 text-base">{dir.alias}</p>
                  )}
                  {dir.es_principal && (
                    <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-600 text-xs font-semibold px-2 py-0.5 rounded-full mt-1">
                      <Star className="w-3 h-3 fill-orange-500" />
                      Principal
                    </span>
                  )}
                </div>
                <MapPin className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
              </div>

              {/* Contenido */}
              <div className="text-sm text-slate-600 flex flex-col gap-0.5">
                <p className={dir.alias ? '' : 'font-medium text-slate-800'}>{dir.linea1}</p>
                {dir.linea2 && <p>{dir.linea2}</p>}
                <p className="text-slate-500">
                  {[dir.ciudad, dir.provincia, dir.codigo_postal].filter(Boolean).join(', ')}
                </p>
              </div>

              {/* Acciones */}
              <div className="flex gap-2 flex-wrap pt-1 border-t border-slate-100">
                <button
                  onClick={() => openEdit(dir)}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  Editar
                </button>

                {!dir.es_principal && (
                  <button
                    onClick={() => marcarPrincipalMutation.mutate(dir.id)}
                    disabled={marcarPrincipalMutation.isPending}
                    className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-800 font-medium disabled:opacity-50"
                  >
                    <Star className="w-3.5 h-3.5" />
                    Marcar como principal
                  </button>
                )}

                <button
                  onClick={() => setConfirmDeleteId(dir.id)}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editing ? 'Editar dirección' : 'Nueva dirección'}
        variant="large"
      >
        {modalError && (
          <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{modalError}</p>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Columna izquierda */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Alias</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.alias}
                onChange={e => setForm(f => ({ ...f, alias: e.target.value }))}
                placeholder="Ej: Casa, Trabajo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Línea 1 *</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.linea1}
                onChange={e => setForm(f => ({ ...f, linea1: e.target.value }))}
                placeholder="Calle y número"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Línea 2</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.linea2}
                onChange={e => setForm(f => ({ ...f, linea2: e.target.value }))}
                placeholder="Piso, depto, referencia"
              />
            </div>
          </div>

          {/* Columna derecha */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad *</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.ciudad}
                onChange={e => setForm(f => ({ ...f, ciudad: e.target.value }))}
                placeholder="Ej: Buenos Aires"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Provincia</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.provincia}
                onChange={e => setForm(f => ({ ...f, provincia: e.target.value }))}
                placeholder="Ej: Buenos Aires"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código postal</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.codigo_postal}
                onChange={e => setForm(f => ({ ...f, codigo_postal: e.target.value }))}
                placeholder="Ej: C1414"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={form.es_principal}
                onChange={e => setForm(f => ({ ...f, es_principal: e.target.checked }))}
                className="w-4 h-4 accent-orange-500"
              />
              Marcar como dirección principal
            </label>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
          <button
            onClick={closeForm}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? 'Guardar cambios' : 'Agregar'}
          </button>
        </div>
      </Modal>

      {/* Modal confirmación borrado */}
      <Modal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="Eliminar dirección"
      >
        <p className="text-slate-600 text-sm mb-6">
          ¿Confirmás que querés eliminar esta dirección? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => setConfirmDeleteId(null)}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => confirmDeleteId !== null && deleteMutation.mutate(confirmDeleteId)}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50"
          >
            {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Eliminar
          </button>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${
            toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          } ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
