import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetReceiptsQuery } from '../../store/api/receiptsApi';
import { useGetWarehousesQuery } from '../../store/api/warehousesApi';
import { selectCurrentUser } from '../../store/slices/authSlice';

const ReceiptList = () => {
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const [activeStatus, setActiveStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  const { data: warehousesData } = useGetWarehousesQuery();
  const { data, isLoading, isError, error, refetch } = useGetReceiptsQuery({
    status: activeStatus || undefined,
    warehouseId: warehouseFilter || undefined,
    page: currentPage,
    limit: 20,
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

  const statusTabs = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'draft' },
    { label: 'Waiting', value: 'waiting' },
    { label: 'Ready', value: 'ready' },
    { label: 'Done', value: 'done' },
    { label: 'Cancelled', value: 'canceled' },
  ];

  const handleStatusChange = (status) => {
    setActiveStatus(status);
    setCurrentPage(1);
  };

  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || '';
    
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      waiting: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-blue-100 text-blue-800',
      done: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[statusLower] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const LoadingSkeleton = () => (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg animate-pulse">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">Receipt ID</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Supplier Name</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Receipt Date</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Items</th>
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No receipts</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new receipt.</p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate('/receipts/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Create Receipt
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
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading receipts</h3>
        <p className="mt-1 text-sm text-gray-500">{error?.data?.message || 'Failed to fetch receipts'}</p>
      </div>
    </div>
  );

  const receipts = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, totalPages: 1 };
  const warehouses = warehousesData?.data || [];

  // Client-side search filter
  const filteredReceipts = receipts.filter(receipt => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      receipt.receiptNumber?.toLowerCase().includes(searchLower) ||
      receipt.referenceNumber?.toLowerCase().includes(searchLower) ||
      receipt.supplierName?.toLowerCase().includes(searchLower) ||
      receipt.supplier?.name?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalItems = (receipt) => {
    if (receipt.totalItems) return receipt.totalItems;
    if (receipt.lines?.length) return receipt.lines.length;
    return 0;
  };

  const getReceiptNumber = (receipt) => {
    return receipt.receiptNumber || receipt.code || `#${receipt._id?.slice(-6).toUpperCase()}`;
  };

  const getSupplierName = (receipt) => {
    if (receipt.supplierName) return receipt.supplierName;
    if (receipt.supplier?.name) return receipt.supplier.name;
    if (receipt.supplierId?.name) return receipt.supplierId.name;
    return 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
          <p className="mt-1 text-sm text-gray-500">Track incoming inventory receipts</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/receipts/new')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create Receipt
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt #, reference, or supplier..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse
            </label>
            <select
              id="warehouse"
              value={warehouseFilter}
              onChange={(e) => {
                setWarehouseFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse._id || warehouse.id} value={warehouse._id || warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {filteredReceipts.length} receipt{filteredReceipts.length !== 1 ? 's' : ''} found
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSearch('');
                setWarehouseFilter('');
                setActiveStatus('');
                setCurrentPage(1);
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear Filters
            </button>
            <button
              onClick={refetch}
              className="inline-flex items-center px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={`${
                activeStatus === tab.value
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {isLoading && <LoadingSkeleton />}
      {isError && <ErrorState />}
      {!isLoading && !isError && filteredReceipts.length === 0 && <EmptyState />}
      {!isLoading && !isError && filteredReceipts.length > 0 && (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
                    Receipt ID
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Supplier Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Warehouse
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Receipt Date
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Total Items
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-6 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt._id} className="hover:bg-gray-50 transition-colors">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                      <div className="font-medium text-gray-900">{getReceiptNumber(receipt)}</div>
                      {receipt.referenceNumber && (
                        <div className="text-xs text-gray-500">Ref: {receipt.referenceNumber}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {getSupplierName(receipt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {receipt.warehouseId?.name || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {formatDate(receipt.expectedDate || receipt.receiptDate || receipt.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {getStatusBadge(receipt.status)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <span>{getTotalItems(receipt)}</span>
                        {receipt.lines && receipt.lines.length > 0 && (
                          <span className="ml-2 text-xs text-gray-400">
                            ({receipt.lines.reduce((sum, line) => sum + (line.expectedQty || 0), 0)} qty)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                      <button
                        onClick={() => navigate(`/receipts/${receipt._id}`)}
                        className="text-primary-600 hover:text-primary-900 transition-colors"
                      >

      {!isLoading && !isError && receipts.length > 0 && meta.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow-sm ring-1 ring-gray-900/5">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(meta.totalPages, prev + 1))}
              disabled={currentPage === meta.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * 20, meta.total)}</span> of{' '}
                <span className="font-medium">{meta.total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                {[...Array(Math.min(5, meta.totalPages))].map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(meta.totalPages, prev + 1))}
                  disabled={currentPage === meta.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
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

export default ReceiptList;
