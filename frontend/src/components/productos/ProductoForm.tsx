import { useState } from 'react';
import type { Categoria, Ingrediente, ProductoCreate, IngredienteEnProducto } from '../../types';

interface ProductoFormProps {
  form: ProductoCreate;
  onChange: (form: ProductoCreate) => void;
  categorias: Categoria[];
  ingredientes: Ingrediente[];
}

export default function ProductoForm({ form, onChange, categorias, ingredientes }: ProductoFormProps) {
  const [categoriaSearch, setCategoriaSearch] = useState('');

  // Raíces primero, hijos debajo de su padre
  const categoriasOrdenadas = categorias.filter(c => !c.parent_id).flatMap(r => [
    r,
    ...categorias.filter(c => c.parent_id === r.id),
  ]);

  const toggleCategoria = (id: number) => {
    const ids = form.categoria_ids.includes(id)
      ? form.categoria_ids.filter(x => x !== id)
      : [...form.categoria_ids, id];
    onChange({ ...form, categoria_ids: ids });
  };

  const toggleIngrediente = (id: number) => {
    const exists = form.ingredientes.find(pi => pi.ingrediente_id === id);
    if (exists) {
      onChange({ ...form, ingredientes: form.ingredientes.filter(pi => pi.ingrediente_id !== id) });
    } else {
      onChange({
        ...form,
        ingredientes: [...form.ingredientes, { ingrediente_id: id, es_removible: true, cantidad: 1 }],
      });
    }
  };

  const updateIngProp = (id: number, prop: keyof IngredienteEnProducto, value: boolean | number) =>
    onChange({
      ...form,
      ingredientes: form.ingredientes.map(pi =>
        pi.ingrediente_id === id ? { ...pi, [prop]: value } : pi
      ),
    });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
        <input
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={form.nombre}
          onChange={e => onChange({ ...form, nombre: e.target.value })}
          placeholder="Ej: Pizza Margherita"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
        <textarea
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={form.descripcion ?? ''}
          onChange={e => onChange({ ...form, descripcion: e.target.value })}
          rows={2}
          placeholder="Descripción opcional..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Precio base *</label>
        <input
          type="number"
          min={0}
          step="0.01"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={form.precio_base}
          onChange={e => { if (e.target.value !== '') onChange({ ...form, precio_base: parseFloat(e.target.value) || 0 }); }}
          onBlur={e => { if (e.target.value === '') onChange({ ...form, precio_base: 0 }); }}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={form.disponible}
          onChange={e => onChange({ ...form, disponible: e.target.checked })}
          className="w-4 h-4 accent-orange-500"
        />
        Disponible
      </label>

      {/* Selector de categorías */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Categorías{form.categoria_ids.length > 0 && ` (${form.categoria_ids.length} seleccionada${form.categoria_ids.length !== 1 ? 's' : ''})`}
        </label>
        {/* Chips */}
        <div className="flex flex-wrap gap-1 mb-2 min-h-[1.75rem]">
          {form.categoria_ids.length === 0 ? (
            <span className="text-slate-400 text-xs">Ninguna categoría seleccionada</span>
          ) : form.categoria_ids.map(catId => {
            const cat = categorias.find(c => c.id === catId);
            return cat ? (
              <span key={cat.id} className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                {cat.nombre}
                <button
                  type="button"
                  onClick={() => toggleCategoria(cat.id)}
                  className="hover:bg-orange-200 rounded-full p-0.5 leading-none"
                >×</button>
              </span>
            ) : null;
          })}
        </div>
        {/* Buscador */}
        <input
          type="text"
          value={categoriaSearch}
          onChange={e => setCategoriaSearch(e.target.value)}
          placeholder="Buscar categoría..."
          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {/* Lista con checkboxes */}
        <div className="border border-slate-300 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
          {categoriasOrdenadas
            .filter(c => !categoriaSearch || c.nombre.toLowerCase().includes(categoriaSearch.toLowerCase()))
            .map(cat => {
              const isSelected = form.categoria_ids.includes(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => toggleCategoria(cat.id)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm ${isSelected ? 'bg-orange-50' : ''} ${cat.parent_id ? 'pl-6' : ''}`}
                >
                  <input type="checkbox" readOnly checked={isSelected} className="w-3.5 h-3.5 accent-orange-500 shrink-0" />
                  {cat.parent_id && <span className="text-slate-400 text-xs">⤷</span>}
                  <span className={isSelected ? 'font-medium text-orange-700' : 'text-slate-700'}>{cat.nombre}</span>
                </div>
              );
            })}
          {categorias.length === 0 && (
            <p className="px-3 py-2 text-slate-400 text-xs">Sin categorías disponibles</p>
          )}
        </div>
      </div>

      {/* Ingredientes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Ingredientes *</label>
        <div className="max-h-48 overflow-y-auto border border-slate-300 rounded-lg divide-y divide-slate-100">
          {ingredientes.length === 0 && (
            <span className="block px-3 py-2 text-slate-400 text-xs">Sin ingredientes disponibles</span>
          )}
          {ingredientes.map(ing => {
            const sel = form.ingredientes.find(pi => pi.ingrediente_id === ing.id);
            return (
              <div key={ing.id}>
                <div
                  onClick={() => toggleIngrediente(ing.id)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-orange-50 text-sm ${sel ? 'bg-orange-50' : ''}`}
                >
                  <input type="checkbox" readOnly checked={!!sel} className="w-3.5 h-3.5 accent-orange-500 shrink-0" />
                  <span className={sel ? 'font-medium text-orange-700' : 'text-slate-700'}>{ing.nombre}</span>
                  {ing.es_alergeno && <span className="text-xs text-red-400">⚠</span>}
                  <span className="ml-auto text-xs text-slate-400">{ing.stock_actual} {ing.unidad}</span>
                </div>
                {sel && (
                  <div className="ml-6 px-3 pb-2 flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={sel.cantidad}
                      onChange={e => { if (e.target.value !== '') updateIngProp(ing.id, 'cantidad', parseFloat(e.target.value) || 0); }}
                      onBlur={e => { if (e.target.value === '') updateIngProp(ing.id, 'cantidad', 0); }}
                      className="w-20 border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                    <span className="text-xs text-slate-400">{ing.unidad}</span>
                    <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sel.es_removible}
                        onChange={e => updateIngProp(ing.id, 'es_removible', e.target.checked)}
                        className="w-3 h-3 accent-orange-500"
                      />
                      Removible
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
