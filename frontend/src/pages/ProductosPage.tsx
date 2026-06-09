import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, X, RotateCcw, ChevronLeft, ChevronRight,
  Loader2, Package, SearchX, RefreshCw,
} from 'lucide-react';
import {
  getProductos, createProducto, updateProducto,
  deleteProducto, reactivarProducto,
} from '../api/productos';
import { getCategorias } from '../api/categorias';
import { getIngredientes } from '../api/ingredientes';
import type { Producto, ProductoCreate, IngredienteEnProducto } from '../types';
import Modal from '../components/ui/Modal';
import ImageUpload from '../components/ImageUpload';
import { useDebounce } from '../hooks/useDebounce';
import { useAuthStore } from '../store/authStore';

const PAGE_SIZE = 10;

const defaultForm: ProductoCreate = {
  nombre: '', descripcion: '', precio_base: 0,
  disponible: true, categoria_ids: [], ingredientes: [], imagenes_url: [],
};

type SortField = 'nombre' | 'precio_base' | 'created_at' | 'stock_cantidad';
type SortOrder = 'asc' | 'desc';
type ToastState = { type: 'success' | 'error'; message: string } | null;

function StockBadge({ value }: { value: number }) {
  const color =
    value === 0 ? 'text-red-600 font-semibold' :
    value < 5   ? 'text-amber-600 font-semibold' :
                  'text-green-700 font-semibold';
  return <span className={color}>{value}</span>;
}

export default function ProductosPage() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const isProductManager = useAuthStore((s) => s.isProductManager());

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [form, setForm] = useState<ProductoCreate>(defaultForm);
  const [modalError, setModalError] = useState('');

  // Filtros de tabla
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('nombre');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // Buscadores dentro del modal
  const [ingSearch, setIngSearch] = useState('');
  const debouncedIngSearch = useDebounce(ingSearch, 300);
  const [categoriaSearch, setCategoriaSearch] = useState('');

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
  useEffect(() => { setPage(1); }, [debouncedSearch, sortBy, sortOrder, includeDeleted]);

  const params = {
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
    q: debouncedSearch.trim() || undefined,
    sort: sortBy,
    order: sortOrder,
    include_deleted: includeDeleted || undefined,
  };

  const hasActiveFilters = searchInput.trim() !== '' || sortBy !== 'nombre' || sortOrder !== 'asc';
  const clearFilters = () => { setSearchInput(''); setSortBy('nombre'); setSortOrder('asc'); setPage(1); };

  const { data: productos = [], isLoading, isError, isFetching } = useQuery({
    queryKey: ['productos', params],
    queryFn: () => getProductos(params),
    placeholderData: (prev) => prev,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => getCategorias({ limit: 100 }),
  });

  // Raíces primero, sus hijos inmediatamente debajo
  const categoriasOrdenadas = categorias.filter(c => !c.parent_id).flatMap(r => [
    r,
    ...categorias.filter(c => c.parent_id === r.id),
  ]);

  const { data: ingredientesModal = [] } = useQuery({
    queryKey: ['ingredientes', { q: debouncedIngSearch, limit: 50 }],
    queryFn: () => getIngredientes({ q: debouncedIngSearch || undefined, limit: 50 }),
    enabled: isOpen,
  });

  const createMutation = useMutation({
    mutationFn: createProducto,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); closeModal(); showToast('success', 'Producto creado'); },
    onError: (e: Error) => { setModalError(e.message); showToast('error', e.message); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductoCreate> }) => updateProducto(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); closeModal(); showToast('success', 'Producto actualizado'); },
    onError: (e: Error) => { setModalError(e.message); showToast('error', e.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProducto,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); showToast('success', 'Producto dado de baja'); },
    onError: (e: Error) => showToast('error', e.message),
  });

  const reactivarMutation = useMutation({
    mutationFn: reactivarProducto,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); showToast('success', 'Producto reactivado'); },
    onError: (e: Error) => showToast('error', e.message),
  });

  const openCreate = () => {
    setEditing(null); setForm(defaultForm); setModalError(''); setIngSearch(''); setCategoriaSearch(''); setIsOpen(true);
  };

  const openEdit = (p: Producto) => {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      precio_base: Number(p.precio_base),
      disponible: p.disponible,
      categoria_ids: p.categorias.map(pc => pc.categoria?.id).filter((id): id is number => id !== undefined),
      ingredientes: p.ingredientes.map(pi => ({
        ingrediente_id: pi.ingrediente.id,
        es_removible: pi.es_removible,
        cantidad: pi.cantidad,
      })),
      imagenes_url: p.imagenes_url ?? [],
    });
    setModalError(''); setIngSearch(''); setCategoriaSearch(''); setIsOpen(true);
  };

  const closeModal = () => { setIsOpen(false); setEditing(null); setModalError(''); setIngSearch(''); setCategoriaSearch(''); };

  const handleSubmit = () => {
    if (!form.nombre.trim()) { setModalError('El nombre es obligatorio'); return; }
    if (form.precio_base < 0) { setModalError('El precio no puede ser negativo'); return; }
    if (form.ingredientes.length === 0) { setModalError('El producto debe tener al menos un ingrediente'); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleCategoria = (id: number) =>
    setForm(f => ({
      ...f,
      categoria_ids: f.categoria_ids.includes(id)
        ? f.categoria_ids.filter(x => x !== id)
        : [...f.categoria_ids, id],
    }));

  const toggleIngrediente = (id: number) => {
    const exists = form.ingredientes.find(pi => pi.ingrediente_id === id);
    if (exists) {
      setForm(f => ({ ...f, ingredientes: f.ingredientes.filter(pi => pi.ingrediente_id !== id) }));
    } else {
      setForm(f => ({
        ...f,
        ingredientes: [...f.ingredientes, { ingrediente_id: id, es_removible: false, cantidad: 1 }],
      }));
    }
  };

  const updateIngProp = (id: number, prop: keyof IngredienteEnProducto, value: boolean | number) =>
    setForm(f => ({
      ...f,
      ingredientes: f.ingredientes.map(pi =>
        pi.ingrediente_id === id ? { ...pi, [prop]: value } : pi
      ),
    }));

  const sortValue = `${sortBy}-${sortOrder}`;
  const handleSortChange = (value: string) => {
    const parts = value.split('-');
    setSortBy(parts[0] as SortField);
    setSortOrder(parts[1] as SortOrder);
  };

  const deletedCount = productos.filter(p => p.deleted_at).length;

  if (isLoading) return <div className="p-8 text-slate-500">Cargando productos...</div>;
  if (isError) return <div className="p-8 text-red-500">Error al cargar los productos.</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-12 xl:px-16 py-8 max-w-screen-2xl mx-auto">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Productos</h1>
        {(isAdmin || isProductManager) && (
          <button
            onClick={openCreate}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Nuevo Producto
          </button>
        )}
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
              placeholder="Buscar producto..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <select
            value={sortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-52 py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="nombre-asc">Nombre A–Z</option>
            <option value="nombre-desc">Nombre Z–A</option>
            <option value="precio_base-asc">Precio menor</option>
            <option value="precio_base-desc">Precio mayor</option>
            <option value="stock_cantidad-desc">Mayor stock</option>
            <option value="stock_cantidad-asc">Menor stock</option>
            <option value="created_at-desc">Más recientes</option>
          </select>

          {(isAdmin || isProductManager) && (
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
            <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50">
              <RotateCcw className="w-3.5 h-3.5" />Limpiar
            </button>
          )}
        </div>
      </div>

      {isFetching && !isLoading && <p className="text-xs text-slate-400 mb-2 px-1">Actualizando...</p>}

      {productos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center flex flex-col items-center gap-4">
          {hasActiveFilters ? (
            <>
              <SearchX className="w-16 h-16 text-slate-300" />
              <p className="text-slate-500">No se encontraron productos con los filtros aplicados.</p>
              <button onClick={clearFilters} className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50">
                <RotateCcw className="w-3.5 h-3.5" />Limpiar filtros
              </button>
            </>
          ) : (
            <>
              <Package className="w-16 h-16 text-slate-300" />
              <p className="text-slate-500">No hay productos aún.</p>
              {(isAdmin || isProductManager) && (
                <button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  + Crear primer producto
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
                <th className="px-6 py-3 text-left">Precio</th>
                {isAdmin && <th className="px-6 py-3 text-left">Stock</th>}
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-left">Categorías</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.map(p => {
                const isDeleted = !!p.deleted_at;
                return (
                  <tr key={p.id} className={isDeleted ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-slate-50'}>
                    <td className="px-6 py-4 text-slate-400">{p.id}</td>
                    <td className="px-6 py-4 font-medium">
                      <span className={isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}>{p.nombre}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-semibold">${Number(p.precio_base).toFixed(2)}</td>
                    {isAdmin && <td className="px-6 py-4"><StockBadge value={p.stock_disponible} /></td>}
                    <td className="px-6 py-4">
                      {!isDeleted && (
                        <>
                          {p.stock_disponible === 0 && p.disponible && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1 rounded-full mr-1">Sin stock</span>
                          )}
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            p.disponible
                              ? p.stock_disponible > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {p.disponible ? (p.stock_disponible > 0 ? 'Activo' : 'Agotado') : 'Deshabilitado'}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {p.categorias.length === 0 ? (
                          <span className="text-slate-400 text-xs">—</span>
                        ) : (
                          p.categorias.map(pc => (
                            <span
                              key={pc.categoria?.id ?? Math.random()}
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${pc.es_principal ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'}`}
                            >
                              {pc.categoria?.nombre ?? '—'}{pc.es_principal && ' ★'}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end items-center">
                        {isDeleted ? (
                          (isAdmin || isProductManager) && (
                            <button
                              onClick={() => reactivarMutation.mutate(p.id)}
                              disabled={reactivarMutation.isPending}
                              className="flex items-center gap-1.5 text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                            >
                              <RefreshCw className="w-4 h-4" />Reactivar
                            </button>
                          )
                        ) : (
                          <>
                            {(isAdmin || isProductManager) && (
                              <>
                                <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-sm">Editar</button>
                                <button
                                  onClick={() => deleteMutation.mutate(p.id)}
                                  disabled={deleteMutation.isPending}
                                  className="text-red-500 hover:underline text-sm disabled:opacity-50"
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                            <Link to={`/productos/${p.id}`} className="text-orange-500 hover:underline text-sm">Ver</Link>
                          </>
                        )}
                      </div>
                    </td>
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
          {page > 1 ? `Página ${page} · ` : ''}{productos.length} resultado{productos.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4" />Anterior
          </button>
          <button onClick={() => setPage(p => p + 1)} disabled={productos.length < PAGE_SIZE}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
            Siguiente<ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal crear/editar — 2 columnas */}
      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Editar Producto' : 'Nuevo Producto'} variant="large">
        {modalError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{modalError}</p>}
        <div className="grid grid-cols-2 gap-6">
          {/* Columna izquierda: datos básicos */}
          <div className="flex flex-col gap-4">
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
                rows={3}
                placeholder="Descripción opcional..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Precio base *</label>
              <input
                type="number" min={0} step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.precio_base}
                onChange={e => setForm(f => ({ ...f, precio_base: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox" checked={form.disponible}
                onChange={e => setForm(f => ({ ...f, disponible: e.target.checked }))}
                className="w-4 h-4 accent-orange-500"
              />
              Disponible
            </label>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Imágenes ({(form.imagenes_url ?? []).length}/5)
              </label>
              <ImageUpload
                value={form.imagenes_url ?? []}
                onChange={(urls) => setForm(f => ({ ...f, imagenes_url: urls }))}
                multiple
                maxImages={5}
                folder="foodstore/productos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Categorías{form.categoria_ids.length > 0 && ` (${form.categoria_ids.length} seleccionada${form.categoria_ids.length !== 1 ? 's' : ''})`}
              </label>
              {/* Chips de seleccionadas */}
              <div className="flex flex-wrap gap-1 mb-2 min-h-[1.75rem]">
                {form.categoria_ids.length === 0 ? (
                  <span className="text-slate-400 text-xs">Ninguna categoría seleccionada</span>
                ) : form.categoria_ids.map(catId => {
                  const cat = categorias.find(c => c.id === catId);
                  return cat ? (
                    <span key={cat.id} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                      {cat.nombre}
                      <button
                        type="button"
                        onClick={() => toggleCategoria(cat.id)}
                        className="hover:bg-orange-200 rounded-full p-0.5 leading-none"
                      >×</button>
                    </span>
                  ) : null;
                })}
              </div>
              {/* Buscador */}
              <input
                type="text"
                value={categoriaSearch}
                onChange={e => setCategoriaSearch(e.target.value)}
                placeholder="Buscar categoría..."
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              {/* Lista con checkboxes */}
              <div className="border border-slate-300 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                {categoriasOrdenadas
                  .filter(c => !categoriaSearch || c.nombre.toLowerCase().includes(categoriaSearch.toLowerCase()))
                  .map(cat => {
                    const isSelected = form.categoria_ids.includes(cat.id);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => toggleCategoria(cat.id)}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm ${isSelected ? 'bg-orange-50' : ''} ${cat.parent_id ? 'pl-6' : ''}`}
                      >
                        <input type="checkbox" readOnly checked={isSelected} className="w-3.5 h-3.5 accent-orange-500 shrink-0" />
                        {cat.parent_id && <span className="text-slate-400 text-xs">⤷</span>}
                        <span className={isSelected ? 'font-medium text-orange-700' : 'text-slate-700'}>{cat.nombre}</span>
                      </div>
                    );
                  })}
                {categorias.length === 0 && (
                  <p className="px-3 py-2 text-slate-400 text-xs">Sin categorías disponibles</p>
                )}
              </div>
            </div>
          </div>

          {/* Columna derecha: ingredientes */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-slate-700">Ingredientes</p>

            {/* Buscador de ingredientes */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={ingSearch}
                onChange={e => setIngSearch(e.target.value)}
                placeholder="Buscar ingrediente..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            {/* Lista de ingredientes disponibles */}
            <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-36 divide-y divide-slate-100">
              {ingredientesModal.length === 0 && (
                <p className="px-3 py-2 text-slate-400 text-xs">Sin resultados</p>
              )}
              {ingredientesModal.map(ing => {
                const sel = form.ingredientes.find(pi => pi.ingrediente_id === ing.id);
                return (
                  <div
                    key={ing.id}
                    onClick={() => toggleIngrediente(ing.id)}
                    className={`flex justify-between items-center px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 ${sel ? 'bg-orange-50' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <input type="checkbox" readOnly checked={!!sel} className="w-3.5 h-3.5 accent-orange-500" />
                      <span className={sel ? 'font-medium text-orange-700' : 'text-slate-700'}>{ing.nombre}</span>
                      {ing.es_alergeno && <span className="text-xs text-red-400">⚠</span>}
                    </div>
                    <span className="text-xs text-slate-400">{ing.stock_actual} {ing.unidad}</span>
                  </div>
                );
              })}
            </div>

            {/* Ingredientes seleccionados */}
            {form.ingredientes.length > 0 && (
              <>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Seleccionados ({form.ingredientes.length})
                </p>
                <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-48 divide-y divide-slate-100">
                  {form.ingredientes.map(pi => {
                    const ing = ingredientesModal.find(i => i.id === pi.ingrediente_id)
                      ?? editing?.ingredientes.find(i => i.ingrediente.id === pi.ingrediente_id)?.ingrediente;
                    return (
                      <div key={pi.ingrediente_id} className="px-3 py-2 flex items-center gap-2 text-sm">
                        <span className="flex-1 font-medium text-slate-700 text-xs">{ing?.nombre ?? `ID ${pi.ingrediente_id}`}</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={pi.cantidad}
                          onChange={e => updateIngProp(pi.ingrediente_id, 'cantidad', parseFloat(e.target.value) || 0)}
                          className="w-20 border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                        />
                        <span className="text-xs text-slate-400 w-10">{ing?.unidad ?? ''}</span>
                        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pi.es_removible}
                            onChange={e => updateIngProp(pi.ingrediente_id, 'es_removible', e.target.checked)}
                            className="w-3 h-3 accent-orange-500"
                          />
                          Removible
                        </label>
                        <button
                          onClick={() => toggleIngrediente(pi.ingrediente_id)}
                          className="text-slate-400 hover:text-red-500 ml-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100">
          <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending || form.ingredientes.length === 0}
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
