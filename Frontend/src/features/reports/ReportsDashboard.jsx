import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/slices/authSlice';
import {
  useGetStockAgeingQuery,
  useGetInventoryTurnoverQuery,
  useGetSlowMovingItemsQuery,
  useGetStockValueQuery,
} from '../../store/api/reportsApi';
import { useGetWarehousesQuery } from '../../store/api/warehousesApi';
import { useGetProductsQuery } from '../../store/api/productsApi';
import {
  AlertTriangle,
  FileText,
  TrendingDown,
  Clock,
  BarChart3,
  Download,
  RefreshCw,
  Package,
  AlertCircle,
  DollarSign,
} from 'lucide-react';

const ReportsDashboard = () => {
  const user = useSelector(selectCurrentUser);
  const [activeReport, setActiveReport] = useState('stock-ageing');
  const [ageingFilters, setAgeingFilters] = useState({
    warehouseId: '',
    daysBucket: '30,60,90',
  });
  const [turnoverFilters, setTurnoverFilters] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    warehouseId: '',
    productId: '',
  });
  const [slowMovingFilters, setSlowMovingFilters] = useState({
    warehouseId: '',
    days: 90,
    minQty: 0,
  });
  const [stockValueFilters, setStockValueFilters] = useState({
    warehouseId: '',
  });

  const { data: warehousesData } = useGetWarehousesQuery();
  const { data: productsData } = useGetProductsQuery();

  const warehouses = warehousesData?.data || [];
  const products = productsData?.data || [];

  const {
    data: ageingData,
    isLoading: ageingLoading,
    error: ageingError,
    refetch: refetchAgeing,
  } = useGetStockAgeingQuery(ageingFilters, {
    skip: activeReport !== 'stock-ageing',
  });

  const {
    data: turnoverData,
    isLoading: turnoverLoading,
    error: turnoverError,
    refetch: refetchTurnover,
  } = useGetInventoryTurnoverQuery(turnoverFilters, {
    skip: activeReport !== 'turnover',
  });

  const {
    data: slowMovingData,
    isLoading: slowMovingLoading,
    error: slowMovingError,
    refetch: refetchSlowMoving,
  } = useGetSlowMovingItemsQuery(slowMovingFilters, {
    skip: activeReport !== 'slow-moving',
  });

  const {
    data: stockValueData,
    isLoading: stockValueLoading,
    error: stockValueError,
    refetch: refetchStockValue,
  } = useGetStockValueQuery(stockValueFilters, {
    skip: activeReport !== 'stock-value',
  });

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Unauthorized Access</h3>
          <p className="mt-1 text-sm text-gray-500">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const handleExportCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getAgeBucketColor = (bucket) => {
    if (bucket.includes('0-30')) return 'bg-green-100 text-green-800';
    if (bucket.includes('30-60') || bucket.includes('31-60')) return 'bg-yellow-100 text-yellow-800';
    if (bucket.includes('60-90') || bucket.includes('61-90')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusColor = (status) => {
    if (status === 'fast_moving') return 'bg-green-100 text-green-800';
    if (status === 'normal') return 'bg-blue-100 text-blue-800';
    return 'bg-red-100 text-red-800';
  };

  const formatStatus = (status) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const renderStockAgeingReport = () => {
    const isLoading = ageingLoading;
    const error = ageingError;
    const data = ageingData?.report || [];
    const summary = ageingData?.summary || {};

    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => refetchAgeing()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => handleExportCSV(data, 'stock-ageing-report')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Warehouse</label>
                <select
                  value={ageingFilters.warehouseId}
                  onChange={(e) => setAgeingFilters({ ...ageingFilters, warehouseId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Age Buckets (days)</label>
                <input
                  type="text"
                  value={ageingFilters.daysBucket}
                  onChange={(e) => setAgeingFilters({ ...ageingFilters, daysBucket: e.target.value })}
                  placeholder="30,60,90"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {Object.keys(summary).length > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(summary).map(([bucket, stats]) => (
              <div key={bucket} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">{bucket} days</dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">{stats.count}</div>
                          <div className="ml-2 text-sm text-gray-500">products</div>
                        </dd>
                        <dd className="text-sm text-gray-500">Qty: {stats.totalQty}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading report...</p>
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Report</h3>
              <p className="mt-1 text-sm text-gray-500">{error?.data?.message || 'Failed to load report'}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No Data</h3>
              <p className="mt-1 text-sm text-gray-500">No stock ageing data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age (Days)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age Bucket</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.productName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.sku}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.warehouseName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.totalQty}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.ageInDays}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAgeBucketColor(item.ageBucket)}`}>
                          {item.ageBucket}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTurnoverReport = () => {
    const isLoading = turnoverLoading;
    const error = turnoverError;
    const data = turnoverData?.report || [];
    const summary = turnoverData?.summary || {};
    const period = turnoverData?.period || {};

    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => refetchTurnover()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => handleExportCSV(data, 'turnover-report')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">From Date</label>
                <input
                  type="date"
                  value={turnoverFilters.from}
                  onChange={(e) => setTurnoverFilters({ ...turnoverFilters, from: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">To Date</label>
                <input
                  type="date"
                  value={turnoverFilters.to}
                  onChange={(e) => setTurnoverFilters({ ...turnoverFilters, to: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Warehouse</label>
                <select
                  value={turnoverFilters.warehouseId}
                  onChange={(e) => setTurnoverFilters({ ...turnoverFilters, warehouseId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Product</label>
                <select
                  value={turnoverFilters.productId}
                  onChange={(e) => setTurnoverFilters({ ...turnoverFilters, productId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">All Products</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {summary.totalProducts > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Avg Turnover</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{summary.avgTurnoverRatio}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingDown className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Fast Moving</dt>
                      <dd className="text-2xl font-semibold text-green-600">{summary.fastMoving}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Normal</dt>
                      <dd className="text-2xl font-semibold text-blue-600">{summary.normal}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Slow Moving</dt>
                      <dd className="text-2xl font-semibold text-red-600">{summary.slowMoving}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading report...</p>
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Report</h3>
              <p className="mt-1 text-sm text-gray-500">{error?.data?.message || 'Failed to load report'}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No Data</h3>
              <p className="mt-1 text-sm text-gray-500">No turnover data available for the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sold</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">COGS</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Inv Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Turnover Ratio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days in Inv</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.productName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.sku}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.totalSold}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">${item.cogs}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">${item.avgInventoryValue}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{item.turnoverRatio}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.daysInInventory}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                          {formatStatus(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSlowMovingReport = () => {
    const isLoading = slowMovingLoading;
    const error = slowMovingError;
    const data = slowMovingData?.report || [];
    const summary = slowMovingData?.summary || {};

    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => refetchSlowMoving()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => handleExportCSV(data, 'slow-moving-report')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Warehouse</label>
                <select
                  value={slowMovingFilters.warehouseId}
                  onChange={(e) => setSlowMovingFilters({ ...slowMovingFilters, warehouseId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Days Threshold</label>
                <input
                  type="number"
                  value={slowMovingFilters.days}
                  onChange={(e) => setSlowMovingFilters({ ...slowMovingFilters, days: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Min Quantity</label>
                <input
                  type="number"
                  value={slowMovingFilters.minQty}
                  onChange={(e) => setSlowMovingFilters({ ...slowMovingFilters, minQty: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {summary.totalProducts > 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Products</dt>
                      <dd className="text-2xl font-semibold text-gray-900">{summary.totalProducts}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-6 w-6 text-orange-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Quantity</dt>
                      <dd className="text-2xl font-semibold text-orange-600">{summary.totalQty}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingDown className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Dead Stock</dt>
                      <dd className="text-2xl font-semibold text-red-600">{summary.deadStock || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                      <dd className="text-2xl font-semibold text-green-600">${summary.totalValue}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading report...</p>
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Report</h3>
              <p className="mt-1 text-sm text-gray-500">{error?.data?.message || 'Failed to load report'}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No Data</h3>
              <p className="mt-1 text-sm text-gray-500">No slow-moving items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Locations</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Movement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Idle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.productName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.sku}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.category || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{item.currentQty}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{item.locations}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {item.lastMovementDate ? new Date(item.lastMovementDate).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.daysSinceLastMovement > 180 ? 'bg-red-100 text-red-800' : 
                          item.daysSinceLastMovement > 90 ? 'bg-orange-100 text-orange-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.daysSinceLastMovement || 'N/A'} {item.daysSinceLastMovement ? 'days' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">${item.totalValue}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === 'dead_stock' ? 'bg-red-100 text-red-800' : 
                          item.status === 'no_movement' ? 'bg-gray-100 text-gray-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {formatStatus(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStockValueReport = () => {
    const isLoading = stockValueLoading;
    const error = stockValueError;
    const data = stockValueData?.stock || [];
    const summary = stockValueData?.summary || {};

    const totalValue = data.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    const totalQty = data.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => refetchStockValue()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
              <button
                onClick={() => handleExportCSV(data, 'stock-value-report')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-1">
              <div>
                <label className="block text-sm font-medium text-gray-700">Warehouse</label>
                <select
                  value={stockValueFilters.warehouseId}
                  onChange={(e) => setStockValueFilters({ ...stockValueFilters, warehouseId: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((w) => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Stock Value</dt>
                    <dd className="text-2xl font-semibold text-green-600">${totalValue.toFixed(2)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Quantity</dt>
                    <dd className="text-2xl font-semibold text-blue-600">{totalQty}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Unique Products</dt>
                    <dd className="text-2xl font-semibold text-purple-600">{data.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading report...</p>
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Report</h3>
              <p className="mt-1 text-sm text-gray-500">{error?.data?.message || 'Failed to load report'}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No Data</h3>
              <p className="mt-1 text-sm text-gray-500">No stock data available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% of Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item, idx) => {
                    const percentOfTotal = totalValue > 0 ? ((item.totalValue / totalValue) * 100).toFixed(2) : 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.productId?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.productId?.sku || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.warehouseId?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.locationId?.code || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">${item.productId?.costPrice?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">${item.totalValue?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{percentOfTotal}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">Total:</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{totalQty}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">-</td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">${totalValue.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Reports</h1>
          <p className="mt-2 text-sm text-gray-600">Analyze inventory performance and trends</p>
        </div>

        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveReport('stock-ageing')}
                className={`${
                  activeReport === 'stock-ageing'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Clock className="h-5 w-5 mr-2" />
                Stock Ageing
              </button>
              <button
                onClick={() => setActiveReport('turnover')}
                className={`${
                  activeReport === 'turnover'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <BarChart3 className="h-5 w-5 mr-2" />
                Inventory Turnover
              </button>
              <button
                onClick={() => setActiveReport('slow-moving')}
                className={`${
                  activeReport === 'slow-moving'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <TrendingDown className="h-5 w-5 mr-2" />
                Slow Moving Items
              </button>
              <button
                onClick={() => setActiveReport('stock-value')}
                className={`${
                  activeReport === 'stock-value'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Stock Value
              </button>
            </nav>
          </div>
        </div>

        {activeReport === 'stock-ageing' && renderStockAgeingReport()}
        {activeReport === 'turnover' && renderTurnoverReport()}
        {activeReport === 'slow-moving' && renderSlowMovingReport()}
        {activeReport === 'stock-value' && renderStockValueReport()}
      </div>
    </div>
  );
};

export default ReportsDashboard;

