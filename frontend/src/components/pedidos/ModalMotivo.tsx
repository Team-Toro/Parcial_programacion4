import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export default function ModalMotivo({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  isLoading = false,
}: Props) {
  const [motivo, setMotivo] = useState('');

  if (!isOpen) return null;

  const puedeConfirmar = motivo.trim().length >= 5 && !isLoading;

  const handleConfirm = () => {
    if (puedeConfirmar) {
      onConfirm(motivo.trim());
      setMotivo('');
    }
  };

  const handleClose = () => {
    setMotivo('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-1">{title}</h2>
        {description && <p className="text-sm text-slate-500 mb-4">{description}</p>}

        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ingresá el motivo (mínimo 5 caracteres)..."
          rows={4}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-4"
        />

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!puedeConfirmar}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium disabled:bg-red-300"
          >
            {isLoading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
