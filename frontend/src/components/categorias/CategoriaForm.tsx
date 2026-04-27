import { Categoria, CategoriaCreate } from '../../types';

interface CategoriaFormProps {
  form: CategoriaCreate;
  onChange: (form: CategoriaCreate) => void;
  categorias: Categoria[];
  editingId?: number;
}

export default function CategoriaForm({ form, onChange, categorias, editingId }: CategoriaFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
        <input
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={form.nombre}
          onChange={e => onChange({ ...form, nombre: e.target.value })}
          placeholder="Ej: Bebidas"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
        <textarea
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={form.descripcion ?? ''}
          onChange={e => onChange({ ...form, descripcion: e.target.value })}
          rows={3}
          placeholder="Descripción opcional..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Categoría padre</label>
        <select
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={form.parent_id ?? ''}
          onChange={e => onChange({ ...form, parent_id: e.target.value ? parseInt(e.target.value) : undefined })}
        >
          <option value="">Ninguna (categoría raíz)</option>
          {categorias.filter(c => c.id !== editingId).map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.parent_id ? '└─ ' : ''}{cat.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">URL de imagen</label>
        <input
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          value={form.imagen_url ?? ''}
          onChange={e => onChange({ ...form, imagen_url: e.target.value || undefined })}
          placeholder="https://ejemplo.com/imagen.jpg"
        />
      </div>
    </div>
  );
}
