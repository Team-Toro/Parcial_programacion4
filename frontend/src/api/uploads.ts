import { api } from './client';

export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
}

// Extrae el public_id desde una URL de Cloudinary.
// Patrón: .../upload/v{version}/{public_id}.{ext}
export function extractPublicId(url: string): string {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
  return match ? match[1] : url;
}

export async function uploadImagen(
  file: File,
  folder = 'foodstore/productos'
): Promise<CloudinaryResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);
  // Content-Type: undefined → axios infiere multipart/form-data con boundary correcto
  const { data } = await api.post<CloudinaryResponse>('/api/v1/uploads/imagen', formData, {
    headers: { 'Content-Type': undefined },
  });
  return data;
}

export async function deleteImagen(publicId: string): Promise<void> {
  await api.delete(`/api/v1/uploads/imagen/${encodeURIComponent(publicId)}`);
}
