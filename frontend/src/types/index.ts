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

export interface IngredienteListParams {
  offset?: number;
  limit?: number;
  q?: string;
  es_alergeno?: boolean;
  sort?: 'nombre' | 'created_at';
  order?: 'asc' | 'desc';
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

export interface Usuario {
  id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  role: 'user' | 'admin';
  disabled: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterPayload {
  username: string;
  full_name?: string;
  email?: string;
  password: string;
}

export interface CategoriaStats {
  subcategorias_count: number;
  productos_count: number;
  nivel: number;
}

export interface ProductoListParams {
  offset?: number;
  limit?: number;
  q?: string;
  categoria_id?: number;
  precio_min?: number;
  precio_max?: number;
  in_stock?: boolean;
  disponible?: boolean;
  sort?: string;
  order?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}
