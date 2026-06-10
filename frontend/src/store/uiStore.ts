import { create } from 'zustand';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface UiState {
  toasts: Toast[];
  isGlobalLoading: boolean;
  activeModalId: string | null;

  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: number) => void;
  setGlobalLoading: (loading: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

let toastId = 0;

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  isGlobalLoading: false,
  activeModalId: null,

  addToast: (type, message) => {
    const id = ++toastId;
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
  openModal: (id) => set({ activeModalId: id }),
  closeModal: () => set({ activeModalId: null }),
}));
