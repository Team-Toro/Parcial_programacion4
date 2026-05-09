import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
import {
  getCategorias, getCategoriaStats, createCategoria,
  updateCategoria, deleteCategoria, reactivarCategoria,
} from '../api/categorias';
import type { Categoria, CategoriaCreate } from '../types';
import Modal from '../components/ui/Modal';
import { useAuthStore } from '../store/authStore';

const MAX_LEVEL = 2;

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

type ToastState = { type: 'success' | 'error'; message: string } | null;

interface CategoriaTreeNodeProps {
  categoria: Categoria;
  level: number;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  allCategorias: Categoria[];
  onEdit: (cat: Categoria) => void;
  onDelete: (cat: Categoria) => void;
  onReactivar: (id: number) => void;
  isAdmin: boolean;
  includeDeleted: boolean;
}

function CategoriaTreeNode({
  categoria, level, expandedIds, toggleExpand, allCategorias,
  onEdit, onDelete, onReactivar, isAdmin, includeDeleted,
}: CategoriaTreeNodeProps) {
  const children = (categoria.subcategorias ?? []).filter(
    c => includeDeleted || !c.deleted_at
  );
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(categoria.id);
  const isDeleted = !!categoria.deleted_at;

  return (
    <div>
      <div
        className={`flex items-center border-t border-slate-100 transition-colors ${
          isDeleted
            ? 'bg-amber-50 hover:bg-amber-100'
            : level === 0 ? 'bg-white hover:bg-orange-50' : 'bg-slate-50/50 hover:bg-orange-50'
        }`}
        style={{ paddingLeft: `${level * 2 + 1.5}rem` }}
      >
        {/* Toggle */}
        <button
          onClick={() => hasChildren && toggleExpand(categoria.id)}
          className={`w-6 h-6 flex items-center justify-center mr-2 rounded transition-colors ${
            hasChildren ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-200' : 'text-transparent cursor-default'
          }`}
        >
          {hasChildren
            ? isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            : <span className="w-4 h-4" />
          }
        </button>

        <div className="flex-1 py-3 pr-4 flex items-center gap-3">
          <span className={`font-medium text-sm ${isDeleted ? 'line-through text-slate-400' : level === 0 ? 'text-slate-800' : 'text-slate-700'}`}>
            {categoria.nombre}
          </span>
          {level === 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Raíz</span>
          )}
          {hasChildren && (
            <span className="text-xs text-slate-400">({children.length} subcategoría{children.length !== 1 ? 's' : ''})</span>
          )}
          {categoria.descripcion && (
            <span className="text-xs text-slate-400 hidden md:inline">— {categoria.descripcion}</span>
          )}
        </div>

        {isAdmin && (
          <div className="flex gap-2 items-center py-3 pr-4">
            {isDeleted ? (
              <button
                onClick={() => onReactivar(categoria.id)}
                className="flex items-center gap-1.5 text-green-600 hover:text-green-800 text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />Reactivar
              </button>
            ) : (
              <>
                <button onClick={() => onEdit(categoria)} className="text-blue-600 hover:underline text-sm">Editar</button>
                <button onClick={() => onDelete(categoria)} className="text-red-500 hover:underline text-sm">Eliminar</button>
              </>
            )}
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {children.map(child => (
            <CategoriaTreeNode
              key={child.id}
              categoria={child}
              level={level + 1}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              allCategorias={allCategorias}
              onEdit={onEdit}
              onDelete={onDelete}
              onReactivar={onReactivar}
              isAdmin={isAdmin}
              includeDeleted={includeDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoriasPage() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((s) => s.isAdmin());

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState<CategoriaCreate>({ nombre: '', descripcion: '' });
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Categoria | null>(null);
  const [deleteStats, setDeleteStats] = useState<{ subcategorias_count: number; productos_count: number; nivel: number } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setToastVisible(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setToastVisible(true)));
    setTimeout(() => setToast(null), 3000);
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // El back devuelve árbol anidado con subcategorias incluidas.
  // Pasamos only_roots=true para obtener solo raíces con hijos ya anidados.
  const { data: categorias = [], isLoading, isError } = useQuery({
    queryKey: ['categorias', { only_roots: true, include_deleted: includeDeleted || undefined }],
    queryFn: () => getCategorias({ only_roots: true, include_deleted: includeDeleted || undefined }),
  });

  // Lista plana para el selector del formulario
  const { data: categoriasFlat = [] } = useQuery({
    queryKey: ['categorias', { flat: true }],
    queryFn: () => getCategorias({ limit: 100 }),
  });

  const { data: deleteStatsData } = useQuery({
    queryKey: ['categorias', deleteConfirm?.id, 'stats'],
    queryFn: () => getCategoriaStats(deleteConfirm!.id),
    enabled: !!deleteConfirm,
  });

  const createMutation = useMutation({
    mutationFn: createCategoria,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); closeModal(); showToast('success', 'Categoría creada'); },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CategoriaCreate> }) => updateCategoria(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); closeModal(); showToast('success', 'Categoría actualizada'); },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategoria,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); setDeleteConfirm(null); setDeleteStats(null); showToast('success', 'Categoría eliminada'); },
  });

  const reactivarMutation = useMutation({
    mutationFn: reactivarCategoria,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); showToast('success', 'Categoría reactivada'); },
    onError: (e: Error) => showToast('error', e.message),
  });

  const handleDeleteClick = (cat: Categoria) => {
    setDeleteConfirm(cat);
    getCategoriaStats(cat.id).then(setDeleteStats).catch(() => setDeleteStats({ subcategorias_count: 0, productos_count: 0, nivel: 0 }));
  };

  const openCreate = () => { setEditing(null); setForm({ nombre: '', descripcion: '' }); setError(''); setIsOpen(true); };

  const openEdit = (cat: Categoria) => {
    setEditing(cat);
    setForm({ nombre: cat.nombre, descripcion: cat.descripcion ?? '', parent_id: cat.parent_id, imagen_url: cat.imagen_url });
    setError(''); setIsOpen(true);
  };

  const closeModal = () => { setIsOpen(false); setEditing(null); setError(''); };

  const handleSubmit = () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const renderCategoriasOptions = () =>
    categoriasFlat
      .filter(c => c.id !== editing?.id)
      .filter(c => getCategoriaLevel(c, categoriasFlat) < MAX_LEVEL)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(cat => {
        const level = getCategoriaLevel(cat, categoriasFlat);
        return (
          <option key={cat.id} value={cat.id}>
            {'  '.repeat(level)}{level > 0 ? '└ ' : ''}{cat.nombre}
          </option>
        );
      });

  const rootsVisibles = categorias.filter(c => includeDeleted || !c.deleted_at);
  const deletedCount = categorias.filter(c => c.deleted_at).length;

  if (isLoading) return <div className="p-8 text-slate-500">Cargando categorías...</div>;
  if (isError) return <div className="p-8 text-red-500">Error al cargar las categorías.</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-12 xl:px-16 py-8 max-w-screen-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Categorías</h1>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
                className="w-4 h-4 accent-orange-500"
              />
              Ver dados de baja
              {includeDeleted && deletedCount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded font-semibold">
                  {deletedCount} dado{deletedCount !== 1 ? 's' : ''} de baja
                </span>
              )}
            </label>
          )}
          {isAdmin && (
            <button
              onClick={openCreate}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Nueva Categoría
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {rootsVisibles.length === 0 ? (
          <p className="px-6 py-8 text-center text-slate-400">No hay categorías aún.</p>
        ) : (
          rootsVisibles.map(cat => (
            <CategoriaTreeNode
              key={cat.id}
              categoria={cat}
              level={0}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              allCategorias={categoriasFlat}
              onEdit={openEdit}
              onDelete={handleDeleteClick}
              onReactivar={(id) => reactivarMutation.mutate(id)}
              isAdmin={isAdmin}
              includeDeleted={includeDeleted}
            />
          ))
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Editar Categoría' : 'Nueva Categoría'}>
        <div className="flex flex-col gap-4">
          {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
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
            <button onClick={closeModal} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
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

      {/* Modal confirmar eliminación */}
      <Modal isOpen={!!deleteConfirm} onClose={() => { setDeleteConfirm(null); setDeleteStats(null); }} title="Confirmar eliminación">
        <div className="flex flex-col gap-4">
          <p>¿Estás seguro de eliminar la categoría <strong>"{deleteConfirm?.nombre}"</strong>?</p>
          {(deleteStats ?? deleteStatsData) && ((deleteStats ?? deleteStatsData)!.subcategorias_count > 0 || (deleteStats ?? deleteStatsData)!.productos_count > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-800">Esta categoría tiene:</p>
              <ul className="list-disc list-inside text-yellow-700 mt-1">
                {(deleteStats ?? deleteStatsData)!.subcategorias_count > 0 && <li>{(deleteStats ?? deleteStatsData)!.subcategorias_count} subcategoría(s)</li>}
                {(deleteStats ?? deleteStatsData)!.productos_count > 0 && <li>{(deleteStats ?? deleteStatsData)!.productos_count} producto(s) asociado(s)</li>}
              </ul>
              <p className="mt-2 text-yellow-800">Se eliminarán en cascada.</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => { setDeleteConfirm(null); setDeleteStats(null); }} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${
            toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          } ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
