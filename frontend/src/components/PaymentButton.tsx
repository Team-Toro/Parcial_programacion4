import { useState } from 'react';
import { crearPreferencia } from '../api/pagos';
import { usePaymentStore } from '../store/paymentStore';

interface Props {
  pedidoId: number;
  onError?: (msg: string) => void;
}

export default function PaymentButton({ pedidoId, onError }: Props) {
  const [loading, setLoading] = useState(false);
  const { setStatus, setPedidoActivo, setError } = usePaymentStore();

  const handlePagar = async () => {
    setLoading(true);
    setStatus('creating_preference');
    try {
      const res = await crearPreferencia(pedidoId);
      setPedidoActivo(pedidoId, res.preference_id, res.init_point);
      window.location.href = res.init_point;
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Error al crear la preferencia de pago';
      setError(msg);
      onError?.(msg);
    }
  };

  return (
    <button
      onClick={handlePagar}
      disabled={loading}
      className="w-full bg-[#009ee3] hover:bg-[#007dc3] disabled:bg-[#7fc8ee] text-white py-3 rounded-lg font-semibold text-base transition-colors"
    >
      {loading ? 'Redirigiendo a MercadoPago...' : 'Pagar con MercadoPago'}
    </button>
  );
}
