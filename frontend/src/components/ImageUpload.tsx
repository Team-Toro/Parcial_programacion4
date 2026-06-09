import { useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { uploadImagen, deleteImagen, extractPublicId } from '../api/uploads';

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
  folder?: string;
  maxImages?: number;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export default function ImageUpload({
  value,
  onChange,
  multiple = false,
  folder = 'foodstore/productos',
  maxImages,
}: Props) {
  const max = maxImages ?? (multiple ? 5 : 1);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const slots = max - value.length;
    if (slots <= 0) {
      setError(`Límite alcanzado: máximo ${max} imagen${max !== 1 ? 'es' : ''}.`);
      return;
    }

    const toUpload = Array.from(files).slice(0, slots);

    for (const file of toUpload) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Tipo no permitido: "${file.name}". Usá JPEG, PNG o WebP.`);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError(`"${file.name}" supera el límite de 5 MB.`);
        return;
      }
    }

    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (const file of toUpload) {
        const res = await uploadImagen(file, folder);
        newUrls.push(res.secure_url);
      }
      onChange([...value, ...newUrls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async (url: string, idx: number) => {
    setError(null);
    try {
      await deleteImagen(extractPublicId(url));
    } catch {
      // Si falla el delete en Cloudinary igual se quita de la UI
    }
    onChange(value.filter((_, i) => i !== idx));
  };

  const canAdd = value.length < max && !uploading;

  return (
    <div className="flex flex-col gap-2">
      {/* Previews de imágenes actuales */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div
              key={i}
              className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0"
            >
              <img
                src={url}
                alt={`Imagen ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(url, i)}
                className="absolute top-0.5 right-0.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botón de subida */}
      {canAdd && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-orange-400 hover:text-orange-500 transition-colors w-fit"
        >
          <span className="text-base leading-none">+</span>
          {multiple ? 'Agregar imagen' : 'Subir imagen'}
        </button>
      )}

      {/* Indicador de carga */}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Subiendo...
        </div>
      )}

      {/* Error */}
      {error && <p className="text-red-500 text-xs">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple && max - value.length > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
