import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetDeliveryOrdersQuery } from '../../store/api/deliveryOrdersApi';
import { selectCurrentUser } from '../../store/slices/authSlice';

const DeliveryOrderList = () => {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const { data, isLoading, isError, error } = useGetDeliveryOrdersQuery();

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Unauthorized Access</h3>
          <p className="mt-1 text-sm text-gray-500">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || '';
    
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      picking: 'bg-yellow-100 text-yellow-800',
      packed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[statusLower] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const LoadingSkeleton = () => (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg animate-pulse">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">Order ID</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Customer Name</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Order Date</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Items Count</th>
              <th className="relative py-3.5 pl-3 pr-6 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="whitespace-nowrap py-4 pl-6 pr-3">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="h-4 bg-gray-200 rounded w-28"></div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </td>
                <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right">
                  <div className="h-4 bg-gray-200 rounded w-12 ml-auto"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No delivery orders</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new delivery order.</p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate('/delivery-orders/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Create Order
          </button>
        </div>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading delivery orders</h3>
        <p className="mt-1 text-sm text-gray-500">{error?.data?.message || 'Failed to fetch delivery orders'}</p>
      </div>
    </div>
  );

  const deliveryOrders = data?.data || [];

  const getOrderNumber = (order) => {
    return order.orderNumber || order.deliveryNumber || order.code || `#${order._id?.slice(-6).toUpperCase()}`;
  };

  const getCustomerName = (order) => {
    if (order.customerName) return order.customerName;
    if (order.customer?.name) return order.customer.name;
    if (order.customerId?.name) return order.customerId.name;
    return 'N/A';
  };

  const getItemsCount = (order) => {
    if (order.itemsCount) return order.itemsCount;
    if (order.lines?.length) return order.lines.length;
    if (order.items?.length) return order.items.length;
    return 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Manage outgoing deliveries</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/delivery-orders/new')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create Order
        </button>
      </div>

      {isLoading && <LoadingSkeleton />}
      {isError && <ErrorState />}
      {!isLoading && !isError && deliveryOrders.length === 0 && <EmptyState />}
      {!isLoading && !isError && deliveryOrders.length > 0 && (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
                    Order ID
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Customer Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Order Date
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Items Count
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {deliveryOrders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                      <div className="font-medium text-gray-900">{getOrderNumber(order)}</div>
                      {order.referenceNumber && (
                        <div className="text-xs text-gray-500">Ref: {order.referenceNumber}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {getCustomerName(order)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {formatDate(order.orderDate || order.deliveryDate || order.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {getItemsCount(order)}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/delivery-orders/${order._id}`)}
                        className="text-primary-600 hover:text-primary-900 transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryOrderList;
