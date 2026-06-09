import { useState } from 'react';
import { crearPreferencia } from '../api/pagos';

interface Props {
  pedidoId: number;
  onError?: (msg: string) => void;
}

export default function PaymentButton({ pedidoId, onError }: Props) {
  const [loading, setLoading] = useState(false);

  const handlePagar = async () => {
    setLoading(true);
    try {
      const res = await crearPreferencia(pedidoId);
      window.location.href = res.init_point;
    } catch (err) {
      setLoading(false);
      onError?.(err instanceof Error ? err.message : 'Error al crear la preferencia de pago');
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
