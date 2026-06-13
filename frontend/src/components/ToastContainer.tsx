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
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => removeToast(toast.id)}
          className={`px-6 py-3 rounded-full shadow-xl text-base font-semibold cursor-pointer whitespace-nowrap
            animate-in fade-in slide-in-from-top-4 duration-200
            ${TYPE_CLASSES[toast.type] ?? 'bg-slate-700 text-white'}`}
          role="alert"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
