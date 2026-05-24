import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { useCarritoStore } from '../store/carritoStore';
import { useAuthStore } from '../store/authStore';

export default function CarritoPage() {
  const { items, removerItem, actualizarCantidad, vaciarCarrito, totalItems, subtotal } =
    useCarritoStore();
  const navigate = useNavigate();
  const isStaff = useAuthStore((s) => s.isStaff());

  const total = totalItems();

  if (isStaff) {
    return (
      <div className="px-4 sm:px-6 lg:px-12 py-16 max-w-3xl mx-auto text-center">
        <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-700 mb-2">Carrito no disponible</h1>
        <p className="text-slate-500 mb-6">Tu rol no tiene acceso al carrito.</p>
        <Link
          to="/productos"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-12 py-16 max-w-3xl mx-auto text-center">
        <ShoppingCart className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-700 mb-2">Tu carrito está vacío</h1>
        <p className="text-slate-500 mb-6">Explorá nuestros productos y agregá algo rico.</p>
        <Link
          to="/productos"
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        Mi carrito ({total} {total === 1 ? 'item' : 'items'})
      </h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Lista de items */}
        <div className="flex-1 space-y-3">
          {items.map((item, idx) => (
            <div
              key={`${item.producto_id}-${idx}`}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex gap-4 items-start"
            >
              {/* Imagen */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                {item.imagen_url ? (
                  <img
                    src={item.imagen_url}
                    alt={item.nombre}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 truncate">{item.nombre}</h3>
                <p className="text-sm text-slate-500">${item.precio.toFixed(2)} c/u</p>
                {item.personalizacion.length > 0 && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sin:{' '}
                    {item.personalizacion
                      .map(
                        (id) =>
                          item.ingredientes_removibles.find((ir) => ir.id === id)?.nombre ?? id
                      )
                      .join(', ')}
                  </p>
                )}

                {/* Selector de cantidad */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1)}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-sm"
                    >
                      −
                    </button>
                    <span className="px-3 py-1 text-sm font-medium">{item.cantidad}</span>
                    <button
                      onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1)}
                      className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-bold text-sm"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removerItem(item.producto_id)}
                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                    title="Quitar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-slate-800">
                  ${(item.precio * item.cantidad).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="lg:w-72">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky top-4">
            <h2 className="font-bold text-slate-800 text-lg mb-4">Resumen</h2>
            <div className="flex justify-between text-sm text-slate-600 mb-2">
              <span>Subtotal</span>
              <span>${subtotal().toFixed(2)}</span>
            </div>
            <div className="border-t border-slate-100 my-3" />
            <div className="flex justify-between font-bold text-slate-800 mb-5">
              <span>Total estimado</span>
              <span>${subtotal().toFixed(2)}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg font-medium transition-colors mb-2"
            >
              Continuar al checkout
            </button>
            <button
              onClick={vaciarCarrito}
              className="w-full text-sm text-slate-500 hover:text-red-500 py-2 transition-colors"
            >
              Vaciar carrito
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
