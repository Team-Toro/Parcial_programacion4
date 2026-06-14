import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, X, RotateCcw, ChevronLeft, ChevronRight,
  Download, Loader2, Package, SearchX, RefreshCw,
} from 'lucide-react';
import { exportIngredientesToExcel } from '../lib/exportToExcel';
import {
  getIngredientes, createIngrediente, updateIngrediente,
  deleteIngrediente, reactivarIngrediente,
} from '../api/ingredientes';
import type { Ingrediente, IngredienteCreate, UnidadMedida } from '../types';
import Modal from '../components/ui/Modal';
import { useDebounce } from '../hooks/useDebounce';
import { useAuthStore } from '../store/authStore';

const PAGE_SIZE = 10;
const defaultForm: IngredienteCreate = {
  nombre: '', descripcion: '', es_alergeno: false,
  unidad: 'unidad', stock_actual: 0, precio: 0,
};

const formatPrecio = (value: number) =>
  `$${Number(value).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

type AlergenoFilter = 'all' | 'si' | 'no';
type SortField = 'nombre' | 'created_at' | 'stock_actual';
type SortOrder = 'asc' | 'desc';
type ToastState = { type: 'success' | 'error'; message: string } | null;

export default function IngredientesPage() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((s) => s.isProductManager());

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Ingrediente | null>(null);
  const [form, setForm] = useState<IngredienteCreate>(defaultForm);
  const [modalError, setModalError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [alergenoFilter, setAlergenoFilter] = useState<AlergenoFilter>('all');
  const [sortBy, setSortBy] = useState<SortField>('nombre');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportIngredientesToExcel({
        q: debouncedSearch.trim() || undefined,
        es_alergeno:
          alergenoFilter === 'si' ? true : alergenoFilter === 'no' ? false : undefined,
        sort: sortBy === 'stock_actual' ? 'nombre' : sortBy,
        order: sortOrder,
      });
      showToast('success', 'Exportación completada');
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => { setPage(1); }, [debouncedSearch, alergenoFilter, sortBy, sortOrder, includeDeleted]);

  const params = {
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    q: debouncedSearch.trim() || undefined,
    es_alergeno:
      alergenoFilter === 'si' ? true : alergenoFilter === 'no' ? false : undefined,
    sort: sortBy,
    order: sortOrder,
    include_deleted: includeDeleted || undefined,
  };

  const hasActiveFilters =
    searchInput.trim() !== '' || alergenoFilter !== 'all' ||
    sortBy !== 'nombre' || sortOrder !== 'asc';

  const clearFilters = () => {
    setSearchInput(''); setAlergenoFilter('all');
    setSortBy('nombre'); setSortOrder('asc'); setPage(1);
  };

  const { data: ingredientes = [], isLoading, isError, isFetching } = useQuery({
    queryKey: ['ingredientes', params],
    queryFn: () => getIngredientes(params),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: createIngrediente,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredientes'] }); closeModal(); showToast('success', 'Insumo creado'); },
    onError: (e: Error) => { setModalError(e.message); showToast('error', e.message); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<IngredienteCreate> }) => updateIngrediente(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredientes'] }); closeModal(); showToast('success', 'Insumo actualizado'); },
    onError: (e: Error) => { setModalError(e.message); showToast('error', e.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIngrediente,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredientes'] }); showToast('success', 'Insumo dado de baja'); },
    onError: (e: Error) => showToast('error', e.message),
  });

  const reactivarMutation = useMutation({
    mutationFn: reactivarIngrediente,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ingredientes'] }); showToast('success', 'Ingrediente reactivado'); },
    onError: (e: Error) => showToast('error', e.message),
  });

  const openCreate = () => {
    setEditing(null); setForm(defaultForm); setModalError(''); setIsOpen(true);
  };

  const openEdit = (ing: Ingrediente) => {
    setEditing(ing);
    setForm({
      nombre: ing.nombre, descripcion: ing.descripcion ?? '',
      es_alergeno: ing.es_alergeno, unidad: ing.unidad, stock_actual: ing.stock_actual,
      precio: Number(ing.precio),
    });
    setModalError(''); setIsOpen(true);
  };

  const closeModal = () => { setIsOpen(false); setEditing(null); setModalError(''); };

  const handleSubmit = () => {
    if (!form.nombre.trim()) { setModalError('El nombre es obligatorio'); return; }
    if (form.stock_actual < 0) { setModalError('El stock no puede ser negativo'); return; }
    if (form.unidad === 'unidad' && !Number.isInteger(form.stock_actual)) {
      setModalError('El stock debe ser un número entero para ingredientes por unidad'); return;
    }
    if (form.precio < 0) { setModalError('El precio no puede ser negativo'); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (ing: Ingrediente) => {
    if (!window.confirm(`¿Dar de baja "${ing.nombre}"?`)) return;
    deleteMutation.mutate(ing.id);
  };

  const sortValue = `${sortBy}-${sortOrder}`;
  const handleSortChange = (value: string) => {
    const parts = value.split('-');
    setSortBy(parts[0] as SortField);
    setSortOrder(parts[1] as SortOrder);
  };

  const deletedCount = ingredientes.filter(i => i.deleted_at).length;

  if (isLoading) return <div className="p-8 text-slate-500">Cargando insumos...</div>;
  if (isError) return <div className="p-8 text-red-600">Error al cargar los insumos.</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-12 xl:px-16 py-8 max-w-screen-2xl mx-auto">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Ingredientes</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar Excel
          </button>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Nuevo Ingrediente
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow border border-slate-200 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={alergenoFilter}
            onChange={(e) => setAlergenoFilter(e.target.value as AlergenoFilter)}
            className="w-40 py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Todos</option>
            <option value="si">Solo alérgenos</option>
            <option value="no">Sin alérgenos</option>
          </select>

          <select
            value={sortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-48 py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="nombre-asc">Nombre A–Z</option>
            <option value="nombre-desc">Nombre Z–A</option>
            <option value="stock_actual-desc">Mayor stock</option>
            <option value="stock_actual-asc">Menor stock</option>
            <option value="created_at-desc">Más recientes</option>
            <option value="created_at-asc">Más antiguos</option>
          </select>

          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              Ver dados de baja
              {includeDeleted && deletedCount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded font-semibold">
                  {deletedCount} dado{deletedCount !== 1 ? 's' : ''} de baja
                </span>
              )}
            </label>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {isFetching && !isLoading && (
        <p className="text-xs text-slate-400 mb-2 px-1">Actualizando...</p>
      )}

      {ingredientes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center flex flex-col items-center gap-4">
          {hasActiveFilters ? (
            <>
              <SearchX className="w-16 h-16 text-slate-300" />
              <p className="text-slate-500 max-w-sm">No se encontraron insumos con los filtros aplicados.</p>
              <button onClick={clearFilters} className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50">
                <RotateCcw className="w-3.5 h-3.5" />Limpiar filtros
              </button>
            </>
          ) : (
            <>
              <Package className="w-16 h-16 text-slate-300" />
              <p className="text-slate-500 max-w-sm">Todavía no hay insumos cargados.</p>
              {isAdmin && (
                <button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  + Crear primer insumo
                </button>
              )}
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
                <th className="px-6 py-3 text-left">Precio</th>
                <th className="px-6 py-3 text-left">Stock</th>
                {isAdmin && <th className="px-6 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {ingredientes.map((ing, idx) => {
                const isDeleted = !!ing.deleted_at;
                return (
                  <tr
                    key={ing.id}
                    className={`border-t border-slate-100 transition-colors ${
                      isDeleted
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : `hover:bg-orange-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`
                    }`}
                  >
                    <td className="px-6 py-4 text-slate-400">{ing.id}</td>
                    <td className="px-6 py-4 font-medium">
                      <span className={isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}>
                        {ing.nombre}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{ing.descripcion ?? '—'}</td>
                    <td className="px-6 py-4">
                      {ing.es_alergeno ? (
                        <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />Sí
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-semibold">
                      {formatPrecio(ing.precio)} <span className="text-slate-400 text-xs font-normal">/ {ing.unidad}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {ing.stock_actual} <span className="text-slate-400 text-xs">{ing.unidad}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {isDeleted ? (
                            <button
                              onClick={() => reactivarMutation.mutate(ing.id)}
                              disabled={reactivarMutation.isPending}
                              className="flex items-center gap-1.5 text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Reactivar
                            </button>
                          ) : (
                            <>
                              <button onClick={() => openEdit(ing)} className="text-blue-600 hover:underline text-sm">Editar</button>
                              <button
                                onClick={() => handleDelete(ing)}
                                disabled={deleteMutation.isPending}
                                className="text-red-500 hover:underline text-sm disabled:opacity-50"
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      <div className="flex justify-between items-center mt-4 px-2">
        <p className="text-sm text-slate-600">
          {page > 1 ? `Página ${page} · ` : ''}{ingredientes.length} resultado{ingredientes.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />Anterior
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={ingredientes.length < PAGE_SIZE}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente<ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal crear/editar */}
      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Editar Ingrediente' : 'Nuevo Ingrediente'} variant="large">
        {modalError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{modalError}</p>}
        <div className="grid grid-cols-2 gap-6">
          {/* Columna izquierda: nombre y descripción */}
          <div className="flex flex-col gap-4">
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
                rows={5}
                placeholder="Descripción opcional..."
              />
            </div>
          </div>

          {/* Columna derecha: unidad, stock y alérgeno */}
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.unidad}
                onChange={e => {
                  const u = e.target.value as UnidadMedida;
                  setForm(f => ({
                    ...f,
                    unidad: u,
                    stock_actual: u === 'unidad' ? Math.floor(f.stock_actual) : f.stock_actual,
                  }));
                }}
              >
                <option value="unidad">Unidad</option>
                <option value="kg">Kg</option>
                <option value="litro">Litro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock actual</label>
              <input
                type="number"
                min={0}
                step={form.unidad === 'unidad' ? '1' : '0.01'}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.stock_actual}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setForm(f => ({ ...f, stock_actual: f.unidad === 'unidad' ? Math.floor(val) : val }));
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio (por {form.unidad})</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.precio}
                onChange={e => setForm(f => ({ ...f, precio: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={form.es_alergeno}
                onChange={e => setForm(f => ({ ...f, es_alergeno: e.target.checked }))}
                className="w-4 h-4 accent-orange-500"
              />
              Es alérgeno
            </label>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
          <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50"
          >
            {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
            {editing ? 'Guardar cambios' : 'Crear'}
          </button>
        </div>
      </Modal>

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
