import { apiSlice } from '../apiSlice';

export const deliveryOrdersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDeliveryOrders: builder.query({
      query: (params) => ({
        url: '/delivery-orders',
        params,
      }),
      providesTags: ['DeliveryOrders'],
    }),
    getDeliveryOrder: builder.query({
      query: (id) => `/delivery-orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'DeliveryOrders', id }],
    }),
    createDeliveryOrder: builder.mutation({
      query: (data) => ({
        url: '/delivery-orders',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['DeliveryOrders'],
    }),
    updateDeliveryOrder: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/delivery-orders/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'DeliveryOrders', id }, 'DeliveryOrders'],
    }),
    pickItems: builder.mutation({
      query: ({ id, pickedLines }) => ({
        url: `/delivery-orders/${id}/pick`,
        method: 'POST',
        body: { pickedLines },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'DeliveryOrders', id }, 'DeliveryOrders'],
    }),
    packItems: builder.mutation({
      query: ({ id, packages }) => ({
        url: `/delivery-orders/${id}/pack`,
        method: 'POST',
        body: { packages },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'DeliveryOrders', id }, 'DeliveryOrders'],
    }),
    validateDeliveryOrder: builder.mutation({
      query: ({ id, idempotencyKey }) => ({
        url: `/delivery-orders/${id}/validate`,
        method: 'POST',
        body: { idempotencyKey },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'DeliveryOrders', id }, 'DeliveryOrders'],
    }),
    cancelDeliveryOrder: builder.mutation({
      query: ({ id, notes }) => ({
        url: `/delivery-orders/${id}/cancel`,
        method: 'POST',
        body: { notes },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'DeliveryOrders', id }, 'DeliveryOrders'],
    }),
  }),
});

export const {
  useGetDeliveryOrdersQuery,
  useGetDeliveryOrderQuery,
  useCreateDeliveryOrderMutation,
  useUpdateDeliveryOrderMutation,
  usePickItemsMutation,
  usePackItemsMutation,
  useValidateDeliveryOrderMutation,
  useCancelDeliveryOrderMutation,
} = deliveryOrdersApi;
