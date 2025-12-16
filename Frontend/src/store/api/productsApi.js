import { apiSlice } from '../apiSlice';

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query({
      query: (params = {}) => ({
        url: '/products',
        params: { limit: 100, ...params },
      }),
      transformResponse: (response) => {
        const products = response.data || response;
        // Transform products to ensure consistent id field
        return Array.isArray(products) 
          ? products.map(p => ({
              ...p,
              id: p._id || p.id,
              categoryName: p.category?.name || p.categoryName,
              reorderLevel: p.reorderPoint || p.reorderLevel || 0,
            }))
          : [];
      },
      providesTags: ['Products'],
    }),
    getProduct: builder.query({
      query: (id) => `/products/${id}`,
      transformResponse: (response) => {
        const product = response.data || response.product || response;
        return {
          ...product,
          id: product._id || product.id,
          categoryId: product.category?._id || product.categoryId,
          reorderLevel: product.reorderPoint || product.reorderLevel || 0,
        };
      },
      providesTags: (result, error, id) => [{ type: 'Products', id }],
    }),
    createProduct: builder.mutation({
      query: (product) => ({
        url: '/products',
        method: 'POST',
        body: product,
      }),
      invalidatesTags: ['Products'],
    }),
    updateProduct: builder.mutation({
      query: ({ id, ...product }) => ({
        url: `/products/${id}`,
        method: 'PUT',
        body: product,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Products', id }, 'Products'],
    }),
    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products'],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi;
