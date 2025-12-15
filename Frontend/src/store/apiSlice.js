import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: 'http://localhost:5000/api',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'User',
    'Warehouse',
    'Product',
    'Products',
    'Stock',
    'Receipt',
    'Receipts',
    'Delivery',
    'DeliveryOrders',
    'Transfer',
    'Adjustment',
    'Alert',
    'Reorder',
    'PurchaseOrder',
    'Vendor',
    'Dashboard',
    'Report',
    'Setting',
    'Webhook',
    'Notification',
    'Upload',
    'Ledger',
  ],
  endpoints: () => ({}),
});
