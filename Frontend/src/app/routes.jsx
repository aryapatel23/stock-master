import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import RoleRoute from '../components/layout/RoleRoute';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route
          path="/products"
          element={
            <RoleRoute allowedRoles={['admin', 'manager']}>
              <div>Products Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/warehouses"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <div>Warehouses Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/stock"
          element={
            <RoleRoute allowedRoles={['admin', 'manager']}>
              <div>Stock Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/receipts"
          element={
            <RoleRoute allowedRoles={['admin', 'manager']}>
              <div>Receipts Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/delivery-orders"
          element={
            <RoleRoute allowedRoles={['admin', 'manager']}>
              <div>Delivery Orders Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/transfers"
          element={
            <RoleRoute allowedRoles={['admin', 'manager']}>
              <div>Transfers Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/adjustments"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <div>Adjustments Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/ledger"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <div>Ledger Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <RoleRoute allowedRoles={['admin', 'manager']}>
              <div>Reports Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <RoleRoute allowedRoles={['employee']}>
              <div>My Tasks Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/users"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <div>Users Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <RoleRoute allowedRoles={['employee']}>
              <div>Profile Page</div>
            </RoleRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <div>Settings Page</div>
            </RoleRoute>
          }
        />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
