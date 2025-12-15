import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetWarehousesQuery } from '../../store/api/warehousesApi';
import { useGetProductsQuery } from '../../store/api/productsApi';
import { useGetWarehouseLocationsQuery } from '../../store/api/locationsApi';
import { useCreateAdjustmentMutation } from '../../store/api/adjustmentsApi';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { ArrowLeft, Plus, Trash2, AlertTriangle, Package } from 'lucide-react';

const AdjustmentForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useSelector(selectCurrentUser);
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    warehouseId: '',
    reason: 'physical_count',
    notes: '',
    lines: [],
  });

  const [errors, setErrors] = useState({});
  const [currentLine, setCurrentLine] = useState({
    productId: '',
    locationId: '',
    countedQty: '',
    systemQty: '',
    reason: '',
  });

  const { data: warehousesData } = useGetWarehousesQuery();
  const { data: productsData } = useGetProductsQuery();
  const { data: locationsData } = useGetWarehouseLocationsQuery(formData.warehouseId, {
    skip: !formData.warehouseId,
  });
  const [createAdjustment, { isLoading: isCreating }] = useCreateAdjustmentMutation();

  const warehouses = warehousesData?.data || [];
  const products = productsData?.data || [];
  const locations = locationsData?.locations || [];

  if (user?.role !== 'admin') {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleLineChange = (e) => {
    const { name, value } = e.target;
    setCurrentLine((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addLine = () => {
    if (!currentLine.productId || !currentLine.locationId || !currentLine.countedQty) {
      alert('Please fill all required line fields');
      return;
    }

    const product = products.find((p) => p._id === currentLine.productId);
    const location = locations.find((l) => l._id === currentLine.locationId);

    setFormData((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          productId: currentLine.productId,
          locationId: currentLine.locationId,
          product,
          location,
          countedQty: parseInt(currentLine.countedQty),
          systemQty: currentLine.systemQty ? parseInt(currentLine.systemQty) : 0,
          reason: currentLine.reason,
        },
      ],
    }));

    setCurrentLine({
      productId: '',
      locationId: '',
      countedQty: '',
      systemQty: '',
      reason: '',
    });
  };

  const removeLine = (index) => {
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.warehouseId) newErrors.warehouseId = 'Warehouse is required';
    if (!formData.reason) newErrors.reason = 'Reason is required';
    if (formData.lines.length === 0) newErrors.lines = 'At least one adjustment line is required';

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      console.log('Validation errors:', newErrors);
      alert('Please fill in all required fields');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submitted with data:', formData);

    if (!validateForm()) {
      return;
    }

    try {
      const adjustmentData = {
        reason: formData.reason,
        warehouseId: formData.warehouseId,
        notes: formData.notes,
        lines: formData.lines.map((line) => ({
          productId: line.productId,
          locationId: line.locationId,
          countedQty: line.countedQty,
          systemQty: line.systemQty,
          reason: line.reason,
        })),
      };

      console.log('Sending adjustment data:', adjustmentData);
      console.log('Lines being sent:', JSON.stringify(adjustmentData.lines, null, 2));
      
      const result = await createAdjustment(adjustmentData).unwrap();
      console.log('Adjustment created successfully:', result);
      alert('Adjustment created successfully!');
      navigate('/adjustments');
    } catch (err) {
      console.error('Failed to create adjustment:', err);
      console.error('Error details:', err?.data);
      const errorMessage = err?.data?.message || err?.message || 'Failed to create adjustment';
      const validationErrors = err?.data?.errors || [];
      if (validationErrors.length > 0) {
        console.error('Validation errors:', validationErrors);
        alert(`Validation failed:\n${validationErrors.map(e => `${e.field}: ${e.message}`).join('\n')}`);
      } else {
        alert(errorMessage);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/adjustments')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Adjustment' : 'New Adjustment'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isEdit ? 'Update adjustment details' : 'Create a new inventory adjustment'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Adjustment Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Adjustment Information</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="warehouseId" className="block text-sm font-medium text-gray-700">
                  Warehouse <span className="text-red-500">*</span>
                </label>
                <select
                  id="warehouseId"
                  name="warehouseId"
                  value={formData.warehouseId}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.warehouseId
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                >
                  <option key="empty-warehouse" value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
                {errors.warehouseId && (
                  <p className="mt-1 text-sm text-red-600">{errors.warehouseId}</p>
                )}
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                  Reason <span className="text-red-500">*</span>
                </label>
                <select
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.reason
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  }`}
                >
                  <option key="physical_count" value="physical_count">Physical Count</option>
                  <option key="damaged" value="damaged">Damaged</option>
                  <option key="lost" value="lost">Lost</option>
                  <option key="found" value="found">Found</option>
                  <option key="expired" value="expired">Expired</option>
                  <option key="other" value="other">Other</option>
                </select>
                {errors.reason && (
                  <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
                )}
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

        {/* Add Adjustment Line */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Add Items</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
              <div>
                <label htmlFor="productId" className="block text-sm font-medium text-gray-700">
                  Product <span className="text-red-500">*</span>
                </label>
                <select
                  id="productId"
                  name="productId"
                  value={currentLine.productId}
                  onChange={handleLineChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option key="empty-product" value="">Select product</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="locationId" className="block text-sm font-medium text-gray-700">
                  Location <span className="text-red-500">*</span>
                </label>
                <select
                  id="locationId"
                  name="locationId"
                  value={currentLine.locationId}
                  onChange={handleLineChange}
                  disabled={!formData.warehouseId}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:bg-gray-100"
                >
                  <option key="empty-location" value="">Select location</option>
                  {locations.map((location) => (
                    <option key={location._id} value={location._id}>
                      {location.code} ({location.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="systemQty" className="block text-sm font-medium text-gray-700">
                  System Qty
                </label>
                <input
                  type="number"
                  id="systemQty"
                  name="systemQty"
                  value={currentLine.systemQty}
                  onChange={handleLineChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="countedQty" className="block text-sm font-medium text-gray-700">
                  Counted Qty <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="countedQty"
                  name="countedQty"
                  value={currentLine.countedQty}
                  onChange={handleLineChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="lineReason" className="block text-sm font-medium text-gray-700">
                  Line Reason
                </label>
                <input
                  type="text"
                  id="reason"
                  name="reason"
                  value={currentLine.reason}
                  onChange={handleLineChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Line
            </button>
          </div>
        </div>

        {/* Adjustment Lines Table */}
        {formData.lines.length > 0 ? (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Adjustment Lines ({formData.lines.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">System Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Counted Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.lines.map((line, index) => {
                    const variance = line.countedQty - (line.systemQty || 0);
                    return (
                      <tr key={index} className={variance < 0 ? 'bg-red-50' : variance > 0 ? 'bg-green-50' : ''}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {line.product?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {line.location?.code || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {line.systemQty || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {line.countedQty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-semibold ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {variance > 0 ? '+' : ''}{variance}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {line.reason || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No items added</h3>
              <p className="mt-1 text-sm text-gray-500">Add at least one item to create an adjustment.</p>
            </div>
          </div>
        )}

        {errors.lines && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{errors.lines}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/adjustments')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {isCreating ? 'Creating...' : 'Create Adjustment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdjustmentForm;
