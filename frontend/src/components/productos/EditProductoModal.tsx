import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, Loader2 } from 'lucide-react';
import { createProducto, updateProducto } from '../../api/productos';
import { getCategorias } from '../../api/categorias';
import { getIngredientes } from '../../api/ingredientes';
import type { Producto, ProductoCreate, IngredienteEnProducto, Categoria, Ingrediente } from '../../types';
import Modal from '../ui/Modal';
import ImageUpload from '../ImageUpload';
import { useDebounce } from '../../hooks/useDebounce';

const defaultForm: ProductoCreate = {
  nombre: '', descripcion: '', precio_base: 0, markup_porcentaje: 50,
  disponible: true, categoria_ids: [], categoria_principal_id: undefined, ingredientes: [], imagenes_url: [],
};

interface Props {
  producto: Producto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditProductoModal({ producto, isOpen, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductoCreate>(defaultForm);
  const [modalError, setModalError] = useState('');
  const [ingSearch, setIngSearch] = useState('');
  const debouncedIngSearch = useDebounce(ingSearch, 300);
  const [categoriaSearch, setCategoriaSearch] = useState('');
  const ingredientesVistos = useRef(new Map<number, Ingrediente>());

  useEffect(() => {
    if (!isOpen) return;
    if (producto) {
      setForm({
        nombre: producto.nombre,
        descripcion: producto.descripcion ?? '',
        precio_base: Number(producto.precio_base),
        markup_porcentaje: Number(producto.markup_porcentaje),
        disponible: producto.disponible,
        categoria_ids: producto.categorias.map(pc => pc.categoria?.id).filter((id): id is number => id !== undefined),
        categoria_principal_id: producto.categorias.find(pc => pc.es_principal)?.categoria?.id,
        ingredientes: producto.ingredientes.map(pi => ({
          ingrediente_id: pi.ingrediente.id,
          es_removible: pi.es_removible,
          cantidad: pi.cantidad,
        })),
        imagenes_url: producto.imagenes_url ?? [],
      });
    } else {
      setForm(defaultForm);
    }
    setModalError('');
    setIngSearch('');
    setCategoriaSearch('');
    ingredientesVistos.current.clear();
  }, [isOpen, producto]);

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: () => getCategorias({ limit: 100 }),
    enabled: isOpen,
  });

  const categoriasFlat = useMemo(() => {
    const porPadre = new Map<number | null, Categoria[]>();
    categorias.forEach(c => {
      const key = c.parent_id ?? null;
      porPadre.set(key, [...(porPadre.get(key) ?? []), c]);
    });
    const resultado: { cat: Categoria; depth: number }[] = [];
    const recorrer = (parentId: number | null, depth: number) => {
      (porPadre.get(parentId) ?? []).forEach(c => {
        resultado.push({ cat: c, depth });
        recorrer(c.id, depth + 1);
      });
    };
    recorrer(null, 0);
    return resultado;
  }, [categorias]);

  const esHoja = (cat: Categoria) => !categorias.some(c => c.parent_id === cat.id);

  const { data: ingredientesModal = [] } = useQuery({
    queryKey: ['ingredientes', { q: debouncedIngSearch, limit: 50 }],
    queryFn: () => getIngredientes({ q: debouncedIngSearch || undefined, limit: 50 }),
    enabled: isOpen,
  });

  useEffect(() => {
    ingredientesModal.forEach(i => ingredientesVistos.current.set(i.id, i));
  }, [ingredientesModal]);

  const buscarIngrediente = (id: number) =>
    ingredientesVistos.current.get(id)
      ?? producto?.ingredientes.find(i => i.ingrediente.id === id)?.ingrediente;

  let costoIngredientes: number | null = form.ingredientes.length > 0 ? 0 : null;
  for (const pi of form.ingredientes) {
    const ing = buscarIngrediente(pi.ingrediente_id);
    if (!ing || ing.precio === undefined) { costoIngredientes = null; break; }
    costoIngredientes = (costoIngredientes ?? 0) + Number(ing.precio) * pi.cantidad;
  }
  const precioFinal = costoIngredientes !== null
    ? Math.round(costoIngredientes * (1 + form.markup_porcentaje / 100) * 100) / 100
    : null;

  const handleMarkupChange = (markup: number) => {
    setForm(f => ({ ...f, markup_porcentaje: markup }));
    if (costoIngredientes !== null) {
      const newPrecio = Math.round(costoIngredientes * (1 + markup / 100) * 100) / 100;
      setForm(f => ({ ...f, markup_porcentaje: markup, precio_base: newPrecio }));
    }
  };

  const handlePrecioFinalChange = (precio: number) => {
    if (costoIngredientes !== null && costoIngredientes > 0) {
      const markup = Math.round(((precio / costoIngredientes) - 1) * 100 * 100) / 100;
      setForm(f => ({ ...f, precio_base: costoIngredientes!, markup_porcentaje: markup }));
    } else {
      setForm(f => ({ ...f, precio_base: precio }));
    }
  };

  const createMutation = useMutation({
    mutationFn: createProducto,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); onSuccess(); onClose(); },
    onError: (e: Error) => setModalError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductoCreate> }) => updateProducto(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); onSuccess(); onClose(); },
    onError: (e: Error) => setModalError(e.message),
  });

  const toggleCategoria = (id: number) =>
    setForm(f => {
      const removing = f.categoria_ids.includes(id);
      return {
        ...f,
        categoria_ids: removing ? f.categoria_ids.filter(x => x !== id) : [...f.categoria_ids, id],
        categoria_principal_id: removing && f.categoria_principal_id === id ? undefined : f.categoria_principal_id,
      };
    });

  const toggleIngrediente = (id: number) => {
    const exists = form.ingredientes.find(pi => pi.ingrediente_id === id);
    if (exists) {
      setForm(f => ({ ...f, ingredientes: f.ingredientes.filter(pi => pi.ingrediente_id !== id) }));
    } else {
      setForm(f => ({
        ...f,
        ingredientes: [...f.ingredientes, { ingrediente_id: id, es_removible: false, cantidad: 1 }],
      }));
    }
  };

  const updateIngProp = (id: number, prop: keyof IngredienteEnProducto, value: boolean | number) =>
    setForm(f => ({
      ...f,
      ingredientes: f.ingredientes.map(pi =>
        pi.ingrediente_id === id ? { ...pi, [prop]: value } : pi
      ),
    }));

  const handleSubmit = () => {
    if (!form.nombre.trim()) { setModalError('El nombre es obligatorio'); return; }
    const finalPrice = precioFinal ?? form.precio_base;
    if (finalPrice < 0) { setModalError('El precio final no puede ser negativo'); return; }
    if (form.ingredientes.length === 0) { setModalError('El producto debe tener al menos un ingrediente'); return; }
    const payload: ProductoCreate = {
      ...form,
      precio_base: costoIngredientes !== null ? costoIngredientes : form.precio_base,
    };
    if (producto) {
      updateMutation.mutate({ id: producto.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const ingredientesModalFiltrados = ingredientesModal.filter(i =>
    !ingSearch || i.nombre.toLowerCase().includes(ingSearch.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={producto ? 'Editar Producto' : 'Nuevo Producto'} variant="large">
      {modalError && <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg mb-4">{modalError}</p>}
      <div className="grid grid-cols-2 gap-6">
        {/* Columna izquierda: datos básicos */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Pizza Margherita"
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
          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-slate-700">Precio</label>
            {costoIngredientes !== null ? (
              <>
                <div className="flex items-center justify-between text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-slate-500">Costo de ingredientes</span>
                  <span className="font-semibold text-slate-700">${costoIngredientes.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 whitespace-nowrap w-20">Markup %</label>
                  <input
                    type="number" step="0.01"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    value={form.markup_porcentaje}
                    onChange={e => { if (e.target.value !== '') handleMarkupChange(parseFloat(e.target.value) || 0); }}
                    onBlur={e => { if (e.target.value === '') handleMarkupChange(0); }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 whitespace-nowrap w-20">Precio final</label>
                  <input
                    type="number" min={0} step="0.01"
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    value={precioFinal ?? 0}
                    onChange={e => { if (e.target.value !== '') handlePrecioFinalChange(parseFloat(e.target.value) || 0); }}
                    onBlur={e => { if (e.target.value === '') handlePrecioFinalChange(0); }}
                  />
                </div>
              </>
            ) : (
              <input
                type="number" min={0} step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={form.precio_base}
                onChange={e => { if (e.target.value !== '') setForm(f => ({ ...f, precio_base: parseFloat(e.target.value) || 0 })); }}
                onBlur={e => { if (e.target.value === '') setForm(f => ({ ...f, precio_base: 0 })); }}
              />
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox" checked={form.disponible}
              onChange={e => setForm(f => ({ ...f, disponible: e.target.checked }))}
              className="w-4 h-4 accent-orange-500"
            />
            Disponible
          </label>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Imágenes ({(form.imagenes_url ?? []).length}/5)
            </label>
            <ImageUpload
              value={form.imagenes_url ?? []}
              onChange={(urls) => setForm(f => ({ ...f, imagenes_url: urls }))}
              multiple
              maxImages={5}
              folder="foodstore/productos"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Categorías{form.categoria_ids.length > 0 && ` (${form.categoria_ids.length} seleccionada${form.categoria_ids.length !== 1 ? 's' : ''})`}
            </label>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[1.75rem]">
              {form.categoria_ids.length === 0 ? (
                <span className="text-slate-400 text-xs">Ninguna categoría seleccionada</span>
              ) : form.categoria_ids.map(catId => {
                const cat = categorias.find(c => c.id === catId);
                const isPrincipal = form.categoria_principal_id === catId;
                return cat ? (
                  <span
                    key={cat.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm ${isPrincipal ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-700'}`}
                  >
                    <button
                      type="button"
                      title={isPrincipal ? 'Quitar principal' : 'Marcar como principal'}
                      onClick={() => setForm(f => ({ ...f, categoria_principal_id: isPrincipal ? undefined : catId }))}
                      className="leading-none hover:opacity-70"
                    >★</button>
                    {cat.nombre}
                    <button
                      type="button"
                      onClick={() => toggleCategoria(cat.id)}
                      className="hover:opacity-70 rounded-full p-0.5 leading-none"
                    >×</button>
                  </span>
                ) : null;
              })}
            </div>
            <input
              type="text"
              value={categoriaSearch}
              onChange={e => setCategoriaSearch(e.target.value)}
              placeholder="Buscar categoría..."
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <div className="border border-slate-300 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
              {categoriasFlat
                .filter(({ cat }) => !categoriaSearch || cat.nombre.toLowerCase().includes(categoriaSearch.toLowerCase()))
                .map(({ cat, depth }) => {
                  const hoja = esHoja(cat);
                  const isSelected = form.categoria_ids.includes(cat.id);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => hoja && toggleCategoria(cat.id)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm ${
                        hoja ? 'cursor-pointer hover:bg-slate-50' : 'opacity-50 cursor-not-allowed'
                      } ${isSelected ? 'bg-orange-50' : ''}`}
                    >
                      <input type="checkbox" readOnly disabled={!hoja} checked={isSelected} className="w-3.5 h-3.5 accent-orange-500 shrink-0" />
                      <span className={`whitespace-pre ${isSelected ? 'font-medium text-orange-700' : 'text-slate-700'}`}>
                        {'　'.repeat(depth)}{hoja ? (depth > 0 ? '↳ ' : '') : '📁 '}{cat.nombre}
                      </span>
                      {!hoja && <span className="text-xs text-slate-400 ml-1">(tiene subcategorías)</span>}
                    </div>
                  );
                })}
              {categorias.length === 0 && (
                <p className="px-3 py-2 text-slate-400 text-xs">Sin categorías disponibles</p>
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: ingredientes */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-slate-700">Ingredientes</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={ingSearch}
              onChange={e => setIngSearch(e.target.value)}
              placeholder="Buscar ingrediente..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-36 divide-y divide-slate-100">
            {ingredientesModalFiltrados.length === 0 && (
              <p className="px-3 py-2 text-slate-400 text-xs">Sin resultados</p>
            )}
            {ingredientesModalFiltrados.map(ing => {
              const sel = form.ingredientes.find(pi => pi.ingrediente_id === ing.id);
              return (
                <div
                  key={ing.id}
                  onClick={() => toggleIngrediente(ing.id)}
                  className={`flex justify-between items-center px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 ${sel ? 'bg-orange-50' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <input type="checkbox" readOnly checked={!!sel} className="w-3.5 h-3.5 accent-orange-500" />
                    <span className={sel ? 'font-medium text-orange-700' : 'text-slate-700'}>{ing.nombre}</span>
                    {ing.es_alergeno && <span className="text-xs text-red-400">⚠</span>}
                  </div>
                  <span className="text-xs text-slate-400">{ing.stock_actual} {ing.unidad}</span>
                </div>
              );
            })}
          </div>

          {form.ingredientes.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Seleccionados ({form.ingredientes.length})
              </p>
              <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-48 divide-y divide-slate-100">
                {form.ingredientes.map(pi => {
                  const ing = buscarIngrediente(pi.ingrediente_id);
                  return (
                    <div key={pi.ingrediente_id} className="px-3 py-2 flex items-center gap-2 text-sm">
                      <span className="flex-1 font-medium text-slate-700 text-xs">{ing?.nombre ?? `ID ${pi.ingrediente_id}`}</span>
                      <input
                        type="number"
                        min={0}
                        step={ing?.unidad === 'unidad' ? '1' : '0.01'}
                        value={pi.cantidad}
                        onChange={e => {
                          if (e.target.value === '') return;
                          const val = parseFloat(e.target.value) || 0;
                          updateIngProp(pi.ingrediente_id, 'cantidad', ing?.unidad === 'unidad' ? Math.floor(val) : val);
                        }}
                        onBlur={e => { if (e.target.value === '') updateIngProp(pi.ingrediente_id, 'cantidad', 0); }}
                        className="w-20 border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                      />
                      <span className="text-xs text-slate-400 w-10">{ing?.unidad ?? ''}</span>
                      <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pi.es_removible}
                          onChange={e => updateIngProp(pi.ingrediente_id, 'es_removible', e.target.checked)}
                          className="w-3 h-3 accent-orange-500"
                        />
                        Removible
                      </label>
                      <button
                        onClick={() => toggleIngrediente(pi.ingrediente_id)}
                        className="text-slate-400 hover:text-red-500 ml-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={createMutation.isPending || updateMutation.isPending || form.ingredientes.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium disabled:opacity-50"
        >
          {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
          {producto ? 'Guardar cambios' : 'Crear'}
        </button>
      </div>
    </Modal>
  );
}
