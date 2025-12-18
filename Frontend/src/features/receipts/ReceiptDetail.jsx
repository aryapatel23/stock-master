import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetReceiptQuery, useUpdateReceiptMutation, useValidateReceiptMutation, useCancelReceiptMutation, useUpdateReceivedQtyMutation } from '../../store/api/receiptsApi';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { useState } from 'react';

const ReceiptDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useSelector(selectCurrentUser);
  const { data, isLoading, isError, error } = useGetReceiptQuery(id);
  const [updateReceipt, { isLoading: isUpdating }] = useUpdateReceiptMutation();
  const [validateReceipt, { isLoading: isValidating }] = useValidateReceiptMutation();
  const [cancelReceipt, { isLoading: isCanceling }] = useCancelReceiptMutation();
  const [updateReceivedQty] = useUpdateReceivedQtyMutation();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelNotes, setCancelNotes] = useState('');
  const [editingQty, setEditingQty] = useState({});

  // Manager and Admin can access
  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Unauthorized Access</h3>
          <p className="mt-1 text-sm text-gray-500">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const handleStatusUpdate = async (newStatus) => {
    try {
      await updateReceipt({ id, status: newStatus }).unwrap();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(error?.data?.message || 'Failed to update status');
    }
  };

  const handleValidate = async () => {
    try {
      await validateReceipt({ id, idempotencyKey: `receipt-${id}-${Date.now()}` }).unwrap();
      alert('Receipt validated successfully and stock updated');
    } catch (error) {
      console.error('Failed to validate receipt:', error);
      alert(error?.data?.message || 'Failed to validate receipt');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelReceipt({ id, notes: cancelNotes }).unwrap();
      setShowCancelModal(false);
      setCancelNotes('');
      alert('Receipt canceled successfully');
    } catch (error) {
      console.error('Failed to cancel receipt:', error);
      alert(error?.data?.message || 'Failed to cancel receipt');
    }
  };

  const handleUpdateQty = async (lineId, receivedQty) => {
    try {
      await updateReceivedQty({ id, lines: [{ lineId, receivedQty }] }).unwrap();
      setEditingQty({});
    } catch (error) {
      console.error('Failed to update quantity:', error);
      alert(error?.data?.message || 'Failed to update quantity');
    }
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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[statusLower] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading receipt</h3>
          <p className="mt-1 text-sm text-gray-500">{error?.data?.message || 'Receipt not found'}</p>
          <button
            onClick={() => navigate('/receipts')}
            className="mt-4 text-sm text-primary-600 hover:text-primary-500"
          >
            Back to Receipts
          </button>
        </div>
      </div>
    );
  }

  const receipt = data?.data || data?.receipt || {};
  const receiptNumber = receipt.receiptNumber || receipt.code || `#${receipt._id?.slice(-6).toUpperCase()}`;
  const supplierName = receipt.supplierName || receipt.supplier?.name || receipt.supplierId?.name || 'N/A';
  const warehouseName = receipt.warehouseId?.name || receipt.warehouse?.name || 'N/A';
  const lines = receipt.lines || [];
  const canEdit = receipt.status === 'draft' || receipt.status === 'waiting';
  const canValidate = receipt.status === 'ready' || receipt.status === 'waiting';
  const canCancel = receipt.status !== 'done' && receipt.status !== 'canceled';

  const totalExpectedQty = lines.reduce((sum, line) => sum + (line.expectedQty || 0), 0);
  const totalReceivedQty = lines.reduce((sum, line) => sum + (line.receivedQty || 0), 0);
  const totalValue = lines.reduce((sum, line) => {
    const qty = line.expectedQty || 0;
    const price = line.unitPrice || 0;
    return sum + (qty * price);
  }, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/receipts')}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receipt {receiptNumber}</h1>
            <p className="mt-1 text-sm text-gray-500">View and manage receipt details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={() => navigate(`/receipts/${id}/edit`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          )}
          {canValidate && (
            <button
              onClick={handleValidate}
              disabled={isUpdating}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Validate
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              <svg className="-ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel Receipt
            </button>
          )}
        </div>
      </div>

      {/* Status and Info Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Status</dt>
                  <dd className="mt-1">{getStatusBadge(receipt.status)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">{lines.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Quantity</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">{totalExpectedQty}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">${totalValue.toFixed(2)}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Details */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Receipt Information</h2>
        </div>
        <div className="px-6 py-5">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Receipt Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{receiptNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Supplier Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{supplierName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Warehouse</dt>
              <dd className="mt-1 text-sm text-gray-900">{warehouseName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Expected Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateShort(receipt.expectedDate)}</dd>
            </div>
            {receipt.referenceNumber && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Reference Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{receipt.referenceNumber}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Created By</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {receipt.createdBy?.name || receipt.createdBy?.email || 'N/A'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(receipt.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(receipt.updatedAt)}</dd>
            </div>
            {receipt.notes && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{receipt.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Line Items</h2>
        </div>
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
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  Expected Qty
                </th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  Received Qty
                </th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  Unit Price
                </th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                  Total
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-6">
                  <span className="sr-only">Notes</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {lines.map((line, index) => {
                const productName = line.productId?.name || line.product?.name || 'N/A';
                const sku = line.sku || line.productId?.sku || line.product?.sku || 'N/A';
                const expectedQty = line.expectedQty || 0;
                const receivedQty = line.receivedQty || 0;
                const unitPrice = line.unitPrice || 0;
                const lineTotal = expectedQty * unitPrice;

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-medium text-gray-900">
                      {productName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {sku}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
                      {expectedQty}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                      <span className={receivedQty === expectedQty ? 'text-green-600 font-medium' : 'text-gray-500'}>
                        {receivedQty}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right">
                      ${unitPrice.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900 text-right">
                      ${lineTotal.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-6 text-sm text-gray-500">
                      {line.notes && (
                        <span className="text-xs" title={line.notes}>
                          📝
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-sm text-gray-500">
                    No line items found
                  </td>
                </tr>
              )}
            </tbody>
            {lines.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan="2" className="py-3.5 pl-6 pr-3 text-sm font-semibold text-gray-900">
                    Total
                  </td>
                  <td className="px-3 py-3.5 text-sm font-semibold text-gray-900 text-right">
                    {totalExpectedQty}
                  </td>
                  <td className="px-3 py-3.5 text-sm font-semibold text-gray-900 text-right">
                    {totalReceivedQty}
                  </td>
                  <td className="px-3 py-3.5"></td>
                  <td className="px-3 py-3.5 text-sm font-semibold text-gray-900 text-right">
                    ${totalValue.toFixed(2)}
                  </td>
                  <td className="py-3.5 pl-3 pr-6"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCancelModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Cancel Receipt</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to cancel this receipt? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isUpdating ? 'Cancelling...' : 'Cancel Receipt'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Nevermind
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptDetail;
