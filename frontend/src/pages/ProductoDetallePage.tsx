import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart } from 'lucide-react';
import { getProductoById } from '../api/productos';
import { useAuthStore } from '../store/authStore';
import { useCarritoStore } from '../store/carritoStore';

function StockBadge({ value }: { value: number }) {
  const color =
    value === 0 ? 'text-red-600 font-semibold' :
    value < 5   ? 'text-amber-600 font-semibold' :
                  'text-green-700 font-semibold';
  return <span className={color}>{value}</span>;
}

export default function ProductoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = user !== null;
  const isAdmin = useAuthStore((s) => s.isAdmin());
  const isStaff = useAuthStore((s) => s.isStaff());

  const { data: producto, isLoading, isError } = useQuery({
    queryKey: ['producto', Number(id)],
    queryFn: () => getProductoById(Number(id)),
    enabled: !!id,
  });

  const [cantidad, setCantidad] = useState(1);
  const [removidos, setRemovidos] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { agregarItem, totalItems } = useCarritoStore();

  if (isLoading) return <div className="p-8 text-slate-500">Cargando producto...</div>;
  if (isError || !producto) return <div className="p-8 text-red-500">Producto no encontrado.</div>;

  const canComprar = isAuthenticated && !isStaff && producto.disponible && producto.stock_disponible > 0;

  const toggleRemovido = (ingId: number) =>
    setRemovidos((prev) =>
      prev.includes(ingId) ? prev.filter((x) => x !== ingId) : [...prev, ingId]
    );

  const handleAgregarCarrito = () => {
    agregarItem({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio_base),
      cantidad,
      imagen_url: producto.imagenes_url?.[0],
      personalizacion: removidos,
      ingredientes_removibles: producto.ingredientes
        .filter((pi) => pi.es_removible)
        .map((pi) => ({ id: pi.ingrediente.id, nombre: pi.ingrediente.nombre })),
    });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    const itemLabel = cantidad === 1 ? 'item' : 'items';
    setToast(`Agregado al carrito (${cantidad} ${itemLabel})`);
    setToastVisible(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setToastVisible(true)));
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-8 max-w-3xl mx-auto">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 ${
            toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          {toast}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <Link to="/productos" className="text-orange-500 hover:underline text-sm">
          &larr; Volver a productos
        </Link>
        {isAdmin && (
          <Link
            to={`/productos`}
            className="text-sm bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Editar
          </Link>
        )}
      </div>
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold text-slate-800">{producto.nombre}</h1>
          <div className="flex gap-2">
            {producto.stock_cantidad === 0 && producto.disponible && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Sin stock</span>
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              producto.disponible
                ? producto.stock_cantidad > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                : 'bg-red-100 text-red-600'
            }`}>
              {producto.disponible ? (producto.stock_cantidad > 0 ? 'Disponible' : 'Agotado') : 'Deshabilitado'}
            </span>
          </div>
        </div>

        <p className="text-slate-500 mb-4">{producto.descripcion ?? 'Sin descripción.'}</p>

        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <p className="text-2xl font-bold text-orange-500">${Number(producto.precio_base).toFixed(2)}</p>
          {isAdmin && (
            <span className="text-sm bg-slate-100 px-3 py-1 rounded-full">
              Stock disponible: <StockBadge value={producto.stock_disponible} />
            </span>
          )}
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Categorías</h3>
          <div className="flex gap-2 flex-wrap">
            {producto.categorias.length === 0 ? (
              <span className="text-slate-400 text-sm">Sin categorías</span>
            ) : (
              producto.categorias.map(pc => (
                <span
                  key={pc.categoria?.id ?? Math.random()}
                  className={`text-xs px-3 py-1 rounded-full font-medium ${pc.es_principal ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'}`}
                >
                  {pc.categoria?.nombre ?? 'Categoría'}{pc.es_principal && ' ★'}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">Ingredientes</h3>
          {producto.ingredientes.length === 0 ? (
            <span className="text-slate-400 text-sm">Sin ingredientes</span>
          ) : (
            <ul className="divide-y divide-slate-100">
              {producto.ingredientes.map(pi => (
                <li key={pi.ingrediente.id} className="py-2 flex justify-between items-center text-sm">
                  <span className="text-slate-700 font-medium">
                    {pi.ingrediente.nombre}
                    {pi.ingrediente.es_alergeno && (
                      <span className="ml-2 text-xs text-red-500 font-semibold">⚠ Alérgeno</span>
                    )}
                  </span>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-slate-500">{pi.cantidad} {pi.ingrediente.unidad}</span>
                    {pi.es_removible && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Removible</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Carrito section — oculto para admin */}
        {!isAdmin && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            {canComprar ? (
              <>
                {producto.ingredientes.some((pi) => pi.es_removible) && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
                      Personalizar (quitar ingredientes)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {producto.ingredientes
                        .filter((pi) => pi.es_removible)
                        .map((pi) => (
                          <label
                            key={pi.ingrediente.id}
                            className="flex items-center gap-1.5 cursor-pointer text-sm text-slate-600"
                          >
                            <input
                              type="checkbox"
                              checked={removidos.includes(pi.ingrediente.id)}
                              onChange={() => toggleRemovido(pi.ingrediente.id)}
                              className="w-4 h-4 accent-orange-500"
                            />
                            Sin {pi.ingrediente.nombre}
                          </label>
                        ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                      className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-bold"
                    >−</button>
                    <span className="px-4 py-2 text-sm font-medium">{cantidad}</span>
                    <button
                      onClick={() => setCantidad((c) => Math.min(producto.stock_disponible, c + 1))}
                      className="px-3 py-2 text-slate-600 hover:bg-slate-100 font-bold"
                    >+</button>
                  </div>
                  <button
                    onClick={handleAgregarCarrito}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Agregar al carrito
                  </button>
                </div>
              </>
            ) : !isAuthenticated ? (
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-center">
                <p className="text-slate-700 text-sm mb-3">Iniciá sesión para poder agregar productos al carrito.</p>
                <Link
                  to="/login"
                  className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
                >
                  Iniciar sesión
                </Link>
              </div>
            ) : isStaff ? (
              <p className="text-slate-500 font-medium text-sm">Tu rol no permite realizar compras.</p>
            ) : !producto.disponible ? (
              <p className="text-red-500 font-medium text-sm">Producto no disponible</p>
            ) : (
              <p className="text-red-500 font-medium text-sm">Sin stock disponible</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
