import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, RefreshCw, Search, X } from 'lucide-react';
import CategoriaCard from '../components/CategoriaCard';
import {
  getCategorias, getCategoriaStats, createCategoria,
  updateCategoria, deleteCategoria, reactivarCategoria,
} from '../api/categorias';
import type { Categoria, CategoriaCreate } from '../types';
import Modal from '../components/ui/Modal';
import ImageUpload from '../components/ImageUpload';
import { useAuthStore } from '../store/authStore';

const MAX_LEVEL = 10;

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

// --- Cliente tree node (sin acciones de admin) ---

interface ClienteTreeNodeProps {
  categoria: Categoria;
  level: number;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
}

function ClienteTreeNode({ categoria, level, expandedIds, toggleExpand }: ClienteTreeNodeProps) {
  const children = categoria.subcategorias ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(categoria.id);

  return (
    <div>
      <div
        className="flex items-center border-t border-slate-100 hover:bg-orange-50 transition-colors"
        style={{ paddingLeft: `${level * 2 + 1}rem` }}
      >
        <button
          onClick={() => hasChildren && toggleExpand(categoria.id)}
          className={`w-6 h-6 flex items-center justify-center mr-2 rounded transition-colors ${
            hasChildren ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-200' : 'cursor-default text-transparent'
          }`}
        >
          {hasChildren
            ? isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            : <span className="w-4 h-4" />}
        </button>

        {hasChildren ? (
          <button
            onClick={() => toggleExpand(categoria.id)}
            className="flex-1 py-3 pr-4 text-left font-medium text-sm text-slate-800"
          >
            {categoria.nombre}
            <span className="ml-2 text-xs text-slate-400">({children.length} subcategoría{children.length !== 1 ? 's' : ''})</span>
          </button>
        ) : (
          <Link
            to={`/productos?categoria_id=${categoria.id}`}
            className="flex-1 py-3 pr-4 font-medium text-sm text-orange-600 hover:underline"
          >
            {categoria.nombre}
          </Link>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {children.map(child => (
            <ClienteTreeNode
              key={child.id}
              categoria={child}
              level={level + 1}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Builds breadcrumb path from root down to the current parent_id
function buildBreadcrumb(parentId: number, roots: Categoria[]): Categoria[] {
  const findPath = (cats: Categoria[], targetId: number): Categoria[] | null => {
    for (const cat of cats) {
      if (cat.id === targetId) return [cat];
      const sub = cat.subcategorias ?? [];
      if (sub.length > 0) {
        const path = findPath(sub, targetId);
        if (path) return [cat, ...path];
      }
    }
    return null;
  };
  return findPath(roots, parentId) ?? [];
}

interface ClienteCategoriasViewProps {
  categoriasRaiz: Categoria[];
}

function ClienteCategoriasView({ categoriasRaiz }: ClienteCategoriasViewProps) {
  const [searchParams] = useSearchParams();
  const parentIdParam = searchParams.get('parent_id');
  const parentId = parentIdParam ? Number(parentIdParam) : null;

  const [treeMode, setTreeMode] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const collectAllIds = (cats: Categoria[]): number[] =>
    cats.flatMap(c => [c.id, ...collectAllIds(c.subcategorias ?? [])]);

  const handleExpandAll = () => {
    setTreeMode(true);
    setExpandedIds(new Set(collectAllIds(currentCats)));
  };

  const handleCollapseAll = () => {
    setTreeMode(false);
    setExpandedIds(new Set());
  };

  // Find current category and its children from the nested tree
  const findCategoria = (cats: Categoria[], id: number): Categoria | null => {
    for (const c of cats) {
      if (c.id === id) return c;
      const found = findCategoria(c.subcategorias ?? [], id);
      if (found) return found;
    }
    return null;
  };

  const currentCats: Categoria[] = parentId
    ? (findCategoria(categoriasRaiz, parentId)?.subcategorias ?? [])
    : categoriasRaiz;

  const breadcrumb = parentId ? buildBreadcrumb(parentId, categoriasRaiz) : [];

  return (
    <div className="px-4 sm:px-6 lg:px-12 xl:px-16 py-8 max-w-screen-2xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-1 text-sm text-slate-500 mb-1 flex-wrap">
            <Link to="/categorias" className="hover:text-orange-500">Categorías</Link>
            {breadcrumb.map((cat, i) => (
              <span key={cat.id} className="flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
                {i < breadcrumb.length - 1 ? (
                  <Link to={`/categorias?parent_id=${cat.id}`} className="hover:text-orange-500">{cat.nombre}</Link>
                ) : (
                  <span className="text-slate-800 font-medium">{cat.nombre}</span>
                )}
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].nombre : 'Categorías'}
          </h1>
        </div>

        <div className="flex gap-2">
          {!treeMode ? (
            <button
              onClick={handleExpandAll}
              className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronDown className="w-4 h-4" /> Expandir todo
            </button>
          ) : (
            <button
              onClick={handleCollapseAll}
              className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" /> Colapsar todo
            </button>
          )}
        </div>
      </div>

      {currentCats.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-500">No hay categorías disponibles.</p>
          {parentId && (
            <Link to="/categorias" className="mt-3 inline-block text-sm text-orange-500 hover:underline">
              ← Volver a categorías
            </Link>
          )}
        </div>
      ) : treeMode ? (
        <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
          {currentCats.map(cat => (
            <ClienteTreeNode
              key={cat.id}
              categoria={cat}
              level={0}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {currentCats.map(cat => (
            <CategoriaCard key={cat.id} categoria={cat} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoriasPage() {
  const qc = useQueryClient();
  const isAdmin = useAuthStore((s) => s.isProductManager());

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState<CategoriaCreate>({ nombre: '', descripcion: '' });
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Categoria | null>(null);
  const [deleteStats, setDeleteStats] = useState<{ subcategorias_count: number; productos_count: number; nivel: number } | null>(null);
  const [reactivarConfirm, setReactivarConfirm] = useState<{ id: number; nombre: string } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [treeSearch, setTreeSearch] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const [toastVisible, setToastVisible] = useState(false);

  // Estado del dropdown custom de categoría padre
  const [parentSearch, setParentSearch] = useState('');
  const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
  const parentDropdownRef = useRef<HTMLDivElement>(null);

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

  const expandAll = () => {
    const withChildren = new Set(
      categoriasFlat
        .filter(c => categoriasFlat.some(sub => sub.parent_id === c.id))
        .map(c => c.id)
    );
    setExpandedIds(withChildren);
  };

  const collapseAll = () => setExpandedIds(new Set());

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
    onError: (e: Error) => {
      try {
        const parsed = JSON.parse(e.message);
        if (parsed?.code === 'CATEGORIA_ELIMINADA_EXISTE') {
          setReactivarConfirm({ id: parsed.id, nombre: form.nombre });
          return;
        }
      } catch { /* not JSON — fall through */ }
      setError(e.message);
    },
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

  // Categorías elegibles para ser padre: excluir la que se está editando y las de nivel igual o mayor a MAX_LEVEL,
  // ordenadas jerárquicamente (raíz primero, sus hijos inmediatamente debajo recursivamente)
  const orderedCategorias = useMemo(() => {
    const eligible = categoriasFlat
      .filter(c => c.id !== editing?.id)
      .filter(c => getCategoriaLevel(c, categoriasFlat) < MAX_LEVEL);

    const result: Categoria[] = [];
    const addChildren = (parentId: number | null) => {
      const children = eligible.filter(c => c.parent_id === parentId);
      // Ordenamos alfabéticamente por nombre
      children.sort((a, b) => a.nombre.localeCompare(b.nombre));
      for (const child of children) {
        result.push(child);
        addChildren(child.id);
      }
    };

    addChildren(null);
    return result;
  }, [categoriasFlat, editing]);

  const filteredCategorias = orderedCategorias.filter(c =>
    c.nombre.toLowerCase().includes(parentSearch.toLowerCase())
  );

  const selectedParentName = form.parent_id
    ? (categoriasFlat.find(c => c.id === form.parent_id)?.nombre ?? 'Ninguna (categoría raíz)')
    : 'Ninguna (categoría raíz)';

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (parentDropdownRef.current && !parentDropdownRef.current.contains(e.target as Node)) {
        setParentDropdownOpen(false);
      }
    };
    if (parentDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [parentDropdownOpen]);

  const handleDeleteClick = (cat: Categoria) => {
    setDeleteConfirm(cat);
    getCategoriaStats(cat.id).then(setDeleteStats).catch(() => setDeleteStats({ subcategorias_count: 0, productos_count: 0, nivel: 0 }));
  };

  const openCreate = () => {
    setEditing(null); setForm({ nombre: '', descripcion: '' }); setError('');
    setParentSearch(''); setParentDropdownOpen(false); setIsOpen(true);
  };

  const openEdit = (cat: Categoria) => {
    setEditing(cat);
    setForm({ nombre: cat.nombre, descripcion: cat.descripcion ?? '', parent_id: cat.parent_id, imagen_url: cat.imagen_url });
    setError(''); setParentSearch(''); setParentDropdownOpen(false); setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false); setEditing(null); setError('');
    setParentSearch(''); setParentDropdownOpen(false);
  };

  const handleSubmit = () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const rootsVisibles = categorias.filter(c => includeDeleted || !c.deleted_at);
  const deletedCount = categorias.filter(c => c.deleted_at).length;

  if (isLoading) return <div className="p-8 text-slate-500">Cargando categorías...</div>;
  if (isError) return <div className="p-8 text-red-500">Error al cargar las categorías.</div>;

  if (!isAdmin) {
    return <ClienteCategoriasView categoriasRaiz={categorias} />;
  }

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

      {/* Búsqueda + Expand/Collapse (admin) */}
      <div className="bg-white p-4 rounded-xl shadow border border-slate-200 mb-4">
        <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={treeSearch}
            onChange={(e) => setTreeSearch(e.target.value)}
            placeholder="Buscar categoría..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {treeSearch && (
            <button
              onClick={() => setTreeSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {!treeSearch && (
          <>
            <button
              onClick={expandAll}
              className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
            >
              Expandir todas
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
            >
              Colapsar todas
            </button>
          </>
        )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        {treeSearch ? (
          // Vista plana cuando hay búsqueda activa
          (() => {
            const treeFiltered = categoriasFlat.filter(
              c => c.nombre.toLowerCase().includes(treeSearch.toLowerCase()) && (includeDeleted || !c.deleted_at)
            );
            return treeFiltered.length === 0 ? (
              <p className="px-6 py-8 text-center text-slate-400">Sin resultados para "{treeSearch}"</p>
            ) : (
              treeFiltered.map(cat => (
                <div
                  key={cat.id}
                  className={`flex items-center px-6 py-3 border-t border-slate-100 transition-colors ${
                    cat.deleted_at ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-orange-50'
                  }`}
                >
                  <span className={`flex-1 text-sm font-medium ${cat.deleted_at ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {cat.nombre}
                    {cat.parent_id && (
                      <span className="ml-2 text-xs text-slate-400 font-normal">
                        (subcategoría de {categoriasFlat.find(p => p.id === cat.parent_id)?.nombre ?? '?'})
                      </span>
                    )}
                  </span>
                  <div className="flex gap-2">
                    {cat.deleted_at ? (
                      <button
                        onClick={() => reactivarMutation.mutate(cat.id)}
                        className="flex items-center gap-1.5 text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        <RefreshCw className="w-4 h-4" />Reactivar
                      </button>
                    ) : (
                      <>
                        <button onClick={() => openEdit(cat)} className="text-blue-600 hover:underline text-sm">Editar</button>
                        <button onClick={() => handleDeleteClick(cat)} className="text-red-500 hover:underline text-sm">Eliminar</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            );
          })()
        ) : rootsVisibles.length === 0 ? (
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
      <Modal isOpen={isOpen} onClose={closeModal} title={editing ? 'Editar Categoría' : 'Nueva Categoría'} variant="large">
        {error && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{error}</p>}
        <div className="grid grid-cols-2 gap-6">
          {/* Columna izquierda: nombre y descripción */}
          <div className="flex flex-col gap-4">
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
                rows={5}
                placeholder="Descripción opcional..."
              />
            </div>
          </div>

          {/* Columna derecha: categoría padre e imagen */}
          <div className="flex flex-col gap-4">
            {/* Dropdown custom de categoría padre */}
            <div className="relative" ref={parentDropdownRef}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría padre</label>

              {/* Trigger */}
              <div
                onClick={() => setParentDropdownOpen(o => !o)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-orange-400 flex items-center justify-between bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <span className={form.parent_id ? 'text-slate-800' : 'text-slate-400'}>
                  {selectedParentName}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${parentDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Dropdown */}
              {parentDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-50 max-h-72 overflow-hidden flex flex-col">
                  {/* Buscador */}
                  <div className="p-2 border-b border-slate-200 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={parentSearch}
                        onChange={e => setParentSearch(e.target.value)}
                        placeholder="Buscar categoría..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-orange-400"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Lista */}
                  <div className="overflow-y-auto flex-1">
                    {/* Opción "Ninguna" siempre arriba */}
                    <div
                      onClick={() => {
                        setForm(f => ({ ...f, parent_id: undefined }));
                        setParentDropdownOpen(false);
                        setParentSearch('');
                      }}
                      className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 ${
                        !form.parent_id ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-500'
                      }`}
                    >
                      Ninguna (categoría raíz)
                    </div>

                    {/* Categorías ordenadas jerárquicamente */}
                    {filteredCategorias.map(cat => {
                      const lvl = getCategoriaLevel(cat, categoriasFlat);
                      const isSubcategoria = lvl > 0;
                      const isSelected = form.parent_id === cat.id;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => {
                            setForm(f => ({ ...f, parent_id: cat.id }));
                            setParentDropdownOpen(false);
                            setParentSearch('');
                          }}
                          className={`flex items-center py-2 text-sm cursor-pointer hover:bg-slate-50 ${
                            isSelected ? 'bg-orange-50 text-orange-700 font-medium' : 'text-slate-800'
                          }`}
                          style={{ paddingLeft: `${lvl * 1.25 + 0.75}rem` }}
                        >
                          {isSubcategoria && (
                            <span className="mr-1.5 text-slate-400 font-normal">
                              {'⤷'.repeat(lvl)}
                            </span>
                          )}
                          <span className={isSubcategoria ? 'text-slate-600' : 'text-slate-800 font-medium'}>
                            {cat.nombre}
                          </span>
                        </div>
                      );
                    })}

                    {filteredCategorias.length === 0 && (
                      <div className="px-3 py-4 text-sm text-slate-500 text-center">
                        No se encontraron categorías
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Imagen</label>
              <ImageUpload
                value={form.imagen_url ? [form.imagen_url] : []}
                onChange={(urls) => setForm(f => ({ ...f, imagen_url: urls[0] ?? undefined }))}
                multiple={false}
                folder="foodstore/categorias"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-slate-100">
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
      </Modal>

      {/* Modal confirmar eliminación */}
      <Modal isOpen={!!deleteConfirm} onClose={() => { setDeleteConfirm(null); setDeleteStats(null); }} title="Confirmar eliminación">
        <div className="flex flex-col gap-4">
          <p>¿Estás seguro de eliminar la categoría <strong>"{deleteConfirm?.nombre}"</strong>?</p>
          {(deleteStats ?? deleteStatsData) && ((deleteStats ?? deleteStatsData)!.subcategorias_count > 0 || (deleteStats ?? deleteStatsData)!.productos_count > 0) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-yellow-800">Esta categoría tiene:</p>
              <ul className="list-disc list-inside text-yellow-700 mt-1">
                {(deleteStats ?? deleteStatsData)!.subcategorias_count > 0 && <li>{(deleteStats ?? deleteStatsData)!.subcategorias_count} subcategoría(s) — también se darán de baja</li>}
                {(deleteStats ?? deleteStatsData)!.productos_count > 0 && <li>{(deleteStats ?? deleteStatsData)!.productos_count} producto(s) — se reasignarán a "Sin categoría"</li>}
              </ul>
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

      {/* Modal reactivar categoría eliminada */}
      <Modal isOpen={!!reactivarConfirm} onClose={() => setReactivarConfirm(null)} title="Categoría eliminada encontrada">
        <div className="flex flex-col gap-4">
          <p>
            Ya existe una categoría llamada <strong>"{reactivarConfirm?.nombre}"</strong> que fue dada de baja.
            ¿Querés reactivarla en lugar de crear una nueva?
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={() => setReactivarConfirm(null)} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              onClick={() => {
                if (reactivarConfirm) {
                  reactivarMutation.mutate(reactivarConfirm.id);
                  setReactivarConfirm(null);
                  closeModal();
                }
              }}
              disabled={reactivarMutation.isPending}
              className="px-4 py-2 text-sm rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium disabled:opacity-50"
            >
              Reactivar
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
