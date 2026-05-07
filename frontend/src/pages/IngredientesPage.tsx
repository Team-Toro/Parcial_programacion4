import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, RotateCcw, ChevronLeft, ChevronRight, Download, Loader2, Package, SearchX } from 'lucide-react';
import { exportIngredientesToExcel } from '../lib/exportToExcel';
import {
  getIngredientes,
  createIngrediente,
  updateIngrediente,
  deleteIngrediente,
} from '../api/ingredientes';
import type { Ingrediente, IngredienteCreate } from '../types';
import Modal from '../components/ui/Modal';
import { useDebounce } from '../hooks/useDebounce';

const PAGE_SIZE = 10;
const defaultForm: IngredienteCreate = { nombre: '', descripcion: '', es_alergeno: false };

type AlergenoFilter = 'all' | 'si' | 'no';
type SortField = 'nombre' | 'created_at';
type SortOrder = 'asc' | 'desc';
type ToastState = { type: 'success' | 'error'; message: string } | null;

export default function IngredientesPage() {
  const qc = useQueryClient();

  // --- Estado del modal ---
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Ingrediente | null>(null);
  const [form, setForm] = useState<IngredienteCreate>(defaultForm);
  const [modalError, setModalError] = useState('');

  // --- Estado de filtros y paginación ---
  const [searchInput, setSearchInput] = useState('');
  const [alergenoFilter, setAlergenoFilter] = useState<AlergenoFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('nombre');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);

  // --- Export ---
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportIngredientesToExcel({
        q: debouncedSearch.trim() || undefined,
        es_alergeno:
          alergenoFilter === 'si' ? true :
          alergenoFilter === 'no' ? false :
          undefined,
        sort: sortBy,
        order: sortOrder,
      });
      showToast('success', 'Exportación completada');
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  // --- Toast ---
  const [toast, setToast] = useState<ToastState>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    setToastVisible(false);
    // Doble rAF: primer frame registra estado inicial (invisible), segundo activa la transición
    requestAnimationFrame(() => requestAnimationFrame(() => setToastVisible(true)));
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // --- Debounce del buscador ---
  const debouncedSearch = useDebounce(searchInput, 400);

  // Resetear a página 1 cuando cambia cualquier filtro
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, alergenoFilter, sortBy, sortOrder]);

  // --- Params derivados del estado ---
  const params = {
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    q: debouncedSearch.trim() || undefined,
    es_alergeno:
      alergenoFilter === 'si' ? true :
      alergenoFilter === 'no' ? false :
      undefined,
    sort: sortBy,
    order: sortOrder,
  };

  const hasActiveFilters =
    searchInput.trim() !== '' ||
    alergenoFilter !== 'all' ||
    sortBy !== 'nombre' ||
    sortOrder !== 'asc';

  const clearFilters = () => {
    setSearchInput('');
    setAlergenoFilter('all');
    setSortBy('nombre');
    setSortOrder('asc');
    setPage(1);
  };

  // --- Query principal ---
  const { data: ingredientes = [], isLoading, isError, isFetching } = useQuery({
    queryKey: ['ingredientes', params],
    queryFn: () => getIngredientes(params),
    placeholderData: (prev) => prev, // mantiene resultados anteriores mientras refetchea (reemplaza keepPreviousData en v5)
  });

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createIngrediente,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredientes'] });
      closeModal();
      showToast('success', 'Insumo creado correctamente');
    },
    onError: (e: Error) => {
      setModalError(e.message);
      showToast('error', e.message || 'Ocurrió un error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<IngredienteCreate> }) =>
      updateIngrediente(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredientes'] });
      closeModal();
      showToast('success', 'Insumo actualizado correctamente');
    },
    onError: (e: Error) => {
      setModalError(e.message);
      showToast('error', e.message || 'Ocurrió un error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIngrediente,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ingredientes'] });
      showToast('success', 'Insumo marcado como inactivo');
    },
    onError: (e: Error) => showToast('error', e.message || 'Ocurrió un error'),
  });

  // --- Handlers ---
  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setModalError('');
    setIsOpen(true);
  };

  const openEdit = (ing: Ingrediente) => {
    setEditing(ing);
    setForm({
      nombre: ing.nombre,
      descripcion: ing.descripcion ?? '',
      es_alergeno: ing.es_alergeno,
    });
    setModalError('');
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditing(null);
    setModalError('');
  };

  const handleSubmit = () => {
    if (!form.nombre.trim()) {
      setModalError('El nombre es obligatorio');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (ing: Ingrediente) => {
    if (!window.confirm(`¿Marcar "${ing.nombre}" como inactivo? Dejará de aparecer en el listado.`)) return;
    deleteMutation.mutate(ing.id);
  };

  // El select de orden combina campo y dirección en un solo value
  const sortValue = `${sortBy}-${sortOrder}`;
  const handleSortChange = (value: string) => {
    const parts = value.split('-');
    setSortBy(parts[0] as SortField);
    setSortOrder(parts[1] as SortOrder);
  };

  // --- Renders condicionales (después de todos los hooks) ---
  if (isLoading) return <div className="p-8 text-slate-500">Cargando insumos...</div>;
  if (isError) return <div className="p-8 text-red-600">Error al cargar los insumos.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Ingredientes</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isExporting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            Exportar Excel
          </button>
          <button
            onClick={openCreate}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Nuevo Ingrediente
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-white p-4 rounded-xl shadow border border-slate-200 mb-4">
        <div className="flex flex-wrap gap-3 items-center">

          {/* Buscador con ícono y botón limpiar */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtro alérgeno */}
          <select
            value={alergenoFilter}
            onChange={(e) => setAlergenoFilter(e.target.value as AlergenoFilter)}
            className="w-40 py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">Todos</option>
            <option value="si">Solo alérgenos</option>
            <option value="no">Sin alérgenos</option>
          </select>

          {/* Orden */}
          <select
            value={sortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-44 py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="nombre-asc">Nombre A–Z</option>
            <option value="nombre-desc">Nombre Z–A</option>
            <option value="created_at-desc">Más recientes</option>
            <option value="created_at-asc">Más antiguos</option>
          </select>

          {/* Limpiar filtros — solo visible si hay algo activo */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Indicador sutil de refetch */}
      {isFetching && !isLoading && (
        <p className="text-xs text-slate-400 mb-2 px-1">Actualizando...</p>
      )}

      {/* Estado vacío */}
      {ingredientes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center flex flex-col items-center gap-4">
          {hasActiveFilters ? (
            <>
              <SearchX className="w-16 h-16 text-slate-300" />
              <p className="text-slate-500 max-w-sm">
                No se encontraron insumos con los filtros aplicados.
              </p>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpiar filtros
              </button>
            </>
          ) : (
            <>
              <Package className="w-16 h-16 text-slate-300" />
              <p className="text-slate-500 max-w-sm">
                Todavía no hay insumos cargados.
              </p>
              <button
                onClick={openCreate}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Crear primer insumo
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">ID</th>
                <th className="px-6 py-3 text-left">Nombre</th>
                <th className="px-6 py-3 text-left">Descripción</th>
                <th className="px-6 py-3 text-left">Alérgeno</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ingredientes.map((ing, idx) => (
                <tr
                  key={ing.id}
                  className={`border-t border-slate-100 transition-colors hover:bg-orange-50 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  }`}
                >
                  <td className="px-6 py-4 text-slate-400">{ing.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">{ing.nombre}</td>
                  <td className="px-6 py-4 text-slate-500">{ing.descripcion ?? '—'}</td>
                  <td className="px-6 py-4">
                    {ing.es_alergeno ? (
                      <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        Sí
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(ing)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(ing)}
                        disabled={deleteMutation.isPending}
                        className="text-red-500 hover:underline text-sm disabled:opacity-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <div className="flex justify-between items-center mt-4 px-2">
        <p className="text-sm text-slate-600">
          {page > 1 ? `Página ${page} · ` : ''}
          {ingredientes.length} resultado{ingredientes.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={ingredientes.length < PAGE_SIZE}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal crear / editar */}
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={editing ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
      >
        <div className="flex flex-col gap-4">
          {modalError && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{modalError}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Harina"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.descripcion ?? ''}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={3}
              placeholder="Descripción opcional..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.es_alergeno}
              onChange={e => setForm(f => ({ ...f, es_alergeno: e.target.checked }))}
              className="w-4 h-4 accent-orange-500"
            />
            Es alérgeno
          </label>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {(createMutation.isPending || updateMutation.isPending)
                ? 'Guardando...'
                : editing ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast de notificaciones */}
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
