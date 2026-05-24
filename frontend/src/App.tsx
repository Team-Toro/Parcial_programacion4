import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import StaffRoute from './components/auth/StaffRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CategoriasPage from './pages/CategoriasPage';
import IngredientesPage from './pages/IngredientesPage';
import ProductosPage from './pages/ProductosPage';
import ProductoDetallePage from './pages/ProductoDetallePage';
import AdminUsuariosPage from './pages/AdminUsuariosPage';
import MisDireccionesPage from './pages/MisDireccionesPage';
import CarritoPage from './pages/CarritoPage';
import CheckoutPage from './pages/CheckoutPage';
import MisPedidosPage from './pages/MisPedidosPage';
import PedidoDetallePage from './pages/PedidoDetallePage';
import AdminPedidosPage from './pages/AdminPedidosPage';
import PagoMockPage from './pages/PagoMockPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<MainLayout />}>
            <Route path="/" element={<Navigate to="/productos" replace />} />
            <Route path="/categorias" element={<CategoriasPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/productos/:id" element={<ProductoDetallePage />} />

            {/* Rutas protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route path="/mis-direcciones" element={<MisDireccionesPage />} />
              <Route path="/carrito" element={<CarritoPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/mis-pedidos" element={<MisPedidosPage />} />
              <Route path="/mis-pedidos/:id" element={<PedidoDetallePage />} />
              <Route path="/pago-mock/:external_reference" element={<PagoMockPage />} />

              {/* Solo admin */}
              <Route element={<AdminRoute />}>
                <Route path="/ingredientes" element={<IngredientesPage />} />
                <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
              </Route>

              {/* Admin o staff con rol PEDIDOS */}
              <Route element={<StaffRoute />}>
                <Route path="/admin/pedidos" element={<AdminPedidosPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/productos" replace />} />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
