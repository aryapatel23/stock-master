import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useCreateReceiptMutation, useGetReceiptQuery, useUpdateReceiptMutation } from '../../store/api/receiptsApi';
import { useGetProductsQuery } from '../../store/api/productsApi';
import { useGetWarehousesQuery } from '../../store/api/warehousesApi';
import { selectCurrentUser } from '../../store/slices/authSlice';

const ReceiptForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useSelector(selectCurrentUser);
  const isEditMode = Boolean(id);

  const { data: receiptData, isLoading: isLoadingReceipt } = useGetReceiptQuery(id, { skip: !id });
  const { data: productsData, isLoading: isLoadingProducts } = useGetProductsQuery();
  const { data: warehousesData, isLoading: isLoadingWarehouses } = useGetWarehousesQuery();
  const [createReceipt, { isLoading: isCreating }] = useCreateReceiptMutation();
  const [updateReceipt, { isLoading: isUpdating }] = useUpdateReceiptMutation();

  const [formData, setFormData] = useState({
    supplierName: '',
    expectedDate: '',
    warehouseId: '',
    referenceNumber: '',
    notes: '',
    lines: [{ productId: '', expectedQty: '', uom: 'unit', unitPrice: '', notes: '' }],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode && receiptData?.data) {
      const receipt = receiptData.data;
      setFormData({
        supplierName: receipt.supplierName || '',
        expectedDate: receipt.expectedDate ? receipt.expectedDate.split('T')[0] : '',
        warehouseId: receipt.warehouseId?._id || receipt.warehouseId || '',
        referenceNumber: receipt.referenceNumber || '',
        notes: receipt.notes || '',
        lines: receipt.lines?.length > 0 ? receipt.lines.map(line => ({
          productId: line.productId?._id || line.productId || '',
          expectedQty: line.expectedQty || '',
          uom: line.uom || 'unit',
          unitPrice: line.unitPrice || '',
          notes: line.notes || '',
        })) : [{ productId: '', expectedQty: '', uom: 'unit', unitPrice: '', notes: '' }],
      });
    }
  }, [isEditMode, receiptData]);

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

  // APIs already return arrays via transformResponse
  const products = Array.isArray(productsData) ? productsData : [];
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];

  console.log('Products:', products);
  console.log('Warehouses:', warehouses);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index][field] = value;
    setFormData(prev => ({ ...prev, lines: newLines }));
    if (errors[`lines.${index}.${field}`]) {
      setErrors(prev => ({ ...prev, [`lines.${index}.${field}`]: '' }));
    }
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { productId: '', expectedQty: '', uom: 'unit', unitPrice: '', notes: '' }],
    }));
  };

  const removeLine = (index) => {
    if (formData.lines.length > 1) {
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.filter((_, i) => i !== index),
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.supplierName.trim()) {
      newErrors.supplierName = 'Supplier name is required';
    }

    if (!formData.warehouseId) {
      newErrors.warehouseId = 'Warehouse is required';
    }

    if (!formData.expectedDate) {
      newErrors.expectedDate = 'Expected date is required';
    }

    formData.lines.forEach((line, index) => {
      if (!line.productId) {
        newErrors[`lines.${index}.productId`] = 'Product is required';
      }
      if (!line.expectedQty || line.expectedQty <= 0) {
        newErrors[`lines.${index}.expectedQty`] = 'Valid quantity is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const payload = {
        ...formData,
        lines: formData.lines.map(line => ({
          ...line,
          expectedQty: parseFloat(line.expectedQty),
          unitPrice: line.unitPrice ? parseFloat(line.unitPrice) : undefined,
        })),
      };

      if (isEditMode) {
        await updateReceipt({ id, ...payload }).unwrap();
      } else {
        await createReceipt(payload).unwrap();
      }

      navigate('/receipts');
    } catch (error) {
      console.error('Failed to save receipt:', error);
      setErrors({ submit: error?.data?.message || 'Failed to save receipt' });
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p._id === productId);
    return product ? `${product.name} (${product.sku})` : '';
  };

  if (isEditMode && isLoadingReceipt) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Receipt' : 'Create Receipt'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEditMode ? 'Update receipt details' : 'Create a new incoming inventory receipt'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/receipts')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          <div className="px-6 py-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="supplierName" className="block text-sm font-medium text-gray-700">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="supplierName"
                  name="supplierName"
                  value={formData.supplierName}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.supplierName
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                  placeholder="Enter supplier name"
                />
                {errors.supplierName && (
                  <p className="mt-1 text-sm text-red-600">{errors.supplierName}</p>
                )}
              </div>

              <div>
                <label htmlFor="warehouseId" className="block text-sm font-medium text-gray-700">
                  Warehouse <span className="text-red-500">*</span>
                </label>
                <select
                  id="warehouseId"
                  name="warehouseId"
                  value={formData.warehouseId}
                  onChange={handleChange}
                  disabled={isLoadingWarehouses}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.warehouseId
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                >
                  <option value="">{isLoadingWarehouses ? 'Loading...' : 'Select warehouse'}</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse._id || warehouse.id} value={warehouse._id || warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                {errors.warehouseId && (
                  <p className="mt-1 text-sm text-red-600">{errors.warehouseId}</p>
                )}
              </div>

              <div>
                <label htmlFor="expectedDate" className="block text-sm font-medium text-gray-700">
                  Expected Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="expectedDate"
                  name="expectedDate"
                  value={formData.expectedDate}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.expectedDate
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                />
                {errors.expectedDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.expectedDate}</p>
                )}
              </div>

              <div>
                <label htmlFor="referenceNumber" className="block text-sm font-medium text-gray-700">
                  Reference Number
                </label>
                <input
                  type="text"
                  id="referenceNumber"
                  name="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="PO-12345"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Line Items</h2>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
            >
              <svg className="-ml-0.5 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Line
            </button>
          </div>

          <div className="px-6 py-6 space-y-4">
            {formData.lines.map((line, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Line {index + 1}</h3>
                  {formData.lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={line.productId}
                      onChange={(e) => handleLineChange(index, 'productId', e.target.value)}
                      disabled={isLoadingProducts}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors[`lines.${index}.productId`]
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                      }`}
                    >
                      <option value="">{isLoadingProducts ? 'Loading...' : 'Select product'}</option>
                      {products.map(product => (
                        <option key={product._id || product.id} value={product._id || product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                    {errors[`lines.${index}.productId`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`lines.${index}.productId`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Expected Qty <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={line.expectedQty}
                      onChange={(e) => handleLineChange(index, 'expectedQty', e.target.value)}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors[`lines.${index}.expectedQty`]
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                      }`}
                      placeholder="0"
                    />
                    {errors[`lines.${index}.expectedQty`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`lines.${index}.expectedQty`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => handleLineChange(index, 'unitPrice', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Line Notes</label>
                  <input
                    type="text"
                    value={line.notes}
                    onChange={(e) => handleLineChange(index, 'notes', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    placeholder="Optional notes for this line"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {errors.submit && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{errors.submit}</h3>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/receipts')}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating || isUpdating}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating || isUpdating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>{isEditMode ? 'Update Receipt' : 'Create Receipt'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReceiptForm;
