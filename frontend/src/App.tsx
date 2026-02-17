import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import MainLayout from './components/Layout/MainLayout';
import PermissionGuard from './components/PermissionGuard';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import InventoryPage from './pages/InventoryPage';
import OrdersPage from './pages/OrdersPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/pos" replace />} />

          {/* 所有登入者可用 */}
          <Route path="pos"       element={<POSPage />} />
          <Route path="orders"    element={<OrdersPage />} />
          <Route path="inventory" element={<InventoryPage />} />

          {/* 需要 MANAGER 以上 */}
          <Route path="products"   element={
            <PermissionGuard requiredRole="MANAGER"><ProductsPage /></PermissionGuard>
          } />
          <Route path="categories" element={
            <PermissionGuard requiredRole="MANAGER"><CategoriesPage /></PermissionGuard>
          } />
          <Route path="reports"    element={
            <PermissionGuard requiredRole="MANAGER"><ReportsPage /></PermissionGuard>
          } />

          {/* 需要 ADMIN */}
          <Route path="users" element={
            <PermissionGuard requiredRole="ADMIN"><UsersPage /></PermissionGuard>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
