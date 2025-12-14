import { apiSlice } from '../apiSlice';

export const locationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWarehouseLocations: builder.query({
      query: (warehouseId) => `/warehouses/${warehouseId}/locations`,
      providesTags: (result, error, warehouseId) => [{ type: 'Locations', id: warehouseId }],
    }),
  }),
});

export const {
  useGetWarehouseLocationsQuery,
} = locationsApi;
