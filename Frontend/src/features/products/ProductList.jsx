import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useGetProductsQuery, useDeleteProductMutation } from '../../store/api/productsApi';
import { useGetCategoriesQuery } from '../../store/api/categoriesApi';
import { selectCurrentUser } from '../../store/slices/authSlice';

const ProductList = () => {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const { data: products = [], isLoading, isError, error, refetch } = useGetProductsQuery({ 
    q: search,
    category: categoryFilter,
  });
  const { data: categories = [] } = useGetCategoriesQuery();
  const [deleteProduct] = useDeleteProductMutation();

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteProduct(id).unwrap();
        alert('Product deleted successfully');
      } catch (err) {
        alert(err?.data?.message || 'Failed to delete product');
      }
    }
  };

  // Filter products by status
  const filteredProducts = Array.isArray(products) 
    ? products.filter(product => {
        if (statusFilter === 'active') return product.isActive;
        if (statusFilter === 'inactive') return !product.isActive;
        return true;
      })
    : [];

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
    <div className="bg-white shadow-md rounded-lg animate-pulse">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">Product</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">SKU</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Category</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Stock</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Price</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="relative py-3.5 pl-3 pr-6">Actions</th>
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
    <div className="bg-white shadow-md rounded-lg">
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No products found</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new product.</p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate('/products/new')}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
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
    <div className="bg-white shadow-md rounded-lg">
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading products</h3>
        <p className="mt-1 text-sm text-gray-500">{error?.data?.message || 'Failed to fetch products'}</p>
        <button
          onClick={refetch}
          className="mt-4 text-sm text-blue-600 hover:text-blue-500"
        >
          Try again
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-600 mt-1">Manage your product catalog</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Products
            </label>
            <input
              type="text"
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, or description..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
          </p>
          <button
            onClick={() => navigate('/products/new')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading && <LoadingSkeleton />}
      {isError && <ErrorState />}
      {!isLoading && !isError && filteredProducts.length === 0 && <EmptyState />}
      {!isLoading && !isError && filteredProducts.length > 0 && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
                    Product
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    SKU
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Stock
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Price
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
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3">
                      <div className="flex items-center">
                        <div>
                          <div className="font-medium text-gray-900">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {product.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {product.sku}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {product.categoryName || '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`font-medium ${
                        product.totalOnHand <= product.reorderLevel 
                          ? 'text-red-600' 
                          : 'text-gray-900'
                      }`}>
                        {product.totalOnHand || 0} {product.uom}
                      </span>
                      {product.totalOnHand <= product.reorderLevel && (
                        <div className="text-xs text-red-600">Low stock</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      ${product.price ? product.price.toFixed(2) : '0.00'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {product.isActive ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/products/${product.id}`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/products/${product.id}/edit`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
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
