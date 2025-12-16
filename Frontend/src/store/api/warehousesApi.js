import { apiSlice } from '../apiSlice';

export const warehousesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWarehouses: builder.query({
      query: () => '/warehouses',
      transformResponse: (response) => {
        console.log('Warehouses API Response:', response);
        // Backend returns data array, not warehouses array
        const warehouses = response.data || response.warehouses || response;
        console.log('Transformed warehouses:', warehouses);
        return Array.isArray(warehouses) ? warehouses : [];
      },
      providesTags: ['Warehouse'],
    }),
    getWarehouse: builder.query({
      query: (id) => `/warehouses/${id}`,
      transformResponse: (response) => response.data || response.warehouse || response,
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
