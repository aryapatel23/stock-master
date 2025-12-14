import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useCreateTransferMutation, useGetTransferQuery } from '../../store/api/transfersApi';
import { useGetProductsQuery } from '../../store/api/productsApi';
import { useGetWarehousesQuery } from '../../store/api/warehousesApi';
import { useGetWarehouseLocationsQuery } from '../../store/api/locationsApi';
import { selectCurrentUser } from '../../store/slices/authSlice';

const TransferForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useSelector(selectCurrentUser);
  const isEditMode = Boolean(id);

  const { data: transferData, isLoading: isLoadingTransfer } = useGetTransferQuery(id, { skip: !id });
  const { data: productsData } = useGetProductsQuery();
  const { data: warehousesData } = useGetWarehousesQuery();
  const [createTransfer, { isLoading: isCreating }] = useCreateTransferMutation();

  const [formData, setFormData] = useState({
    fromWarehouseId: '',
    fromLocationId: '',
    toWarehouseId: '',
    toLocationId: '',
    expectedDate: '',
    notes: '',
    lines: [{ productId: '', requestedQty: '', notes: '' }],
  });

  const [errors, setErrors] = useState({});

  // Fetch locations for from warehouse
  const { data: fromLocationsData } = useGetWarehouseLocationsQuery(formData.fromWarehouseId, {
    skip: !formData.fromWarehouseId,
  });

  // Fetch locations for to warehouse
  const { data: toLocationsData } = useGetWarehouseLocationsQuery(formData.toWarehouseId, {
    skip: !formData.toWarehouseId,
  });

  const fromLocations = fromLocationsData?.locations || [];
  const toLocations = toLocationsData?.locations || [];

  useEffect(() => {
    if (isEditMode && transferData?.transfer) {
      const transfer = transferData.transfer;
      setFormData({
        fromWarehouseId: transfer.fromWarehouseId?._id || '',
        fromLocationId: transfer.fromLocationId?._id || '',
        toWarehouseId: transfer.toWarehouseId?._id || '',
        toLocationId: transfer.toLocationId?._id || '',
        expectedDate: transfer.expectedDate ? transfer.expectedDate.split('T')[0] : '',
        notes: transfer.notes || '',
        lines: transfer.lines?.map(line => ({
          productId: line.productId?._id || '',
          requestedQty: line.requestedQty || '',
          notes: line.notes || '',
        })) || [{ productId: '', requestedQty: '', notes: '' }],
      });
    }
  }, [isEditMode, transferData]);

  // Reset fromLocationId when fromWarehouseId changes
  useEffect(() => {
    if (!isEditMode) {
      setFormData(prev => ({ ...prev, fromLocationId: '' }));
    }
  }, [formData.fromWarehouseId, isEditMode]);

  // Reset toLocationId when toWarehouseId changes
  useEffect(() => {
    if (!isEditMode) {
      setFormData(prev => ({ ...prev, toLocationId: '' }));
    }
  }, [formData.toWarehouseId, isEditMode]);

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

  const products = productsData?.data || [];
  const warehouses = warehousesData?.data || [];

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
      lines: [...prev.lines, { productId: '', requestedQty: '', notes: '' }],
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

    if (!formData.fromWarehouseId) {
      newErrors.fromWarehouseId = 'Source warehouse is required';
    }

    if (!formData.fromLocationId) {
      newErrors.fromLocationId = 'Source location is required';
    }

    if (!formData.toWarehouseId) {
      newErrors.toWarehouseId = 'Destination warehouse is required';
    }

    if (!formData.toLocationId) {
      newErrors.toLocationId = 'Destination location is required';
    }

    if (formData.fromLocationId === formData.toLocationId) {
      newErrors.toLocationId = 'Source and destination locations must be different';
    }

    formData.lines.forEach((line, index) => {
      if (!line.productId) {
        newErrors[`lines.${index}.productId`] = 'Product is required';
      }
      if (!line.requestedQty || line.requestedQty <= 0) {
        newErrors[`lines.${index}.requestedQty`] = 'Valid quantity is required';
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
        fromLocationId: formData.fromLocationId,
        toLocationId: formData.toLocationId,
        expectedDate: formData.expectedDate || undefined,
        notes: formData.notes,
        lines: formData.lines.map(line => ({
          productId: line.productId,
          requestedQty: parseFloat(line.requestedQty),
          notes: line.notes,
        })),
      };

      await createTransfer(payload).unwrap();
      navigate('/transfers');
    } catch (error) {
      console.error('Failed to save transfer:', error);
      setErrors({ submit: error?.data?.message || 'Failed to save transfer' });
    }
  };

  if (isEditMode && isLoadingTransfer) {
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
            {isEditMode ? 'Edit Transfer' : 'Create Transfer'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEditMode ? 'Update transfer details' : 'Create a new stock transfer'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/transfers')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Transfer Details</h3>
          </div>
          <div className="px-6 py-4 space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="fromWarehouseId" className="block text-sm font-medium text-gray-700">
                  From Warehouse <span className="text-red-500">*</span>
                </label>
                <select
                  id="fromWarehouseId"
                  name="fromWarehouseId"
                  value={formData.fromWarehouseId}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.fromWarehouseId
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                {errors.fromWarehouseId && (
                  <p className="mt-1 text-sm text-red-600">{errors.fromWarehouseId}</p>
                )}
              </div>

              <div>
                <label htmlFor="fromLocationId" className="block text-sm font-medium text-gray-700">
                  From Location <span className="text-red-500">*</span>
                </label>
                <select
                  id="fromLocationId"
                  name="fromLocationId"
                  value={formData.fromLocationId}
                  onChange={handleChange}
                  disabled={!formData.fromWarehouseId}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.fromLocationId
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  } disabled:bg-gray-100`}
                >
                  <option value="">Select location</option>
                  {fromLocations.map(location => (
                    <option key={location._id} value={location._id}>
                      {location.code} ({location.type})
                    </option>
                  ))}
                </select>
                {errors.fromLocationId && (
                  <p className="mt-1 text-sm text-red-600">{errors.fromLocationId}</p>
                )}
              </div>

              <div>
                <label htmlFor="toWarehouseId" className="block text-sm font-medium text-gray-700">
                  To Warehouse <span className="text-red-500">*</span>
                </label>
                <select
                  id="toWarehouseId"
                  name="toWarehouseId"
                  value={formData.toWarehouseId}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.toWarehouseId
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                {errors.toWarehouseId && (
                  <p className="mt-1 text-sm text-red-600">{errors.toWarehouseId}</p>
                )}
              </div>

              <div>
                <label htmlFor="toLocationId" className="block text-sm font-medium text-gray-700">
                  To Location <span className="text-red-500">*</span>
                </label>
                <select
                  id="toLocationId"
                  name="toLocationId"
                  value={formData.toLocationId}
                  onChange={handleChange}
                  disabled={!formData.toWarehouseId}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.toLocationId
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  } disabled:bg-gray-100`}
                >
                  <option value="">Select location</option>
                  {toLocations.map(location => (
                    <option key={location._id} value={location._id}>
                      {location.code} ({location.type})
                    </option>
                  ))}
                </select>
                {errors.toLocationId && (
                  <p className="mt-1 text-sm text-red-600">{errors.toLocationId}</p>
                )}
              </div>

              <div>
                <label htmlFor="expectedDate" className="block text-sm font-medium text-gray-700">
                  Expected Date
                </label>
                <input
                  type="date"
                  id="expectedDate"
                  name="expectedDate"
                  value={formData.expectedDate}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
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
                placeholder="Add any notes about this transfer..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Transfer Items</h3>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
            >
              <svg className="-ml-0.5 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>
          <div className="px-6 py-4 space-y-4">
            {formData.lines.map((line, index) => (
              <div key={index} className="relative border border-gray-200 rounded-lg p-4">
                {formData.lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={line.productId}
                      onChange={(e) => handleLineChange(index, 'productId', e.target.value)}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors[`lines.${index}.productId`]
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                      }`}
                    >
                      <option value="">Select product</option>
                      {products.map(product => (
                        <option key={product._id} value={product._id}>
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
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={line.requestedQty}
                      onChange={(e) => handleLineChange(index, 'requestedQty', e.target.value)}
                      className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                        errors[`lines.${index}.requestedQty`]
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                      }`}
                    />
                    {errors[`lines.${index}.requestedQty`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`lines.${index}.requestedQty`]}</p>
                    )}
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={line.notes}
                      onChange={(e) => handleLineChange(index, 'notes', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      placeholder="Add notes for this item..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {errors.submit && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/transfers')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : isEditMode ? 'Update Transfer' : 'Create Transfer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransferForm;
