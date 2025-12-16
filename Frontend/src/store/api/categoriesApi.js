import { apiSlice } from '../apiSlice';

export const categoriesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query({
      query: (params = {}) => ({
        url: '/categories',
        params: { limit: 100, ...params },
      }),
      transformResponse: (response) => response.categories || response,
      providesTags: ['Categories'],
    }),
    getCategory: builder.query({
      query: (id) => `/categories/${id}`,
      transformResponse: (response) => response.category || response,
      providesTags: (result, error, id) => [{ type: 'Categories', id }],
    }),
    createCategory: builder.mutation({
      query: (category) => ({
        url: '/categories',
        method: 'POST',
        body: category,
      }),
      invalidatesTags: ['Categories'],
    }),
    updateCategory: builder.mutation({
      query: ({ id, ...category }) => ({
        url: `/categories/${id}`,
        method: 'PUT',
        body: category,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Categories', id }, 'Categories'],
    }),
    deleteCategory: builder.mutation({
      query: (id) => ({
        url: `/categories/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Categories'],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
