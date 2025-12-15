import { apiSlice } from '../apiSlice';

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: (params = {}) => ({
        url: '/users',
        params: {
          limit: 100,
          ...params,
        },
      }),
      transformResponse: (response) => {
        console.log('Users API Response:', response);
        return response.users || response;
      },
      providesTags: ['Users'],
    }),
    createUser: builder.mutation({
      query: (user) => ({
        url: '/users',
        method: 'POST',
        body: user,
      }),
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...user }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: user,
      }),
      invalidatesTags: ['Users'],
    }),
    updateUserStatus: builder.mutation({
      query: (id) => ({
        url: `/users/${id}/status`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Users'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useUpdateUserStatusMutation,
} = usersApi;
