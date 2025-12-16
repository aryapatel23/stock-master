import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useGetSettingsQuery, useUpdateSettingsMutation } from '../../store/api/settingsApi';
import { useGetWarehousesQuery } from '../../store/api/warehousesApi';

const Settings = () => {
  const userRole = useSelector((state) => state.auth.user?.role);
  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery();
  const { data: warehouses, isLoading: warehousesLoading } = useGetWarehousesQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();

  const warehousesList = Array.isArray(warehouses) ? warehouses : [];

  const [formData, setFormData] = useState({
    company: {
      name: '',
      email: '',
      phone: '',
      address: {
        street: '',
      },
    },
    defaults: {
      warehouseId: '',
    },
    alerts: {
      enableLowStockAlerts: false,
      enableEmailNotifications: false,
    },
    orders: {
      autoApproveReceipts: false,
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        company: {
          name: settings.company?.name || '',
          email: settings.company?.email || '',
          phone: settings.company?.phone || '',
          address: {
            street: settings.company?.address?.street || '',
          },
        },
        defaults: {
          warehouseId: settings.defaults?.warehouseId?._id || settings.defaults?.warehouseId || '',
        },
        alerts: {
          enableLowStockAlerts: settings.alerts?.enableLowStockAlerts || false,
          enableEmailNotifications: settings.alerts?.enableEmailNotifications || false,
        },
        orders: {
          autoApproveReceipts: settings.orders?.autoApproveReceipts || false,
        },
      });
    }
  }, [settings]);

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unauthorized Access</h2>
          <p className="text-gray-600">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleNotificationToggle = (section, field) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: !prev[section][field],
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await updateSettings(formData).unwrap();
      alert('Settings saved successfully');
    } catch (err) {
      alert(err.data?.message || err.message || 'Failed to save settings');
    }
  };

  if (settingsLoading || warehousesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="bg-white shadow-md rounded-lg p-6 space-y-8">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure system preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                Company Name
              </label>
              <input
                type="text"
                id="companyName"
                name="company.name"
                value={formData.company.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Company Email
              </label>
              <input
                type="email"
                id="companyEmail"
                name="company.email"
                value={formData.company.email}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="company@example.com"
              />
            </div>

            <div>
              <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700 mb-2">
                Company Phone
              </label>
              <input
                type="tel"
                id="companyPhone"
                name="company.phone"
                value={formData.company.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Company Address
              </label>
              <input
                type="text"
                id="companyAddress"
                name="companyAddress"
                value={formData.company.address.street}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    company: {
                      ...prev.company,
                      address: {
                        street: e.target.value
                      }
                    }
                  }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="123 Main St, City, State, ZIP"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Default Warehouse</h2>
          <div>
            <label htmlFor="defaultWarehouse" className="block text-sm font-medium text-gray-700 mb-2">
              Default Warehouse
            </label>
            <select
              id="defaultWarehouse"
              name="defaults.warehouseId"
              value={formData.defaults.warehouseId}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a warehouse</option>
              {warehousesList.map((warehouse) => (
                <option key={warehouse._id} value={warehouse._id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Low Stock Alerts</h3>
                <p className="text-sm text-gray-500">Receive notifications when stock levels are low</p>
              </div>
              <button
                type="button"
                onClick={() => handleNotificationToggle('alerts', 'enableLowStockAlerts')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.alerts.enableLowStockAlerts ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.alerts.enableLowStockAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-500">Get email notifications for important events</p>
              </div>
              <button
                type="button"
                onClick={() => handleNotificationToggle('alerts', 'enableEmailNotifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.alerts.enableEmailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.alerts.enableEmailNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Auto Approve Receipts</h3>
                <p className="text-sm text-gray-500">Automatically approve incoming receipt orders</p>
              </div>
              <button
                type="button"
                onClick={() => handleNotificationToggle('orders', 'autoApproveReceipts')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.orders.autoApproveReceipts ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.orders.autoApproveReceipts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
