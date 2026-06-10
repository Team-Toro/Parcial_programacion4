import { useUiStore } from '../store/uiStore';

const TYPE_CLASSES: Record<string, string> = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warning: 'bg-yellow-500 text-white',
};

export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium cursor-pointer
            animate-in fade-in slide-in-from-bottom-2 duration-200
            ${TYPE_CLASSES[toast.type] ?? 'bg-slate-700 text-white'}`}
          role="alert"
        >
          <span>{toast.message}</span>
          <button
            onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
            className="ml-2 opacity-70 hover:opacity-100 leading-none text-lg"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
