# Food Store - Checklist de Entrega y Análisis de Proyecto

## 📋 Información General del Proyecto

**Proyecto:** Food Store - Sistema de Gestión de Alimentos  
**Arquitectura:** Feature-First + DDD (Domain-Driven Design)  
**Stack Tecnológico:**
- **Backend:** FastAPI (Python) + SQLAlchemy + PostgreSQL 15
- **Frontend:** React 18 + TypeScript 5 + Vite + TanStack Query v5 + Tailwind CSS 3
- **Patrones:** Unit of Work, Repository Pattern, CQRS parcial

---

## ✅ REQUISITOS MÍNIMOS OBLIGATORIOS

### 1. **Sistema de Autenticación (Login)** 🔐
- [ ] Página de login funcional
- [ ] Validación de credenciales (JWT)
- [ ] Manejo de tokens (access + refresh)
- [ ] Protección de rutas privadas (ProtectedRoute HOC)
- [ ] Logout funcional
- [ ] Persistencia de sesión
- [ ] Manejo de errores de autenticación (401, 403)

**Endpoints esperados:**
```
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET /api/v1/auth/me
```

**Store/Estado:**
- authStore con token, usuario, isAuth, persist

---

### 2. **Menú de Navegación** 🧭
- [ ] Menú principal implementado
- [ ] Navegación entre módulos principales:
  - Dashboard/Admin
  - Productos
  - Categorías
  - Pedidos
  - Direcciones (si aplica)
  - Usuarios (si aplica)
- [ ] Menú responsive (mobile/desktop)
- [ ] Indicador de página activa
- [ ] Sidebar colapsable (opcional)
- [ ] User dropdown con nombre y logout

**Componentes esperados:**
- Navbar / Sidebar
- MenuItems dinámicos según rol
- Protected navigation

---

### 3. **CRUD de Insumos/Productos COMPLETO** 📦

#### 3.1 Listado con Filtros
- [ ] Tabla de productos con columnas relevantes:
  - ID, Nombre, Descripción, Precio, Stock, Categoría, Estado
- [ ] **Filtros múltiples:**
  - [ ] Por nombre (búsqueda textual)
  - [ ] Por categoría (dropdown/select)
  - [ ] Por rango de precio (min-max)
  - [ ] Por stock disponible (checkbox: "solo con stock")
  - [ ] Por estado (activo/inactivo)
- [ ] Botón "Limpiar filtros"
- [ ] Loading states durante búsquedas

#### 3.2 Paginación
- [ ] Paginación funcional (frontend o backend)
- [ ] Selector de items por página (10, 25, 50, 100)
- [ ] Indicadores: "Mostrando X-Y de Z resultados"
- [ ] Navegación: Primera, Anterior, Siguiente, Última
- [ ] Números de página clickeables

**Backend esperado:**
```
GET /api/v1/productos?page=1&limit=25&nombre=tomate&categoria_id=5&precio_min=100&precio_max=500&con_stock=true
```

#### 3.3 Crear Producto
- [ ] Formulario de creación con validaciones:
  - Nombre (requerido, máx 150 chars)
  - Descripción (opcional, textarea)
  - Precio base (decimal, requerido, >= 0)
  - Stock (entero, requerido, >= 0)
  - Categoría (select, requerido)
  - Imagen URL (opcional)
  - ¿Es alérgeno? (checkbox)
- [ ] Validación frontend (React Hook Form / Zod)
- [ ] Validación backend (Pydantic)
- [ ] Mensajes de error claros
- [ ] Feedback visual al crear (toast/notification)

**Endpoint:**
```
POST /api/v1/productos
```

#### 3.4 Editar Producto
- [ ] Botón "Editar" en cada fila
- [ ] Modal o página de edición
- [ ] Formulario pre-cargado con datos actuales
- [ ] Mismas validaciones que en Crear
- [ ] Confirmación de cambios
- [ ] Actualización optimista en UI (TanStack Query)

**Endpoint:**
```
PATCH /api/v1/productos/{id}
```

#### 3.5 Baja Lógica (Soft Delete)
- [ ] Botón "Eliminar" o "Desactivar"
- [ ] Modal de confirmación: "¿Estás seguro?"
- [ ] **Baja lógica** (no elimina físicamente)
  - Campo `deleted_at` se actualiza con timestamp
  - O campo `activo: boolean = False`
- [ ] Productos inactivos aparecen diferenciados (gris, badge "Inactivo")
- [ ] Opción de **Reactivar** producto eliminado
- [ ] Filtro para mostrar/ocultar productos inactivos

**Backend:**
```python
# En BaseRepository o ProductoRepository
def soft_delete(self, id: int):
    producto = self.get_by_id(id)
    producto.deleted_at = datetime.now()
    # O: producto.activo = False
    self.session.commit()
```

#### 3.6 Exportación a Excel
- [ ] Botón "Exportar a Excel" visible
- [ ] Exporta productos filtrados (no todos)
- [ ] Columnas incluidas:
  - ID, Nombre, Descripción, Precio, Stock, Categoría, Estado, Fecha Creación
- [ ] Nombre de archivo descriptivo: `productos_2026-05-07.xlsx`
- [ ] Usa biblioteca adecuada:
  - **Frontend:** `xlsx` o `exceljs`
  - **Backend:** `openpyxl` o `pandas`
- [ ] Descarga automática del archivo
- [ ] Loading indicator durante generación

**Implementación sugerida (Frontend):**
```typescript
import * as XLSX from 'xlsx';

const exportarExcel = () => {
  const ws = XLSX.utils.json_to_sheet(productosFiltrados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");
  XLSX.writeFile(wb, `productos_${new Date().toISOString().split('T')[0]}.xlsx`);
};
```

---

## 🚀 FUNCIONALIDADES EXTRA PROPUESTAS

### Opción 1: **Sistema de Gestión de Stock con Alertas** 📊
- [ ] Dashboard con KPIs de inventario:
  - Total de productos
  - Productos con stock bajo (< 10 unidades)
  - Productos sin stock
  - Valor total del inventario
- [ ] Alertas visuales:
  - Badge rojo si stock < 5
  - Badge amarillo si stock entre 5-15
  - Badge verde si stock > 15
- [ ] Historial de movimientos de stock:
  - Tabla `HistorialStock` (producto_id, cantidad, tipo_movimiento, motivo, fecha)
  - Tipos: ENTRADA, SALIDA, AJUSTE, VENTA
- [ ] Funcionalidad de ajuste manual de stock:
  - Modal "Ajustar Stock" con motivo obligatorio
  - Se registra en historial

**Endpoints:**
```
GET /api/v1/productos/stock-bajo
GET /api/v1/productos/{id}/historial-stock
POST /api/v1/productos/{id}/ajustar-stock
GET /api/v1/admin/dashboard/kpis
```

---

### Opción 2: **Gestión de Categorías con Árbol Jerárquico** 🌳
- [ ] CRUD completo de categorías
- [ ] Soporte para subcategorías (árbol recursivo):
  - Categoría padre (parent_id nullable)
  - Visualización en árbol expandible
- [ ] Drag & drop para reordenar
- [ ] Campo `orden` para sorting custom
- [ ] Contador de productos por categoría
- [ ] No permitir eliminar categorías con productos asociados (soft delete)

**Modelo:**
```python
class Categoria(Base):
    id: int
    nombre: str
    parent_id: int | None  # Auto-referencia
    orden: int
    activo: bool
    productos: list[Producto]  # Relación
```

**Frontend:**
- Componente TreeView recursivo
- Breadcrumbs: "Alimentos > Frutas > Cítricos"

---

### Opción 3: **Sistema de Pedidos con Estados y Trazabilidad** 🛒
- [ ] Visualización de pedidos (tabla/cards)
- [ ] Estados del pedido con FSM (Finite State Machine):
  - PENDIENTE → CONFIRMADO → EN_PREP → ENTREGADO → CANCELADO
- [ ] Timeline visual del pedido (stepper)
- [ ] Filtros por estado, fecha, cliente
- [ ] Ver detalle del pedido:
  - Productos, cantidades, precios snapshot
  - Subtotal, descuento, envío, total
  - Dirección de entrega
  - Notas del cliente
- [ ] Cambiar estado manualmente (solo admins)
- [ ] Exportar pedidos a Excel/PDF

**Reglas de negocio (ya están en tu imagen 5):**
```
RN-01: es_terminal=true → 0 transiciones salientes
RN-02: primer HistorialEstadoPedido → estado_desde=NULL
RN-03: HistorialEstadoPedido.es_append=only
RN-04: Fila INMUTABLE, sin updated_at
RN-05: motivo obligatorio si estado_hacia = CANCELADO
```

---

### Opción 4: **Integración con MercadoPago (Checkout Pro)** 💳
- [ ] Botón "Pagar con MercadoPago" en checkout
- [ ] Webhook configurado para recibir notificaciones de pago
- [ ] Estados sincronizados:
  - `mp_payment_id`, `mp_status`, `external_reference`
- [ ] Tabla `Pago` con trazabilidad completa:
  - `idempotency_key`, `transaction_amount`, `payment_method_id`
- [ ] Manejo de reintentos de pago
- [ ] Dashboard de pagos (aprobados, pendientes, rechazados)

**Endpoints:**
```
POST /api/v1/pagos/crear-preferencia
POST /api/v1/pagos/webhook  # Recibe notificaciones de MP
GET /api/v1/pedidos/{id}/estado-pago
```

---

## 🏗️ ARQUITECTURA Y CALIDAD DE CÓDIGO

### Backend (FastAPI)
- [ ] Estructura modular por features (✅ según imagen)
- [ ] Patrón Repository implementado
- [ ] UnitOfWork para transacciones
- [ ] DTOs con Pydantic (request/response schemas)
- [ ] Manejo centralizado de excepciones (middleware)
- [ ] CORS configurado correctamente
- [ ] Migraciones Alembic funcionando
- [ ] Seed data para testing
- [ ] Variables de entorno (`.env`)
- [ ] Docker Compose para levantar entorno completo

### Frontend (React + TS)
- [ ] Estructura Feature-Sliced o similar
- [ ] Custom hooks para lógica reutilizable:
  - `useAuth`, `useProductos`, `usePedidos`
- [ ] TanStack Query para fetching + cache
- [ ] Zustand para estado global (authStore, cartStore, etc.)
- [ ] Validaciones con Zod + React Hook Form
- [ ] Componentes reutilizables (Button, Input, Modal, Table)
- [ ] Tipos TypeScript estrictos (no `any`)
- [ ] Manejo de errores con boundaries
- [ ] Loading states y skeletons
- [ ] Responsive design (mobile-first)

### Base de Datos
- [ ] Normalización adecuada (3FN)
- [ ] Índices en columnas frecuentemente consultadas
- [ ] Foreign Keys con `ON DELETE` apropiado
- [ ] Campos de auditoría: `created_at`, `updated_at`, `deleted_at`
- [ ] Constraints para integridad:
  - `CHECK (precio_base >= 0)`
  - `CHECK (stock_cantidad >= 0)`

---

## 🧪 TESTING (Opcional pero Recomendado)

### Backend
- [ ] Tests unitarios para servicios clave (pytest)
- [ ] Tests de integración para endpoints críticos
- [ ] Fixtures para datos de prueba

### Frontend
- [ ] Tests de componentes (Vitest + Testing Library)
- [ ] Tests E2E básicos (Playwright/Cypress) para flujos críticos:
  - Login → Ver productos → Añadir al carrito → Checkout

---

## 📚 DOCUMENTACIÓN

- [ ] README.md con:
  - Descripción del proyecto
  - Instrucciones de instalación
  - Cómo levantar el proyecto (Docker Compose)
  - Variables de entorno necesarias
  - Credenciales de prueba
- [ ] Documentación de API (Swagger/ReDoc auto-generado por FastAPI)
- [ ] Diagramas de arquitectura (✅ ya los tienes)
- [ ] Modelo de base de datos (ERD)

---

## 🎯 CHECKLIST FINAL PRE-ENTREGA

- [ ] Todos los requisitos mínimos cumplidos
- [ ] Al menos 1 funcionalidad extra implementada
- [ ] Código pusheado a repositorio Git
- [ ] Proyecto corre sin errores en ambiente local
- [ ] Base de datos tiene seed data para demostración
- [ ] No hay warnings críticos en consola
- [ ] Responsive funciona en mobile y desktop
- [ ] Credenciales de admin creadas para pruebas
- [ ] Docker Compose funciona correctamente
- [ ] README actualizado con instrucciones claras

---

## 🐛 POSIBLES PROBLEMAS A REVISAR

1. **Autenticación:**
   - ¿Interceptor Axios configura Bearer token automáticamente?
   - ¿RefreshToken se maneja correctamente en 401?

2. **Productos:**
   - ¿La paginación mantiene filtros al cambiar de página?
   - ¿El soft delete filtra productos inactivos por defecto?
   - ¿La exportación a Excel incluye solo datos visibles/filtrados?

3. **Performance:**
   - ¿Las consultas tienen N+1 problems?
   - ¿Se usan índices en columnas de búsqueda?
   - ¿TanStack Query cachea correctamente?

4. **UX:**
   - ¿Hay feedback visual en todas las acciones (loading, success, error)?
   - ¿Los formularios validan antes de enviar?
   - ¿Los modales se cierran correctamente después de acciones?

---

## 📞 PREGUNTAS PARA OpenCode

1. ¿Falta implementar alguno de los requisitos mínimos?
2. ¿La arquitectura actual soporta bien la funcionalidad extra elegida?
3. ¿Hay código duplicado que se pueda refactorizar?
4. ¿Los nombres de archivos y carpetas siguen convenciones consistentes?
5. ¿Se manejan correctamente todos los edge cases (ej: producto sin categoría)?
6. ¿Hay potenciales problemas de seguridad (ej: SQL injection, XSS)?
7. ¿La estructura de la base de datos es óptima?
8. ¿Falta algún endpoint crítico en el backend?

---

## 🎁 EXTRAS SUGERIDOS (Nice-to-Have)

- [ ] Dark mode
- [ ] Internacionalización (i18n)
- [ ] Logs estructurados (backend)
- [ ]Healthcheck endpoint (`/health`)
- [ ] Rate limiting (opcional)
- [ ] Compresión de imágenes al subir
- [ ] Búsqueda con debounce (evitar queries innecesarias)
- [ ] Infinite scroll en lugar de paginación tradicional
- [ ] Drag & drop para reordenar productos/categorías

---

**Última actualización:** 07/05/2026  
**Autor:** Desarrollador Food Store  
**Versión:** 1.0