import { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getFormasPago } from '../api/formas_pago';
import { getDirecciones } from '../api/direcciones';
import { createPedido } from '../api/pedidos';
import { useCarritoStore } from '../store/carritoStore';
import type { Direccion } from '../types';

const COSTO_ENVIO = 50;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, vaciarCarrito, subtotal } = useCarritoStore();

  const [formaPago, setFormaPago] = useState('');
  const [direccionId, setDireccionId] = useState<number | null>(null);
  const [notas, setNotas] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: formasPago = [] } = useQuery({
    queryKey: ['formas-pago'],
    queryFn: getFormasPago,
  });

  const { data: direcciones = [] } = useQuery<Direccion[]>({
    queryKey: ['direcciones'],
    queryFn: getDirecciones,
  });

  // Preselect the principal address when data loads
  useEffect(() => {
    if (direcciones.length > 0 && direccionId === null) {
      const principal = direcciones.find((d) => d.es_principal);
      setDireccionId(principal?.id ?? direcciones[0].id);
    }
  }, [direcciones, direccionId]);

  const mutation = useMutation({
    mutationFn: createPedido,
    onSuccess: (pedido) => {
      vaciarCarrito();
      setTimeout(() => navigate(`/mis-pedidos/${pedido.id}`), 1500);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message);
    },
  });

  // Only redirect when cart is empty and there is no active/completed checkout
  if (items.length === 0 && !mutation.isPending && !mutation.isSuccess) {
    return <Navigate to="/carrito" replace />;
  }

  const esEfectivo = formaPago === 'EFECTIVO';
  const costoEnvio = esEfectivo ? 0 : COSTO_ENVIO;
  const sub = subtotal();
  const total = sub + costoEnvio;

  const handleConfirmar = () => {
    setErrorMsg(null);
    if (!formaPago) {
      setErrorMsg('Seleccioná una forma de pago.');
      return;
    }
    if (!esEfectivo && !direccionId) {
      setErrorMsg('Seleccioná una dirección de entrega.');
      return;
    }
    mutation.mutate({
      direccion_id: esEfectivo ? undefined : (direccionId ?? undefined),
      forma_pago_codigo: formaPago,
      notas: notas.trim() || undefined,
      items: items.map((i) => ({
        producto_id: i.producto_id,
        cantidad: i.cantidad,
        personalizacion: i.personalizacion.length > 0 ? i.personalizacion : undefined,
      })),
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Checkout</h1>

      {mutation.isSuccess && (
        <div className="bg-green-100 border border-green-300 text-green-800 rounded-xl px-5 py-3 mb-6 font-medium">
          ¡Pedido creado exitosamente! Redirigiendo...
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-5 py-3 mb-6 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Izquierda */}
        <div className="flex-1 space-y-5">
          {/* Forma de pago */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-4">Forma de pago</h2>
            <div className="space-y-2">
              {formasPago
                .filter((fp) => fp.habilitado)
                .map((fp) => (
                  <label
                    key={fp.codigo}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 border border-transparent transition-colors"
                    style={formaPago === fp.codigo ? { borderColor: '#f97316', backgroundColor: '#fff7ed' } : {}}
                  >
                    <input
                      type="radio"
                      name="forma_pago"
                      value={fp.codigo}
                      checked={formaPago === fp.codigo}
                      onChange={() => setFormaPago(fp.codigo)}
                      className="accent-orange-500"
                    />
                    <span className="text-sm text-slate-700 font-medium">{fp.descripcion}</span>
                    <span className="text-xs text-slate-400 ml-auto">{fp.codigo}</span>
                  </label>
                ))}
              {formasPago.length === 0 && (
                <p className="text-slate-400 text-sm">Cargando formas de pago...</p>
              )}
            </div>
          </div>

          {/* Dirección */}
          {!esEfectivo && formaPago && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="font-bold text-slate-800 mb-4">Dirección de entrega</h2>
              {direcciones.length > 0 ? (
                <select
                  value={direccionId ?? ''}
                  onChange={(e) => setDireccionId(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Seleccioná una dirección</option>
                  {direcciones.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.alias ? `${d.alias} — ` : ''}{d.linea1}, {d.ciudad}
                      {d.es_principal ? ' (Principal)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-slate-500">
                  No tenés direcciones guardadas.{' '}
                  <Link to="/mis-direcciones" className="text-orange-500 hover:underline">
                    Agregar una
                  </Link>
                </p>
              )}
            </div>
          )}

          {/* Notas */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-3">Notas (opcional)</h2>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Instrucciones especiales, aclaraciones..."
              rows={3}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:w-80">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sticky top-4">
            <h2 className="font-bold text-slate-800 text-lg mb-4">Resumen del pedido</h2>

            <div className="space-y-2 mb-4">
              {items.map((item, idx) => (
                <div key={`${item.producto_id}-${idx}`} className="flex justify-between text-sm text-slate-600">
                  <span className="truncate flex-1 mr-2">
                    {item.nombre} × {item.cantidad}
                  </span>
                  <span className="flex-shrink-0 font-medium">
                    ${(item.precio * item.cantidad).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>${sub.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Costo de envío</span>
                <span>{costoEnvio === 0 ? 'Gratis' : `$${costoEnvio.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 text-base pt-1 border-t border-slate-100">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmar}
              disabled={mutation.isPending || mutation.isSuccess}
              className="w-full mt-5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-2.5 rounded-lg font-medium transition-colors"
            >
              {mutation.isPending ? 'Procesando...' : 'Confirmar pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
