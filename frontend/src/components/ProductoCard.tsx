import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check } from 'lucide-react';
import type { Producto } from '../types';
import { useCarritoStore } from '../store/carritoStore';
import { useAuthStore } from '../store/authStore';
import { cloudinaryTransform } from '../lib/cloudinary';

interface Props {
  producto: Producto;
}

export default function ProductoCard({ producto }: Props) {
  const { agregarItem } = useCarritoStore();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = user !== null;
  const isStaff = useAuthStore((s) => s.isStaff());
  const [added, setAdded] = useState(false);

  const canAdd = isAuthenticated && !isStaff && producto.disponible && producto.stock_disponible > 0;

  const handleAgregar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    agregarItem({
      producto_id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio_base),
      cantidad: 1,
      imagen_url: producto.imagenes_url?.[0],
      personalizacion: [],
      ingredientes_removibles: producto.ingredientes
        .filter((pi) => pi.es_removible)
        .map((pi) => ({ id: pi.ingrediente.id, nombre: pi.ingrediente.nombre })),
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const btnLabel = !producto.disponible
    ? 'No disponible'
    : producto.stock_disponible === 0
    ? 'Sin stock'
    : isStaff
    ? 'Solo para clientes'
    : !isAuthenticated
    ? 'Iniciar sesión para comprar'
    : 'Agregar al carrito';

  return (
    <Link
      to={`/productos/${producto.id}`}
      className={`group block rounded-2xl overflow-hidden shadow hover:shadow-lg transition-shadow ${
        !producto.disponible || producto.stock_disponible === 0 ? 'opacity-70' : ''
      }`}
    >
      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
        {producto.imagenes_url?.[0] ? (
          <img
            src={cloudinaryTransform(producto.imagenes_url[0], 400)}
            alt={producto.nombre}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-slate-100">
            <ShoppingCart className="w-12 h-12 text-orange-200" />
          </div>
        )}
      </div>

      <div className="bg-white p-4 flex flex-col gap-2">
        <p className="font-semibold text-slate-800 text-sm line-clamp-1">{producto.nombre}</p>
        <p className="text-orange-500 font-bold text-lg">
          ${Number(producto.precio_base).toLocaleString('es-AR')}
        </p>
        <button
          onClick={canAdd ? handleAgregar : undefined}
          disabled={!canAdd}
          className={`mt-1 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            added
              ? 'bg-green-500 text-white'
              : canAdd
              ? 'bg-orange-500 hover:bg-orange-600 text-white'
              : 'bg-slate-100 text-slate-400 cursor-default'
          }`}
        >
          {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          {added ? '¡Agregado!' : btnLabel}
        </button>
      </div>
    </Link>
  );
}
