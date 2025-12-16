import { apiSlice } from '../apiSlice';

export const warehousesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWarehouses: builder.query({
      query: () => '/warehouses',
      transformResponse: (response) => response.warehouses || response,
      providesTags: ['Warehouse'],
    }),
    getWarehouse: builder.query({
      query: (id) => `/warehouses/${id}`,
      providesTags: (result, error, id) => [{ type: 'Warehouse', id }],
    }),
    createWarehouse: builder.mutation({
      query: (warehouse) => ({
        url: '/warehouses',
        method: 'POST',
        body: warehouse,
      }),
      invalidatesTags: ['Warehouse'],
    }),
    updateWarehouse: builder.mutation({
      query: ({ id, ...warehouse }) => ({
        url: `/warehouses/${id}`,
        method: 'PUT',
        body: warehouse,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Warehouse', id }, 'Warehouse'],
    }),
  }),
});

export const {
  useGetWarehousesQuery,
  useGetWarehouseQuery,
  useCreateWarehouseMutation,
  useUpdateWarehouseMutation,
} = warehousesApi;
