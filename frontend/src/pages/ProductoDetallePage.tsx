import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProductoById } from '../api/productos';

export default function ProductoDetallePage() {
  const { id } = useParams<{ id: string }>();

  const { data: producto, isLoading, isError } = useQuery({
    queryKey: ['producto', Number(id)],
    queryFn: () => getProductoById(Number(id)),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-slate-500">Cargando producto...</div>;
  if (isError || !producto) return <div className="p-8 text-red-500">Producto no encontrado.</div>;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link to="/productos" className="text-orange-500 hover:underline text-sm mb-4 inline-block">
        &larr; Volver a productos
      </Link>
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold text-slate-800">{producto.nombre}</h1>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              producto.disponible
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-600'
            }`}
          >
            {producto.disponible ? 'Disponible' : 'No disponible'}
          </span>
        </div>
        <p className="text-slate-500 mb-4">{producto.descripcion ?? 'Sin descripción.'}</p>
        <div className="flex items-center gap-4 mb-6">
          <p className="text-2xl font-bold text-orange-500">
            ${Number(producto.precio_base).toFixed(2)}
          </p>
          {producto.tiempo_prep_min != null && (
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              ⏱ {producto.tiempo_prep_min} min
            </span>
          )}
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
            Categorías
          </h3>
          <div className="flex gap-2 flex-wrap">
            {producto.categorias.length === 0 ? (
              <span className="text-slate-400 text-sm">Sin categorías</span>
            ) : (
              producto.categorias.map(pc => (
                <span
                  key={pc.categoria?.id ?? Math.random()}
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    pc.es_principal
                      ? 'bg-orange-500 text-white'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {pc.categoria?.nombre ?? 'Categoría'}
                  {pc.es_principal && ' ★'}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">
            Ingredientes
          </h3>
          {producto.ingredientes.length === 0 ? (
            <span className="text-slate-400 text-sm">Sin ingredientes</span>
          ) : (
            <ul className="divide-y divide-slate-100">
              {producto.ingredientes.map(pi => (
                <li key={pi.ingrediente.id} className="py-2 flex justify-between items-center text-sm">
                  <span className="text-slate-700 font-medium">
                    {pi.ingrediente.nombre}
                    {pi.ingrediente.es_alergeno && (
                      <span className="ml-2 text-xs text-red-500 font-semibold">⚠ Alérgeno</span>
                    )}
                  </span>
                  <div className="flex gap-2">
                    {pi.es_removible && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Removible
                      </span>
                    )}
                    {pi.es_opcional && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        Opcional
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
