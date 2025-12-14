import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import RoleRoute from '../components/layout/RoleRoute';

import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';
import ProductList from '../features/products/ProductList';
import ProductDetail from '../features/products/ProductDetail';
import ProductForm from '../features/products/ProductForm';
import WarehouseList from '../features/warehouses/WarehouseList';
import WarehouseDetail from '../features/warehouses/WarehouseDetail';
import WarehouseForm from '../features/warehouses/WarehouseForm';
import StockList from '../features/stock/StockList';
import ReceiptList from '../features/receipts/ReceiptList';
import ReceiptForm from '../features/receipts/ReceiptForm';
import ReceiptDetail from '../features/receipts/ReceiptDetail';
import DeliveryOrderList from '../features/deliveryOrders/DeliveryOrderList';
import DeliveryOrderForm from '../features/deliveryOrders/DeliveryOrderForm';
import DeliveryOrderDetail from '../features/deliveryOrders/DeliveryOrderDetail';

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
              <ProductList />
            </RoleRoute>
          }
        />

        <Route
          path="/products/new"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <ProductForm />
            </RoleRoute>
          }
        />

        <Route
          path="/products/:id"
          element={
            <RoleRoute allowedRoles={['admin', 'manager']}>
              <ProductDetail />
            </RoleRoute>
          }
        />

        <Route
          path="/products/:id/edit"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <ProductForm />
            </RoleRoute>
          }
        />

        <Route
          path="/warehouses"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <WarehouseList />
            </RoleRoute>
          }
        />

        <Route
          path="/warehouses/new"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <WarehouseForm />
            </RoleRoute>
          }
        />

        <Route
          path="/warehouses/:id"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <WarehouseDetail />
            </RoleRoute>
          }
        />

        <Route
          path="/warehouses/:id/edit"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <WarehouseForm />
            </RoleRoute>
          }
        />

        <Route
          path="/stock"
          element={
            <RoleRoute allowedRoles={['admin', 'manager']}>
              <StockList />
            </RoleRoute>
          }
        />

        <Route
          path="/receipts"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <ReceiptList />
            </RoleRoute>
          }
        />

        <Route
          path="/receipts/new"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <ReceiptForm />
            </RoleRoute>
          }
        />

        <Route
          path="/receipts/:id/edit"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <ReceiptForm />
            </RoleRoute>
          }
        />

        <Route
          path="/receipts/:id"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <ReceiptDetail />
            </RoleRoute>
          }
        />

        <Route
          path="/delivery-orders"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <DeliveryOrderList />
            </RoleRoute>
          }
        />

        <Route
          path="/delivery-orders/new"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <DeliveryOrderForm />
            </RoleRoute>
          }
        />

        <Route
          path="/delivery-orders/:id/edit"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <DeliveryOrderForm />
            </RoleRoute>
          }
        />

        <Route
          path="/delivery-orders/:id"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <DeliveryOrderDetail />
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

export { AppRoutes };
export default AppRoutes;
