import { apiSlice } from '../apiSlice';

export const settingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query({
      query: () => '/settings',
      transformResponse: (response) => response.settings || response,
      providesTags: ['Setting'],
    }),
    updateSettings: builder.mutation({
      query: (settings) => ({
        url: '/settings',
        method: 'PUT',
        body: settings,
      }),
      invalidatesTags: ['Setting'],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} = settingsApi;
