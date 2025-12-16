import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetProductQuery, useCreateProductMutation, useUpdateProductMutation } from '../../store/api/productsApi';
import { useGetCategoriesQuery } from '../../store/api/categoriesApi';
import { useGetWarehousesQuery } from '../../store/api/warehousesApi';

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const { data: product, isLoading: productLoading } = useGetProductQuery(id, { skip: !isEditMode });
  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: warehouses = [], isLoading: warehousesLoading } = useGetWarehousesQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

  const warehousesList = Array.isArray(warehouses) ? warehouses : [];
  const categoriesList = Array.isArray(categories) ? categories : [];

  // Debug: Log warehouses data
  useEffect(() => {
    console.log('Warehouses data:', warehouses);
    console.log('Warehouses list:', warehousesList);
  }, [warehouses, warehousesList]);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    uom: 'PCS',
    defaultWarehouseId: '',
    reorderLevel: '0',
    price: '0',
    cost: '0',
    isActive: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditMode && product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        description: product.description || '',
        categoryId: product.categoryId?._id || product.categoryId || '',
        uom: product.uom || 'PCS',
        defaultWarehouseId: product.defaultWarehouseId?._id || product.defaultWarehouseId || '',
        reorderLevel: product.reorderLevel?.toString() || '0',
        price: product.price?.toString() || '0',
        cost: product.cost?.toString() || '0',
        isActive: product.isActive !== undefined ? product.isActive : true,
      });
    }
  }, [isEditMode, product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Product name must be at least 2 characters';
    }
    
    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }
    
    if (!formData.uom.trim()) {
      newErrors.uom = 'Unit of measure is required';
    }

    if (formData.price && parseFloat(formData.price) < 0) {
      newErrors.price = 'Price cannot be negative';
    }

    if (formData.cost && parseFloat(formData.cost) < 0) {
      newErrors.cost = 'Cost cannot be negative';
    }

    if (formData.reorderLevel && parseFloat(formData.reorderLevel) < 0) {
      newErrors.reorderLevel = 'Reorder level cannot be negative';
    }

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
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        description: formData.description.trim() || undefined,
        categoryId: formData.categoryId || undefined,
        uom: formData.uom.trim().toUpperCase(),
        defaultWarehouseId: formData.defaultWarehouseId || undefined,
        reorderLevel: parseFloat(formData.reorderLevel) || 0,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        isActive: formData.isActive,
      };

      if (isEditMode) {
        await updateProduct({ id, ...payload }).unwrap();
        alert('Product updated successfully!');
      } else {
        await createProduct(payload).unwrap();
        alert('Product created successfully!');
      }
      
      navigate('/products');
    } catch (err) {
      console.error('Error saving product:', err);
      setErrors({ 
        submit: err?.data?.message || err?.message || 'Failed to save product' 
      });
      alert(err?.data?.message || err?.message || 'Failed to save product');
    }
  };

  if (productLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="bg-white shadow-md rounded-lg p-6 space-y-6">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditMode ? 'Edit Product' : 'Add New Product'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isEditMode ? 'Update product information' : 'Create a new product in your inventory'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {/* Basic Information */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Product Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-2">
                SKU <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                disabled={isEditMode}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.sku ? 'border-red-500' : 'border-gray-300'
                } ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Enter SKU (e.g., PROD-001)"
              />
              {errors.sku && (
                <p className="mt-1 text-sm text-red-600">{errors.sku}</p>
              )}
              {isEditMode && (
                <p className="mt-1 text-xs text-gray-500">SKU cannot be changed</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter product description"
              />
            </div>
          </div>
        </div>

        {/* Category & Classification */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Category & Classification</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a category</option>
                {categoriesList.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="uom" className="block text-sm font-medium text-gray-700 mb-2">
                Unit of Measure <span className="text-red-600">*</span>
              </label>
              <select
                id="uom"
                name="uom"
                value={formData.uom}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.uom ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="PCS">Pieces (PCS)</option>
                <option value="BOX">Box (BOX)</option>
                <option value="CTN">Carton (CTN)</option>
                <option value="KG">Kilogram (KG)</option>
                <option value="L">Liter (L)</option>
                <option value="M">Meter (M)</option>
                <option value="SET">Set (SET)</option>
                <option value="UNIT">Unit (UNIT)</option>
              </select>
              {errors.uom && (
                <p className="mt-1 text-sm text-red-600">{errors.uom}</p>
              )}
            </div>
          </div>
        </div>

        {/* Inventory Settings */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="defaultWarehouseId" className="block text-sm font-medium text-gray-700 mb-2">
                Default Warehouse
              </label>
              <select
                id="defaultWarehouseId"
                name="defaultWarehouseId"
                value={formData.defaultWarehouseId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a warehouse</option>
                {warehousesList.map((warehouse) => (
                  <option key={warehouse._id || warehouse.id} value={warehouse._id || warehouse.id}>
                    {warehouse.name || 'Unnamed Warehouse'}
                  </option>
                ))}
              </select>
              {warehousesLoading && (
                <p className="mt-1 text-xs text-gray-500">Loading warehouses...</p>
              )}
              {!warehousesLoading && warehousesList.length === 0 && (
                <p className="mt-1 text-xs text-yellow-600">No warehouses available</p>
              )}
            </div>

            <div>
              <label htmlFor="reorderLevel" className="block text-sm font-medium text-gray-700 mb-2">
                Reorder Level
              </label>
              <input
                type="number"
                id="reorderLevel"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleChange}
                min="0"
                step="1"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.reorderLevel ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.reorderLevel && (
                <p className="mt-1 text-sm text-red-600">{errors.reorderLevel}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Minimum stock level before reordering
              </p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pricing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-2">
                Cost Price ($)
              </label>
              <input
                type="number"
                id="cost"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.cost ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.cost && (
                <p className="mt-1 text-sm text-red-600">{errors.cost}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Purchase or manufacturing cost
              </p>
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price ($)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="mt-1 text-sm text-red-600">{errors.price}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Retail or selling price
              </p>
            </div>
          </div>

          {/* Profit Margin Display */}
          {formData.cost > 0 && formData.price > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Profit Margin:</span>
                <span className="text-lg font-bold text-blue-600">
                  {(((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium text-gray-700">Profit per Unit:</span>
                <span className="text-lg font-semibold text-green-600">
                  ${(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Status</h2>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active Product
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Inactive products won't appear in orders or stock movements
          </p>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating || isUpdating}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-medium"
          >
            {isCreating || isUpdating ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEditMode ? 'Updating...' : 'Creating...'}
              </span>
            ) : (
              <span>{isEditMode ? 'Update Product' : 'Create Product'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
