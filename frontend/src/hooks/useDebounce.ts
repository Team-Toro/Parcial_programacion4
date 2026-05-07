import { useEffect, useState } from 'react';

/**
 * Retrasa la actualización de un valor hasta que pasen `delay` ms sin cambios.
 * Útil para evitar llamadas excesivas en inputs de búsqueda o filtros.
 *
 * @example
 * const debounced = useDebounce(searchInput, 400);
 * useEffect(() => { fetch(debounced); }, [debounced]);
 *
 * @param value valor a debouncear
 * @param delay milisegundos a esperar (default 400)
 * @returns el valor debounceado
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
