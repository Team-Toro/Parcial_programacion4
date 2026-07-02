import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductoCard from '../components/ProductoCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, X, RotateCcw, ChevronLeft, ChevronRight,
  Package, SearchX, RefreshCw,
} from 'lucide-react';
import {
  getProductos,
  deleteProducto, reactivarProducto,
} from '../api/productos';
import type { Producto } from '../types';
import { SkeletonTable } from '../components/Skeleton';
import { useDebounce } from '../hooks/useDebounce';
import { useAuthStore } from '../store/authStore';
import EditProductoModal from '../components/productos/EditProductoModal';

const PAGE_SIZE = 12;


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
  const isAdminView = isAdmin || isProductManager;
  const [searchParams] = useSearchParams();
  const categoriaIdParam = searchParams.get('categoria_id');

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);

  // Filtros de tabla
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('nombre');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);

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
    categoria_id: !isAdminView && categoriaIdParam ? Number(categoriaIdParam) : undefined,
  };

  const hasActiveFilters = searchInput.trim() !== '' || sortBy !== 'nombre' || sortOrder !== 'asc';
  const clearFilters = () => { setSearchInput(''); setSortBy('nombre'); setSortOrder('asc'); setPage(1); };

  const { data: productos = [], isLoading, isError, isFetching } = useQuery({
    queryKey: ['productos', params],
    queryFn: () => getProductos(params),
    placeholderData: (prev) => prev,
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

  const openCreate = () => { setEditing(null); setIsOpen(true); };
  const openEdit = (p: Producto) => { setEditing(p); setIsOpen(true); };
  const closeModal = () => { setIsOpen(false); setEditing(null); };

  const sortValue = `${sortBy}-${sortOrder}`;
  const handleSortChange = (value: string) => {
    const parts = value.split('-');
    setSortBy(parts[0] as SortField);
    setSortOrder(parts[1] as SortOrder);
  };

  const deletedCount = productos.filter(p => p.deleted_at).length;

  if (isLoading) return (
    <div className="px-4 sm:px-6 lg:px-12 xl:px-16 py-8 max-w-screen-2xl mx-auto">
      <div className="h-9 w-40 bg-gray-200 animate-pulse rounded mb-6" />
      <SkeletonTable rows={8} cols={7} />
    </div>
  );
  if (isError) return <div className="p-8 text-red-500">Error al cargar los productos.</div>;

  if (!isAdminView) {
    return (
      <div className="px-4 sm:px-6 lg:px-12 xl:px-16 py-8 max-w-screen-2xl mx-auto">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
          <h1 className="text-2xl font-bold text-slate-800">Productos</h1>
          {categoriaIdParam && (
            <Link to="/categorias" className="text-sm text-orange-500 hover:underline">
              ← Ver categorías
            </Link>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl shadow border border-slate-200 mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={sortValue}
              onChange={(e) => handleSortChange(e.target.value)}
              className="py-2 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="nombre-asc">Nombre A–Z</option>
              <option value="nombre-desc">Nombre Z–A</option>
              <option value="precio_base-asc">Precio menor</option>
              <option value="precio_base-desc">Precio mayor</option>
            </select>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50">
                <RotateCcw className="w-3.5 h-3.5" />Limpiar
              </button>
            )}
          </div>
        </div>

        {isFetching && !isLoading && (
          <p className="text-xs text-slate-400 mb-3 px-1">Actualizando...</p>
        )}

        {productos.length === 0 ? (
          <div className="text-center py-16">
            <SearchX className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {searchInput
                ? 'No se encontraron productos.'
                : categoriaIdParam
                  ? 'No hay productos en esta categoría.'
                  : 'No hay productos disponibles.'}
            </p>
            {!searchInput && categoriaIdParam && (
              <Link to="/categorias" className="mt-4 inline-block text-sm text-orange-500 hover:underline">
                ← Ver todas las categorías
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {productos.map((p) => (
              <ProductoCard key={p.id} producto={p} />
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mt-6 px-2">
          <p className="text-sm text-slate-600">
            {productos.length} resultado{productos.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={productos.length < PAGE_SIZE}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                    <td className="px-6 py-4 text-slate-700 font-semibold">${Number(p.precio_final).toFixed(2)}</td>
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

      <EditProductoModal
        producto={editing}
        isOpen={isOpen}
        onClose={closeModal}
        onSuccess={() => showToast('success', editing ? 'Producto actualizado' : 'Producto creado')}
      />

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
