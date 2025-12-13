import { apiSlice } from '../apiSlice';

export const dashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardSummary: builder.query({
      query: () => '/dashboard/summary',
      providesTags: ['Dashboard'],
    }),
    getStockAgeing: builder.query({
      query: (params) => ({
        url: '/reports/stock-ageing',
        params,
      }),
    }),
    getTurnover: builder.query({
      query: (params) => ({
        url: '/reports/turnover',
        params,
      }),
    }),
    getSlowMoving: builder.query({
      query: (params) => ({
        url: '/reports/slow-moving',
        params,
      }),
    }),
  }),
});

export const {
  useGetDashboardSummaryQuery,
  useGetStockAgeingQuery,
  useGetTurnoverQuery,
  useGetSlowMovingQuery,
} = dashboardApi;
