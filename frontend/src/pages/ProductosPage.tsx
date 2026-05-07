import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, RotateCcw, ChevronLeft, ChevronRight, Download, Loader2, Package, SearchX } from 'lucide-react';
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from '../api/productos';
import { getCategorias } from '../api/categorias';
import { getIngredientes } from '../api/ingredientes';
import { exportProductosToExcel } from '../lib/exportToExcel';
import { useDebounce } from '../hooks/useDebounce';
import type { Producto, ProductoCreate, IngredienteEnProducto } from '../types';
import Modal from '../components/ui/Modal';

const PAGE_SIZES = [10, 25, 50];
const defaultForm: ProductoCreate = {
  nombre: '',
  descripcion: '',
  precio_base: 0,
  disponible: true,
  categoria_ids: [],
  ingredientes: [],
};

type ToastState = { type: 'success' | 'error'; message: string } | null;

export default function ProductosPage() {
  const qc = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [form, setForm] = useState<ProductoCreate>(defaultForm);
  const [modalError, setModalError] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [catFilter, setCatFilter] = useState<number | ''>('');
  const [precioMin, setPrecioMin] = useState('');
  const [precioMax, setPrecioMax] = useState('');
  const [soloConStock, setSoloConStock] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportProductosToExcel({
        q: debouncedSearch.trim() || undefined,
        categoria_id: catFilter || undefined,
        precio_min: precioMin ? Number(precioMin) : undefined,
        precio_max: precioMax ? Number(precioMax) : undefined,
        in_stock: soloConStock || undefined,
        disponible: estadoFilter === 'todos' ? undefined : estadoFilter === 'activo',
      });
      showToast('success', 'Exportación completada');
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

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

  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, catFilter, precioMin, precioMax, soloConStock, estadoFilter, pageSize]);

  const params = {
    offset: (page - 1) * pageSize,
    limit: pageSize,
    q: debouncedSearch.trim() || undefined,
    categoria_id: catFilter || undefined,
    precio_min: precioMin ? Number(precioMin) : undefined,
    precio_max: precioMax ? Number(precioMax) : undefined,
    in_stock: soloConStock || undefined,
    disponible: estadoFilter === 'todos' ? undefined : estadoFilter === 'activo',
  };

  const hasActiveFilters =
    searchInput.trim() !== '' ||
    catFilter !== '' ||
    precioMin !== '' ||
    precioMax !== '' ||
    soloConStock ||
    estadoFilter !== 'todos' ||
    pageSize !== 10 ||
    page > 1;

  const clearFilters = () => {
    setSearchInput('');
    setCatFilter('');
    setPrecioMin('');
    setPrecioMax('');
    setSoloConStock(false);
    setEstadoFilter('todos');
    setPageSize(10);
    setPage(1);
  };

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['productos', params],
    queryFn: () => getProductos(params),
    placeholderData: (prev) => prev,
  });

  const productos = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => getCategorias(),
  });

  const { data: ingredientes = [] } = useQuery({
    queryKey: ['ingredientes'],
    queryFn: () => getIngredientes(),
  });

  const createMutation = useMutation({
    mutationFn: createProducto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] });
      closeModal();
      showToast('success', 'Producto creado correctamente');
    },
    onError: (e: Error) => {
      setModalError(e.message);
      showToast('error', e.message || 'Ocurrió un error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductoCreate> }) =>
      updateProducto(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] });
      closeModal();
      showToast('success', 'Producto actualizado correctamente');
    },
    onError: (e: Error) => {
      setModalError(e.message);
      showToast('error', e.message || 'Ocurrió un error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProducto,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] });
      showToast('success', 'Producto marcado como inactivo');
    },
    onError: (e: Error) => showToast('error', e.message || 'Ocurrió un error'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm);
    setModalError('');
    setIsOpen(true);
  };

  const openEdit = (p: Producto) => {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      precio_base: Number(p.precio_base),
      stock_cantidad: p.stock_cantidad,
      disponible: p.disponible,
      categoria_ids: p.categorias.map(pc => pc.categoria?.id).filter((id): id is number => id !== undefined),
      ingredientes: p.ingredientes.map(pi => ({
        ingrediente_id: pi.ingrediente.id,
        es_removible: pi.es_removible,
      })),
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
    if (form.precio_base < 0) {
      setModalError('El precio no puede ser negativo');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (p: Producto) => {
    setDeleteTarget(p);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const toggleCategoria = (id: number) =>
    setForm(f => ({
      ...f,
      categoria_ids: f.categoria_ids.includes(id)
        ? f.categoria_ids.filter(x => x !== id)
        : [...f.categoria_ids, id],
    }));

  const isIngSelected = (id: number) => form.ingredientes.some(pi => pi.ingrediente_id === id);

  const toggleIngrediente = (id: number) => {
    const exists = form.ingredientes.find(pi => pi.ingrediente_id === id);
    if (exists) {
      setForm(f => ({ ...f, ingredientes: f.ingredientes.filter(pi => pi.ingrediente_id !== id) }));
    } else {
      setForm(f => ({
        ...f,
        ingredientes: [...f.ingredientes, { ingrediente_id: id, es_removible: true }],
      }));
    }
  };

  const updateIngProp = (id: number, prop: keyof IngredienteEnProducto, value: boolean) =>
    setForm(f => ({
      ...f,
      ingredientes: f.ingredientes.map(pi =>
        pi.ingrediente_id === id ? { ...pi, [prop]: value } : pi
      ),
    }));

  const fromRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRow = Math.min(page * pageSize, total);

  if (isLoading) return <div className="p-8 text-slate-500">Cargando productos...</div>;
  if (isError) return <div className="p-8 text-red-600">Error al cargar los productos.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Productos</h1>
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
            + Nuevo Producto
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow border border-slate-200 mb-4">
        <div className="flex flex-wrap gap-3 items-center">
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

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value ? Number(e.target.value) : '')}
            className="w-44 py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.parent_id ? '└ ' : ''}{cat.nombre}
              </option>
            ))}
          </select>

          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={0}
              placeholder="Precio min"
              value={precioMin}
              onChange={(e) => setPrecioMin(e.target.value)}
              className="w-28 py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              min={0}
              placeholder="Precio max"
              value={precioMax}
              onChange={(e) => setPrecioMax(e.target.value)}
              className="w-28 py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={soloConStock}
              onChange={(e) => setSoloConStock(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            Solo con stock
          </label>

          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as typeof estadoFilter)}
            className="w-36 py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>

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

      {isFetching && !isLoading && (
        <p className="text-xs text-slate-400 mb-2 px-1">Actualizando...</p>
      )}

      {productos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center flex flex-col items-center gap-4">
          {hasActiveFilters ? (
            <>
              <SearchX className="w-16 h-16 text-slate-300" />
              <p className="text-slate-500 max-w-sm">
                No se encontraron productos con los filtros aplicados.
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
                Todavía no hay productos cargados.
              </p>
              <button
                onClick={openCreate}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Crear primer producto
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 text-left">ID</th>
                  <th className="px-6 py-3 text-left">Nombre</th>
                  <th className="px-6 py-3 text-left">Precio</th>
                  <th className="px-6 py-3 text-left">Stock</th>
                  <th className="px-6 py-3 text-left">Estado</th>
                  <th className="px-6 py-3 text-left">Categorías</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productos.map((p, idx) => (
                  <tr key={p.id} className={`hover:bg-orange-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="px-6 py-4 text-slate-400">{p.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{p.nombre}</td>
                    <td className="px-6 py-4 text-slate-700 font-semibold">
                      ${Number(p.precio_base).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className={`${p.stock_cantidad === 0 ? 'text-red-500 font-semibold' : ''}`}>
                        {p.stock_cantidad}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.stock_cantidad === 0 && p.disponible && (
                        <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1 rounded-full mr-1">
                          Sin stock
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        p.disponible
                          ? p.stock_cantidad > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {p.disponible
                          ? p.stock_cantidad > 0
                            ? 'Activo'
                            : 'Agotado'
                          : 'Deshabilitado'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {p.categorias.length === 0 ? (
                          <span className="text-slate-400 text-xs">—</span>
                        ) : (
                          p.categorias.map(pc => (
                            <span
                              key={pc.categoria?.id ?? Math.random()}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                pc.es_principal
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              {pc.categoria?.nombre ?? '—'}
                              {pc.es_principal && ' ★'}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deleteMutation.isPending}
                          className="text-red-500 hover:underline text-sm disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                        <Link
                          to={`/productos/${p.id}`}
                          className="text-orange-500 hover:underline text-sm"
                        >
                          Ver
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 px-2 gap-3">
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-600">
                {total > 0 ? `Mostrando ${fromRow}–${toRow} de ${total} resultado${total !== 1 ? 's' : ''}` : ''}
              </p>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="py-1.5 px-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {PAGE_SIZES.map(ps => (
                  <option key={ps} value={ps}>{ps} por pág.</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-slate-500">
                Página {page} de {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={editing ? 'Editar Producto' : 'Nuevo Producto'}
      >
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          {modalError && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{modalError}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Pizza Margherita"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.descripcion ?? ''}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={2}
              placeholder="Descripción opcional..."
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio base *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.precio_base}
                onChange={e => setForm(f => ({ ...f, precio_base: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
              <input
                type="number"
                min={0}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.stock_cantidad ?? 0}
                onChange={e => setForm(f => ({
                  ...f,
                  stock_cantidad: parseInt(e.target.value) || 0,
                }))}
                placeholder="Ej: 100"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.disponible}
              onChange={e => setForm(f => ({ ...f, disponible: e.target.checked }))}
              className="w-4 h-4 accent-orange-500"
            />
            Disponible
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categorías</label>
            <select
              multiple
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.categoria_ids.map(String)}
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, opt => parseInt(opt.value));
                setForm(f => ({ ...f, categoria_ids: selected }));
              }}
            >
              <option value="" disabled>Seleccionar categorías...</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.parent_id ? '└ ' : ''}{cat.nombre}
                </option>
              ))}
            </select>
            {form.categoria_ids.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {form.categoria_ids.map(catId => {
                  const cat = categorias.find(c => c.id === catId);
                  return cat ? (
                    <span key={cat.id} className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                      {cat.nombre}
                      <button
                        type="button"
                        onClick={() => toggleCategoria(cat.id)}
                        className="hover:text-orange-900"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ingredientes</label>
            <div className="max-h-48 overflow-y-auto border border-slate-300 rounded-lg p-2 flex flex-col gap-2">
              {ingredientes.length === 0 && (
                <span className="text-slate-400 text-xs">Sin ingredientes disponibles</span>
              )}
              {ingredientes.map(ing => {
                const sel = form.ingredientes.find(pi => pi.ingrediente_id === ing.id);
                return (
                  <div key={ing.id}>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!sel}
                        onChange={() => toggleIngrediente(ing.id)}
                        className="w-4 h-4 accent-orange-500"
                      />
                      {ing.nombre}
                      {ing.es_alergeno && (
                        <span className="text-xs text-red-500">⚠ Alérgeno</span>
                      )}
                    </label>
                    {sel && (
                      <div className="ml-6 mt-1 flex gap-4">
                        <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sel.es_removible}
                            onChange={e => updateIngProp(ing.id, 'es_removible', e.target.checked)}
                            className="w-3 h-3 accent-orange-500"
                          />
                          Removible
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirmar eliminación"
      >
        <div className="flex flex-col gap-4">
          <p>
            ¿Estás seguro de marcar <strong>"{deleteTarget?.nombre}"</strong> como inactivo?
            Dejará de aparecer en el listado de productos.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
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
