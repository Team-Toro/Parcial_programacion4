import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  variant?: 'default' | 'large';
}

export default function Modal({ isOpen, onClose, title, children, variant = 'default' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = variant === 'large'
    ? 'w-full max-w-5xl max-h-[90vh]'
    : 'w-full max-w-lg';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-2xl ${sizeClass} flex flex-col`}>
        <div className="flex justify-between items-center px-6 py-4 border-b shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <div className={`px-6 py-4 ${variant === 'large' ? 'overflow-y-auto' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
