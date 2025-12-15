import { apiSlice } from '../apiSlice';

export const ledgerApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLedger: builder.query({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
        if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
        if (params?.productId) queryParams.append('productId', params.productId);
        if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
        if (params?.locationId) queryParams.append('locationId', params.locationId);
        if (params?.transactionType) queryParams.append('transactionType', params.transactionType);
        if (params?.referenceType) queryParams.append('referenceType', params.referenceType);
        if (params?.page) queryParams.append('page', params.page);
        if (params?.limit) queryParams.append('limit', params.limit);
        return `/ledger?${queryParams.toString()}`;
      },
      providesTags: ['Ledger'],
    }),
    getProductLedger: builder.query({
      query: ({ productId, ...params }) => {
        const queryParams = new URLSearchParams();
        if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
        if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
        if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
        if (params?.locationId) queryParams.append('locationId', params.locationId);
        if (params?.transactionType) queryParams.append('transactionType', params.transactionType);
        if (params?.page) queryParams.append('page', params.page);
        if (params?.limit) queryParams.append('limit', params.limit);
        return `/ledger/${productId}?${queryParams.toString()}`;
      },
      providesTags: ['Ledger'],
    }),
    exportLedger: builder.query({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
        if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
        if (params?.productId) queryParams.append('productId', params.productId);
        if (params?.warehouseId) queryParams.append('warehouseId', params.warehouseId);
        if (params?.transactionType) queryParams.append('transactionType', params.transactionType);
        if (params?.format) queryParams.append('format', params.format);
        return `/ledger/export?${queryParams.toString()}`;
      },
      providesTags: ['Ledger'],
    }),
  }),
});

export const { useGetLedgerQuery, useGetProductLedgerQuery, useLazyExportLedgerQuery } = ledgerApi;
