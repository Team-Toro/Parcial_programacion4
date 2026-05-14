import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CategoriasPage from './pages/CategoriasPage';
import IngredientesPage from './pages/IngredientesPage';
import ProductosPage from './pages/ProductosPage';
import ProductoDetallePage from './pages/ProductoDetallePage';
import AdminUsuariosPage from './pages/AdminUsuariosPage';
import MisDireccionesPage from './pages/MisDireccionesPage';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rutas protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/productos" replace />} />
              <Route path="/categorias" element={<CategoriasPage />} />
              <Route path="/productos" element={<ProductosPage />} />
              <Route path="/productos/:id" element={<ProductoDetallePage />} />
              <Route path="/mis-direcciones" element={<MisDireccionesPage />} />

              {/* Solo admin */}
              <Route element={<AdminRoute />}>
                <Route path="/ingredientes" element={<IngredientesPage />} />
                <Route path="/admin/usuarios" element={<AdminUsuariosPage />} />
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
