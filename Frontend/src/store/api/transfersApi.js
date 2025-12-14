import { apiSlice } from '../apiSlice';

export const transfersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTransfers: builder.query({
      query: (params) => ({
        url: '/transfers',
        params,
      }),
      providesTags: ['Transfers'],
    }),
    getTransfer: builder.query({
      query: (id) => `/transfers/${id}`,
      providesTags: (result, error, id) => [{ type: 'Transfers', id }],
    }),
    createTransfer: builder.mutation({
      query: (data) => ({
        url: '/transfers',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Transfers'],
    }),
    executeTransfer: builder.mutation({
      query: ({ id, notes, idempotencyKey }) => ({
        url: `/transfers/${id}/execute`,
        method: 'POST',
        body: { notes, idempotencyKey },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Transfers', id }, 'Transfers'],
    }),
    cancelTransfer: builder.mutation({
      query: ({ id, notes }) => ({
        url: `/transfers/${id}/cancel`,
        method: 'POST',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Transfers', id }, 'Transfers'],
    }),
  }),
});

export const {
  useGetTransfersQuery,
  useGetTransferQuery,
  useCreateTransferMutation,
  useExecuteTransferMutation,
  useCancelTransferMutation,
} = transfersApi;
