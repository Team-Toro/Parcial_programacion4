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

export interface CategoriaListParams {
  offset?: number;
  limit?: number;
  q?: string;
  parent_id?: number;
  only_roots?: boolean;
  sort?: 'nombre' | 'created_at' | 'parent_id';
  order?: 'asc' | 'desc';
  include_deleted?: boolean;
}

export type UnidadMedida = 'unidad' | 'kg' | 'litro';

export interface Ingrediente {
  id: number;
  nombre: string;
  descripcion?: string;
  es_alergeno: boolean;
  unidad: UnidadMedida;
  stock_actual: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface IngredienteCreate {
  nombre: string;
  descripcion?: string;
  es_alergeno: boolean;
  unidad: UnidadMedida;
  stock_actual: number;
}

export interface IngredienteListParams {
  offset?: number;
  limit?: number;
  q?: string;
  es_alergeno?: boolean;
  sort?: 'nombre' | 'created_at' | 'stock_actual';
  order?: 'asc' | 'desc';
  include_deleted?: boolean;
}

export interface IngredienteEnProducto {
  ingrediente_id: number;
  es_removible: boolean;
  cantidad: number;
}

export interface IngredienteConDetalles {
  ingrediente: Ingrediente;
  es_removible: boolean;
  cantidad: number;
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
  stock_disponible: number;
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

export interface ProductoListParams {
  offset?: number;
  limit?: number;
  q?: string;
  disponible?: boolean;
  categoria_id?: number;
  precio_min?: number;
  precio_max?: number;
  stock_min?: number;
  stock_max?: number;
  in_stock?: boolean;
  sort?: 'nombre' | 'precio_base' | 'created_at' | 'stock_cantidad';
  order?: 'asc' | 'desc';
  include_deleted?: boolean;
}

export interface Usuario {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  celular: string;
  roles: string[];
  disabled: boolean;
}

export interface Direccion {
  id: number;
  usuario_id: number;
  alias: string | null;
  linea1: string;
  linea2: string | null;
  ciudad: string;
  provincia: string | null;
  codigo_postal: string | null;
  latitud: number | null;
  longitud: number | null;
  es_principal: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DireccionCreate {
  alias?: string;
  linea1: string;
  linea2?: string;
  ciudad: string;
  provincia?: string;
  codigo_postal?: string;
  latitud?: number;
  longitud?: number;
  es_principal?: boolean;
}

export type DireccionUpdate = Partial<DireccionCreate>;

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  celular: string;
  password: string;
}
