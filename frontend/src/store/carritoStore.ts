import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ItemCarrito } from '../types';

interface CarritoState {
  items: ItemCarrito[];
  agregarItem: (item: ItemCarrito) => void;
  removerItem: (producto_id: number, personalizacion: number[]) => void;
  actualizarCantidad: (producto_id: number, personalizacion: number[], cantidad: number) => void;
  actualizarPersonalizacion: (producto_id: number, personalizacion: number[]) => void;
  vaciarCarrito: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useCarritoStore = create<CarritoState>()(
  persist(
    (set, get) => ({
      items: [],
      agregarItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) =>
              i.producto_id === item.producto_id &&
              JSON.stringify([...i.personalizacion].sort()) ===
                JSON.stringify([...item.personalizacion].sort())
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i === existing ? { ...i, cantidad: i.cantidad + item.cantidad } : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removerItem: (producto_id, personalizacion) =>
        set((state) => ({
          items: state.items.filter(
            (i) =>
              !(
                i.producto_id === producto_id &&
                JSON.stringify([...i.personalizacion].sort()) ===
                  JSON.stringify([...personalizacion].sort())
              )
          ),
        })),
      actualizarCantidad: (producto_id, personalizacion, cantidad) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              i.producto_id === producto_id &&
              JSON.stringify([...i.personalizacion].sort()) ===
                JSON.stringify([...personalizacion].sort())
                ? { ...i, cantidad }
                : i
            )
            .filter((i) => i.cantidad > 0),
        })),
      actualizarPersonalizacion: (producto_id, personalizacion) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.producto_id === producto_id ? { ...i, personalizacion } : i
          ),
        })),
      vaciarCarrito: () => set({ items: [] }),
      totalItems: () => get().items.reduce((acc, i) => acc + i.cantidad, 0),
      subtotal: () =>
        get().items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
    }),
    { name: 'carrito-storage' }
  )
);
