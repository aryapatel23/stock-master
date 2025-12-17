import { apiSlice } from '../apiSlice';

export const stockApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStock: builder.query({
      query: (params = {}) => ({
        url: '/stock',
        params: { limit: 100, ...params },
      }),
      transformResponse: (response) => response.data || response.stock || response,
      providesTags: ['Stock'],
      // Polling for real-time updates every 30 seconds
      pollingInterval: 30000,
    }),
    getStockByProduct: builder.query({
      query: (productId) => `/stock/${productId}`,
      transformResponse: (response) => response.data || response,
      providesTags: (result, error, id) => [{ type: 'Stock', id }],
    }),
  }),
});

export const {
  useGetStockQuery,
  useGetStockByProductQuery,
} = stockApi;
