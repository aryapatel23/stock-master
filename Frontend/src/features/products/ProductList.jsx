import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useGetProductsQuery } from '../../store/api/productsApi';
import { selectCurrentUser } from '../../store/slices/authSlice';

const ProductList = () => {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const { data, isLoading, isError, error } = useGetProductsQuery();

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

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
        Inactive
      </span>
    );
  };

  const LoadingSkeleton = () => (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg animate-pulse">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">Product Name</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">SKU</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Stock Quantity</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="relative py-3.5 pl-3 pr-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="whitespace-nowrap py-4 pl-6 pr-3">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </td>
                <td className="whitespace-nowrap py-4 pl-3 pr-6">
                  <div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div>
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
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No products</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new product.</p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate('/products/new')}
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Product
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
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading products</h3>
        <p className="mt-1 text-sm text-gray-500">{error?.data?.message || 'Failed to fetch products'}</p>
      </div>
    </div>
  );

  const products = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all products in the inventory</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            type="button"
            onClick={() => navigate('/products/new')}
            className="inline-flex items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {isLoading && <LoadingSkeleton />}
      {isError && <ErrorState />}
      {!isLoading && !isError && products.length === 0 && <EmptyState />}
      {!isLoading && !isError && products.length > 0 && (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
                    Product Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    SKU
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Stock Quantity
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {product.sku}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {product.category?.name || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {product.totalStock || 0}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {getStatusBadge(product.isActive)}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/products/${product._id}`)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/products/${product._id}/edit`)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
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

export default ProductList;
