export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  parent_id?: number;
  orden_display: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CategoriaCreate {
  nombre: string;
  descripcion?: string;
  parent_id?: number;
  orden_display?: number;
}

export interface Ingrediente {
  id: number;
  nombre: string;
  descripcion?: string;
  es_alergeno: boolean;
}

export interface IngredienteCreate {
  nombre: string;
  descripcion?: string;
  es_alergeno: boolean;
}

export interface IngredienteEnProducto {
  ingrediente_id: number;
  es_removible: boolean;
  es_opcional: boolean;
}

export interface IngredienteConDetalles {
  ingrediente: Ingrediente;
  es_removible: boolean;
  es_opcional: boolean;
}

export interface ProductoCategoria {
  categoria?: Categoria;
  es_principal: boolean;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio_base: number;
  imagenes_url?: string[];
  tiempo_prep_min?: number;
  disponible: boolean;
  categorias: ProductoCategoria[];
  ingredientes: IngredienteConDetalles[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ProductoCreate {
  nombre: string;
  descripcion?: string;
  precio_base: number;
  imagenes_url?: string[];
  tiempo_prep_min?: number;
  disponible: boolean;
  categoria_ids: number[];
  ingredientes: IngredienteEnProducto[];
}
