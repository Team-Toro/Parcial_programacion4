export interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  parent_id?: number;
  imagen_url?: string;
  subcategorias?: Categoria[];
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CategoriaCreate {
  nombre: string;
  descripcion?: string;
  parent_id?: number;
  imagen_url?: string;
}

export interface Ingrediente {
  id: number;
  nombre: string;
  descripcion?: string;
  es_alergeno: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface IngredienteCreate {
  nombre: string;
  descripcion?: string;
  es_alergeno: boolean;
}

export interface IngredienteEnProducto {
  ingrediente_id: number;
  es_removible: boolean;
}

export interface IngredienteConDetalles {
  ingrediente: Ingrediente;
  es_removible: boolean;
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
  stock_cantidad: number;
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
  stock_cantidad?: number;
  disponible: boolean;
  categoria_ids: number[];
  ingredientes: IngredienteEnProducto[];
}
