import { CategoriaCreate } from '../../types';

interface CategoriaFormProps {
  form: CategoriaCreate;
  onChange: (form: CategoriaCreate) => void;
}

export default function CategoriaForm({ form, onChange }: CategoriaFormProps) {
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
    </div>
  );
}
