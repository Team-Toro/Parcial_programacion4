import * as XLSX from 'xlsx';
import { getIngredientes } from '../api/ingredientes';
import { getProductos } from '../api/productos';
import type { IngredienteListParams, ProductoListParams } from '../types';

type IngExportParams = Pick<IngredienteListParams, 'q' | 'es_alergeno' | 'sort' | 'order'>;
type ProdExportParams = Pick<ProductoListParams, 'q' | 'categoria_id' | 'precio_min' | 'precio_max' | 'in_stock' | 'disponible' | 'sort' | 'order'>;

const BATCH_SIZE = 100;
const MAX_ITERATIONS = 50;

export async function exportIngredientesToExcel(filters: IngExportParams): Promise<void> {
  const all = [];
  let offset = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const batch = await getIngredientes({ ...filters, offset, limit: BATCH_SIZE });
    all.push(...batch);
    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
    if (i === MAX_ITERATIONS - 1) {
      throw new Error(`El export superó el límite de ${MAX_ITERATIONS * BATCH_SIZE} registros.`);
    }
  }

  if (all.length === 0) throw new Error('No hay datos para exportar con los filtros actuales.');

  const rows = all.map(ing => ({
    'ID': ing.id,
    'Nombre': ing.nombre,
    'Descripción': ing.descripcion ?? '',
    'Es alérgeno': ing.es_alergeno ? 'Sí' : 'No',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 50 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Insumos');
  XLSX.writeFile(wb, `insumos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportProductosToExcel(filters: ProdExportParams): Promise<void> {
  const all = [];
  let offset = 0;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const { items } = await getProductos({ ...filters, offset, limit: BATCH_SIZE });
    all.push(...items);
    if (items.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
    if (i === MAX_ITERATIONS - 1) {
      throw new Error(`El export superó el límite de ${MAX_ITERATIONS * BATCH_SIZE} registros.`);
    }
  }

  if (all.length === 0) throw new Error('No hay datos para exportar con los filtros actuales.');

  const rows = all.map(p => ({
    'ID': p.id,
    'Nombre': p.nombre,
    'Descripción': p.descripcion ?? '',
    'Precio': Number(p.precio_base).toFixed(2),
    'Stock': p.stock_cantidad,
    'Categorías': p.categorias.map(pc => pc.categoria?.nombre).filter(Boolean).join(', '),
    'Estado': p.disponible ? (p.stock_cantidad > 0 ? 'Activo' : 'Agotado') : 'Deshabilitado',
    'Fecha Creación': p.created_at?.slice(0, 10) ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 50 }, { wch: 10 }, { wch: 8 }, { wch: 30 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Productos');
  XLSX.writeFile(wb, `productos_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
