import { useNavigate, Link } from 'react-router-dom';
import type { Categoria } from '../types';

interface Props {
  categoria: Categoria;
}

export default function CategoriaCard({ categoria }: Props) {
  const navigate = useNavigate();
  const hasChildren = (categoria.subcategorias ?? []).length > 0;

  const inner = (
    <div className="aspect-[4/3] relative overflow-hidden">
      {categoria.imagen_url ? (
        <>
          <img
            src={categoria.imagen_url}
            alt={categoria.nombre}
            className="w-full h-full object-cover group-hover:brightness-110 transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-orange-400 to-orange-600" />
      )}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-bold text-lg leading-tight drop-shadow">{categoria.nombre}</p>
        {categoria.descripcion && (
          <p className="text-white/80 text-xs mt-1 line-clamp-2 drop-shadow">{categoria.descripcion}</p>
        )}
        {hasChildren && (
          <p className="text-white/60 text-xs mt-1 drop-shadow">
            {categoria.subcategorias!.length} subcategoría{categoria.subcategorias!.length !== 1 ? 's' : ''}
          </p>
        )}
        {!hasChildren && categoria.productos_count !== undefined && (
          <p className="text-white/60 text-xs mt-1 drop-shadow">
            {categoria.productos_count} producto{categoria.productos_count !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );

  if (hasChildren) {
    return (
      <button
        onClick={() => navigate(`/categorias?parent_id=${categoria.id}`)}
        className="group block rounded-2xl overflow-hidden shadow hover:shadow-lg transition-all duration-200 hover:scale-[1.02] w-full text-left"
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      to={`/productos?categoria_id=${categoria.id}`}
      className="group block rounded-2xl overflow-hidden shadow hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
    >
      {inner}
    </Link>
  );
}
