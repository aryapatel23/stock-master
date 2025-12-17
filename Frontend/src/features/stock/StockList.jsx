import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useGetStockQuery } from '../../store/api/stockApi';
import { useGetProductsQuery } from '../../store/api/productsApi';
import { useGetWarehousesQuery } from '../../store/api/warehousesApi';
import { selectCurrentUser } from '../../store/slices/authSlice';

const StockList = () => {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [pollingEnabled, setPollingEnabled] = useState(true);

  const { data: products = [] } = useGetProductsQuery();
  const { data: warehouses = [] } = useGetWarehousesQuery();
  const { data: stockData = [], isLoading, isError, error, refetch } = useGetStockQuery({
    productId: productFilter || undefined,
    warehouseId: warehouseFilter || undefined,
  }, {
    // Enable/disable polling based on user preference
    pollingInterval: pollingEnabled ? 30000 : 0,
  });

  // Manager and Admin can access
  if (user?.role !== 'admin' && user?.role !== 'manager') {
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

  const productsList = Array.isArray(products) ? products : [];
  const warehousesList = Array.isArray(warehouses) ? warehouses : [];
  const stockList = Array.isArray(stockData) ? stockData : [];

  // Filter stock by search and status
  const filteredStock = stockList.filter(item => {
    // Search filter
    const matchesSearch = search === '' || 
      item.productName?.toLowerCase().includes(search.toLowerCase()) ||
      item.sku?.toLowerCase().includes(search.toLowerCase()) ||
      item.warehouseName?.toLowerCase().includes(search.toLowerCase());

    // Status filter
    let matchesStatus = true;
    if (stockStatusFilter === 'out-of-stock') {
      matchesStatus = item.qtyAvailable === 0;
    } else if (stockStatusFilter === 'low-stock') {
      matchesStatus = item.qtyAvailable > 0 && item.qtyAvailable <= 10;
    } else if (stockStatusFilter === 'in-stock') {
      matchesStatus = item.qtyAvailable > 10;
    }

    return matchesSearch && matchesStatus;
  });

  // Auto-refresh indicator
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    if (!isLoading) {
      setLastUpdate(new Date());
    }
  }, [stockData, isLoading]);

  const getStatusBadge = (available, reserved, onHand) => {
    if (available === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Out of Stock
        </span>
      );
    } else if (available <= 10) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Low Stock
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        In Stock
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
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Warehouse</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">On Hand</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Reserved</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Available</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
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
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </td>
                <td className="whitespace-nowrap px-3 py-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No stock data found</h3>
        <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or check back later.</p>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="bg-white shadow-md rounded-lg">
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading stock data</h3>
        <p className="mt-1 text-sm text-gray-500">{error?.data?.message || 'Failed to fetch stock'}</p>
        <button
          onClick={refetch}
          className="mt-4 text-sm text-blue-600 hover:text-blue-500"
        >
          Try again
        </button>
      </div>
    </div>
  );

  // Calculate summary stats
  const totalItems = filteredStock.length;
  const outOfStockItems = filteredStock.filter(item => item.qtyAvailable === 0).length;
  const lowStockItems = filteredStock.filter(item => item.qtyAvailable > 0 && item.qtyAvailable <= 10).length;
  const totalValue = filteredStock.reduce((sum, item) => sum + (item.qtyAvailable * (item.price || 0)), 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stock Levels</h1>
            <p className="text-gray-600 mt-1">Monitor inventory across all warehouses</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Real-time polling toggle */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-300">
              <div className={`w-2 h-2 rounded-full ${pollingEnabled && !isLoading ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-gray-600">
                {pollingEnabled ? 'Live' : 'Paused'}
              </span>
              <button
                onClick={() => setPollingEnabled(!pollingEnabled)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {pollingEnabled ? 'Pause' : 'Enable'}
              </button>
            </div>
            <button
              onClick={refetch}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
            >
              <svg className={`-ml-1 mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Last update time */}
        <p className="text-xs text-gray-500 mt-2">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow-md rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-gray-900">{outOfStockItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product or SKU..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <select
              id="product"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Products</option>
              {productsList.map((product) => (
                <option key={product.id || product._id} value={product.id || product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse
            </label>
            <select
              id="warehouse"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Warehouses</option>
              {warehousesList.map((warehouse) => (
                <option key={warehouse._id || warehouse.id} value={warehouse._id || warehouse.id}>
                  {warehouse.name}
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
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {filteredStock.length} item{filteredStock.length !== 1 ? 's' : ''} found
          </p>
          <button
            onClick={() => {
              setSearch('');
              setProductFilter('');
              setWarehouseFilter('');
              setStockStatusFilter('all');
            }}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Stock Table */}
      {isLoading && <LoadingSkeleton />}
      {isError && <ErrorState />}
      {!isLoading && !isError && filteredStock.length === 0 && <EmptyState />}
      {!isLoading && !isError && filteredStock.length > 0 && (
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
                    Warehouse
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    On Hand
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Reserved
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Available
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
                {filteredStock.map((item, index) => (
                  <tr key={`${item.productId}-${item.warehouseId}-${index}`} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <div className="text-sm text-gray-500">{item.uom}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-900">
                        {item.sku}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {item.warehouseName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className="font-medium text-gray-900">
                        {item.qtyOnHand || 0}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`font-medium ${item.qtyReserved > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                        {item.qtyReserved || 0}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`font-bold ${
                        item.qtyAvailable === 0 ? 'text-red-600' : 
                        item.qtyAvailable <= 10 ? 'text-yellow-600' : 
                        'text-green-600'
                      }`}>
                        {item.qtyAvailable || 0}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {getStatusBadge(item.qtyAvailable, item.qtyReserved, item.qtyOnHand)}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/products/${item.productId}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
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

export default StockList;
