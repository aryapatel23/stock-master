import { apiSlice } from '../apiSlice';

export const reportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStockAgeing: builder.query({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
        if (params?.daysBucket) queryParams.append('daysBucket', params.daysBucket);
        return `/reports/stock-ageing?${queryParams.toString()}`;
      },
      providesTags: ['Report'],
    }),
    getInventoryTurnover: builder.query({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.from) queryParams.append('from', params.from);
        if (params?.to) queryParams.append('to', params.to);
        if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
        if (params?.productId) queryParams.append('productId', params.productId);
        return `/reports/turnover?${queryParams.toString()}`;
      },
      providesTags: ['Report'],
    }),
    getSlowMovingItems: builder.query({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
        if (params?.days) queryParams.append('days', params.days);
        if (params?.minQty) queryParams.append('minQty', params.minQty);
        return `/reports/slow-moving?${queryParams.toString()}`;
      },
      providesTags: ['Report'],
    }),
    getStockValue: builder.query({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
        if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
        return `/stock/value?${queryParams.toString()}`;
      },
      providesTags: ['Report', 'Stock'],
    }),
  }),
});

export const {
  useGetStockAgeingQuery,
  useGetInventoryTurnoverQuery,
  useGetSlowMovingItemsQuery,
  useGetStockValueQuery,
} = reportsApi;
