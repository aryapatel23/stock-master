import { apiSlice } from '../apiSlice';

export const stockApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStock: builder.query({
      query: (params) => ({
        url: '/stock',
        params,
      }),
      providesTags: ['Stock'],
    }),
  }),
});

export const {
  useGetStockQuery,
} = stockApi;
