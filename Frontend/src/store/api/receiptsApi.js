import { apiSlice } from '../apiSlice';

export const receiptsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReceipts: builder.query({
      query: (params) => ({
        url: '/receipts',
        params,
      }),
      providesTags: ['Receipts'],
    }),
    getReceipt: builder.query({
      query: (id) => `/receipts/${id}`,
      providesTags: (result, error, id) => [{ type: 'Receipts', id }],
    }),
    createReceipt: builder.mutation({
      query: (data) => ({
        url: '/receipts',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Receipts'],
    }),
    updateReceipt: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/receipts/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Receipts', id }, 'Receipts'],
    }),
  }),
});

export const {
  useGetReceiptsQuery,
  useGetReceiptQuery,
  useCreateReceiptMutation,
  useUpdateReceiptMutation,
} = receiptsApi;
