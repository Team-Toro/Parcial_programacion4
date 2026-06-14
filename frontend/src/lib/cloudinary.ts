/**
 * Inyecta transformaciones Cloudinary on-the-fly en una URL.
 * Si la URL no es de Cloudinary (o está vacía), la devuelve sin modificar.
 *
 * Transformaciones aplicadas:
 * - f_auto: formato óptimo según el navegador (WebP, AVIF)
 * - q_auto: calidad óptima automática
 * - c_fill: recorta para llenar el espacio
 * - w_XXX: ancho deseado
 */
export function cloudinaryTransform(url: string | undefined, width = 400): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;
  // Ya tiene transformaciones aplicadas → no duplicar
  if (url.includes('/upload/f_') || url.includes('/upload/q_')) return url;

  return url.replace('/upload/', `/upload/f_auto,q_auto,c_fill,w_${width}/`);
}
