import { apiSlice } from '../apiSlice';

export const adjustmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdjustments: builder.query({
      query: () => '/adjustments',
      providesTags: ['Adjustment'],
    }),
    getAdjustment: builder.query({
      query: (id) => `/adjustments/${id}`,
      providesTags: (result, error, id) => [{ type: 'Adjustment', id }],
    }),
    createAdjustment: builder.mutation({
      query: (data) => ({
        url: '/adjustments',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Adjustment'],
    }),
    applyAdjustment: builder.mutation({
      query: ({ id, notes }) => ({
        url: `/adjustments/${id}/apply`,
        method: 'POST',
        body: { notes },
      }),
      invalidatesTags: ['Adjustment', 'Stock'],
    }),
    cancelAdjustment: builder.mutation({
      query: ({ id, notes }) => ({
        url: `/adjustments/${id}/cancel`,
        method: 'POST',
        body: { notes },
      }),
      invalidatesTags: ['Adjustment'],
    }),
  }),
});

export const {
  useGetAdjustmentsQuery,
  useGetAdjustmentQuery,
  useCreateAdjustmentMutation,
  useApplyAdjustmentMutation,
  useCancelAdjustmentMutation,
} = adjustmentsApi;

