import { apiSlice } from '../apiSlice';

export const receiptsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getReceipts: builder.query({
      query: (params) => ({
        url: '/receipts',
        params,
      }),
      transformResponse: (response) => response.data ? response : { data: response, meta: {} },
      providesTags: ['Receipts'],
    }),
    getReceipt: builder.query({
      query: (id) => `/receipts/${id}`,
      transformResponse: (response) => response.data || response,
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
    updateReceivedQty: builder.mutation({
      query: ({ id, lines }) => ({
        url: `/receipts/${id}/update-qty`,
        method: 'POST',
        body: { lines },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Receipts', id }, 'Receipts'],
    }),
    validateReceipt: builder.mutation({
      query: ({ id, idempotencyKey }) => ({
        url: `/receipts/${id}/validate`,
        method: 'POST',
        body: { idempotencyKey },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Receipts', id }, 'Receipts', 'Stock'],
    }),
    cancelReceipt: builder.mutation({
      query: ({ id, notes }) => ({
        url: `/receipts/${id}/cancel`,
        method: 'POST',
        body: { notes },
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
  useUpdateReceivedQtyMutation,
  useValidateReceiptMutation,
  useCancelReceiptMutation,
} = receiptsApi;
