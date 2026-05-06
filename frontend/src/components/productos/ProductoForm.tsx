import { Categoria, Ingrediente, ProductoCreate, IngredienteEnProducto } from '../../types';

interface ProductoFormProps {
  form: ProductoCreate;
  onChange: (form: ProductoCreate) => void;
  categorias: Categoria[];
  ingredientes: Ingrediente[];
}

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

export default function ProductoForm({ form, onChange, categorias, ingredientes }: ProductoFormProps) {
  const getChildCount = (parentId: number) => 
    categorias.filter(c => c.parent_id === parentId).length;

  const renderCategoriasOptions = (): JSX.Element[] => {
    return sortCategorias(categorias).map(cat => {
      const level = cat.parent_id ? 1 : 0;
      return (
        <option key={cat.id} value={cat.id}>
          {'  '.repeat(level) + (level > 0 ? '└ ' : '') + cat.nombre + (getChildCount(cat.id) > 0 ? ` (${getChildCount(cat.id)} sub)` : '')}
        </option>
      );
    });
  };

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
        ingredientes: [...form.ingredientes, { ingrediente_id: id, es_removible: true }],
      });
    }
  };

  const updateIngProp = (id: number, prop: keyof IngredienteEnProducto, value: boolean) =>
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
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Precio base *</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={form.precio_base}
            onChange={e => onChange({ ...form, precio_base: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
          <input
            type="number"
            min={0}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={form.stock_cantidad ?? 0}
            onChange={e => onChange({
              ...form,
              stock_cantidad: parseInt(e.target.value) || 0,
            })}
            placeholder="Ej: 100"
          />
        </div>
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
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Categorías</label>
        <select
          multiple
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={form.categoria_ids.map(String)}
          onChange={e => {
            const selected = Array.from(e.target.selectedOptions, opt => parseInt(opt.value));
            onChange({ ...form, categoria_ids: selected });
          }}
        >
          <option value="" disabled>Seleccionar categorías...</option>
          {renderCategoriasOptions()}
        </select>
        {form.categoria_ids.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {form.categoria_ids.map(catId => {
              const cat = categorias.find(c => c.id === catId);
              return cat ? (
                <span key={cat.id} className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                  {cat.nombre}
                  <button
                    type="button"
                    onClick={() => toggleCategoria(cat.id)}
                    className="hover:text-orange-900"
                  >
                    ×
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Ingredientes</label>
        <div className="max-h-48 overflow-y-auto border border-slate-300 rounded-lg p-2 flex flex-col gap-2">
          {ingredientes.length === 0 && <span className="text-slate-400 text-xs">Sin ingredientes disponibles</span>}
          {ingredientes.map(ing => {
            const sel = form.ingredientes.find(pi => pi.ingrediente_id === ing.id);
            return (
              <div key={ing.id}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!sel}
                    onChange={() => toggleIngrediente(ing.id)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  {ing.nombre}
                  {ing.es_alergeno && <span className="text-xs text-red-500">⚠</span>}
                </label>
                {sel && (
                  <div className="ml-6 mt-1">
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
