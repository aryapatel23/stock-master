import { apiSlice } from '../apiSlice';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/signup',
        method: 'POST',
        body: userData,
      }),
    }),
    getMe: builder.query({
      query: () => '/users/me',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({
        url: '/users/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    changePassword: builder.mutation({
      query: (data) => ({
        url: '/users/change-password',
        method: 'PUT',
        body: data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = authApi;
