import { Categoria, Ingrediente, ProductoCreate, IngredienteEnProducto } from '../../types';

interface ProductoFormProps {
  form: ProductoCreate;
  onChange: (form: ProductoCreate) => void;
  categorias: Categoria[];
  ingredientes: Ingrediente[];
}

export default function ProductoForm({ form, onChange, categorias, ingredientes }: ProductoFormProps) {
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
        ingredientes: [...form.ingredientes, { ingrediente_id: id, es_removible: true, es_opcional: false }],
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
          <label className="block text-sm font-medium text-slate-700 mb-1">Tiempo prep. (min)</label>
          <input
            type="number"
            min={0}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            value={form.tiempo_prep_min ?? ''}
            onChange={e => onChange({
              ...form,
              tiempo_prep_min: e.target.value ? parseInt(e.target.value) : undefined,
            })}
            placeholder="Ej: 15"
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
        <div className="max-h-32 overflow-y-auto border border-slate-300 rounded-lg p-2 flex flex-col gap-1">
          {categorias.length === 0 && <span className="text-slate-400 text-xs">Sin categorías disponibles</span>}
          {categorias.map(cat => (
            <label key={cat.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.categoria_ids.includes(cat.id)}
                onChange={() => toggleCategoria(cat.id)}
                className="w-4 h-4 accent-orange-500"
              />
              {cat.nombre}
            </label>
          ))}
        </div>
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
                  <div className="ml-6 mt-1 flex gap-4">
                    <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sel.es_removible}
                        onChange={e => updateIngProp(ing.id, 'es_removible', e.target.checked)}
                        className="w-3 h-3 accent-orange-500"
                      />
                      Removible
                    </label>
                    <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sel.es_opcional}
                        onChange={e => updateIngProp(ing.id, 'es_opcional', e.target.checked)}
                        className="w-3 h-3 accent-orange-500"
                      />
                      Opcional
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
