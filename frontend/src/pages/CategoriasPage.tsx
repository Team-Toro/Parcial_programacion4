import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategorias, getCategoriaStats, createCategoria, updateCategoria, deleteCategoria } from '../api/categorias';
import { Categoria, CategoriaCreate } from '../types';
import Modal from '../components/ui/Modal';

const getCategoriaLevel = (cat: Categoria, categorias: Categoria[]): number => {
  let level = 0;
  let current = cat;
  while (current.parent_id) {
    level++;
    const parent = categorias.find(c => c.id === current.parent_id);
    if (!parent) break;
    current = parent;
  }
  return level;
};

const sortCategorias = (categorias: Categoria[]): Categoria[] => {
  return [...categorias].sort((a, b) => {
    const aGroup = a.parent_id ?? a.id;
    const bGroup = b.parent_id ?? b.id;
    
    if (aGroup !== bGroup) {
      return aGroup - bGroup;
    }
    
    if (a.parent_id === null && b.parent_id !== null) return -1;
    if (a.parent_id !== null && b.parent_id === null) return 1;
    
    return a.nombre.localeCompare(b.nombre);
  });
};

const MAX_LEVEL = 2;

export default function CategoriasPage() {
  const qc = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState<CategoriaCreate>({ nombre: '', descripcion: '' });
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Categoria | null>(null);
  const [deleteStats, setDeleteStats] = useState<{ subcategorias_count: number; productos_count: number; nivel: number } | null>(null);

  const { data: categorias = [], isLoading, isError } = useQuery({
    queryKey: ['categorias'],
    queryFn: getCategorias,
  });

  const { data: deleteStatsData } = useQuery({
    queryKey: ['categorias', deleteConfirm?.id, 'stats'],
    queryFn: () => getCategoriaStats(deleteConfirm!.id),
    enabled: !!deleteConfirm,
  });

  const createMutation = useMutation({
    mutationFn: createCategoria,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] });
      closeModal();
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CategoriaCreate> }) =>
      updateCategoria(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] });
      closeModal();
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategoria,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] });
      setDeleteConfirm(null);
      setDeleteStats(null);
    },
  });

  const handleDeleteClick = (cat: Categoria) => {
    setDeleteConfirm(cat);
    getCategoriaStats(cat.id).then(setDeleteStats).catch(() => setDeleteStats({ subcategorias_count: 0, productos_count: 0, nivel: 0 }));
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ nombre: '', descripcion: '' });
    setError('');
    setIsOpen(true);
  };

  const openEdit = (cat: Categoria) => {
    setEditing(cat);
    setForm({
      nombre: cat.nombre,
      descripcion: cat.descripcion ?? '',
      parent_id: cat.parent_id,
      imagen_url: cat.imagen_url,
    });
    setError('');
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setEditing(null);
    setError('');
  };

  const handleSubmit = () => {
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const renderCategoriasOptions = () => {
    return categorias
      .filter(c => c.id !== editing?.id)
      .filter(c => {
        const level = getCategoriaLevel(c, categorias);
        return level < MAX_LEVEL;
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(cat => {
        const level = getCategoriaLevel(cat, categorias);
        const prefix = '  '.repeat(level) + (level > 0 ? '└ ' : '');
        return (
          <option key={cat.id} value={cat.id}>
            {prefix}{cat.nombre}
          </option>
        );
      });
  };

  if (isLoading) return <div className="p-8 text-slate-500">Cargando categorías...</div>;
  if (isError) return <div className="p-8 text-red-500">Error al cargar las categorías.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Categorías</h1>
        <button
          onClick={openCreate}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Nueva Categoría
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Nombre</th>
              <th className="px-6 py-3 text-left">Nivel</th>
              <th className="px-6 py-3 text-left">Descripción</th>
              <th className="px-6 py-3 text-left">Imagen</th>
              <th className="px-6 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortCategorias(categorias).map(cat => {
              const level = getCategoriaLevel(cat, categorias);
              const subcategoriasCount = categorias.filter(c => c.parent_id === cat.id).length;
              return (
                <tr key={cat.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-slate-400">{cat.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {cat.parent_id && <span className="text-orange-500 mr-1">└─</span>}
                    {cat.nombre}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${level === 0 ? 'bg-blue-100 text-blue-700' : level === 1 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {level === 0 ? 'Raíz' : `Nivel ${level}`}
                    </span>
                    {subcategoriasCount > 0 && (
                      <span className="ml-1 text-slate-400">({subcategoriasCount})</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{cat.descripcion ?? '—'}</td>
                  <td className="px-6 py-4">
                    {cat.imagen_url ? (
                      <img src={cat.imagen_url} alt={cat.nombre} className="h-10 w-10 object-cover rounded" />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteClick(cat)}
                        className="text-red-500 hover:underline text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {categorias.length === 0 && (
          <p className="px-6 py-8 text-center text-slate-400">No hay categorías aún.</p>
        )}
      </div>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={editing ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <div className="flex flex-col gap-4">
          {error && (
            <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Bebidas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.descripcion ?? ''}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={3}
              placeholder="Descripción opcional..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría padre</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.parent_id ?? ''}
              onChange={e => setForm(f => ({ ...f, parent_id: e.target.value ? parseInt(e.target.value) : undefined }))}
            >
              <option value="">Ninguna (categoría raíz)</option>
              {renderCategoriasOptions()}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL de imagen</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.imagen_url ?? ''}
              onChange={e => setForm(f => ({ ...f, imagen_url: e.target.value || undefined }))}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50"
            >
              {editing ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => { setDeleteConfirm(null); setDeleteStats(null); }}
        title="Confirmar eliminación"
      >
        <div className="flex flex-col gap-4">
          <p>
            ¿Estás seguro de eliminar la categoría <strong>"{deleteConfirm?.nombre}"</strong>?
          </p>
          {deleteStats && (deleteStats.subcategorias_count > 0 || deleteStats.productos_count > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-800">Esta categoría tiene:</p>
              <ul className="list-disc list-inside text-yellow-700 mt-1">
                {deleteStats.subcategorias_count > 0 && (
                  <li>{deleteStats.subcategorias_count} subcategoría(s)</li>
                )}
                {deleteStats.productos_count > 0 && (
                  <li>{deleteStats.productos_count} producto(s) asociado(s)</li>
                )}
              </ul>
              <p className="mt-2 text-yellow-800">
                Se eliminarán en cascada.
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => { setDeleteConfirm(null); setDeleteStats(null); }}
              className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}