const Setting = require('../models/Setting');
const CronConfig = require('../models/CronConfig');

// @route   GET /api/settings
// @desc    Get system settings
// @access  Private
const getSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne()
      .populate('defaults.warehouseId', 'name code')
      .populate('lastUpdatedBy', 'name email');

    // If no settings exist, create default settings
    if (!settings) {
      settings = await Setting.create({
        company: {
          name: 'My Company',
          email: 'info@company.com'
        },
        defaults: {
          currency: 'USD',
          currencySymbol: '$',
          dateFormat: 'YYYY-MM-DD',
          timeFormat: '24h',
          timezone: 'UTC',
          language: 'en',
          decimalPlaces: 2
        },
        inventory: {
          enableBarcodeScanning: false,
          enableBatchTracking: false,
          enableSerialNumbers: false,
          enableExpiryTracking: false,
          lowStockThreshold: 10,
          autoGenerateSKU: false,
          skuPrefix: 'SKU',
          allowNegativeStock: false,
          defaultUoM: 'unit'
        },
        orders: {
          autoApproveReceipts: false,
          autoApproveDeliveries: false,
          autoApproveTransfers: false,
          requirePOForReceipts: false,
          orderNumberPrefix: {
            receipt: 'RCP',
            delivery: 'DO',
            transfer: 'TRF',
            adjustment: 'ADJ',
            purchaseOrder: 'PO'
          }
        },
        alerts: {
          enableLowStockAlerts: true,
          enableExpiryAlerts: true,
          expiryWarningDays: 30,
          enableEmailNotifications: false,
          alertCheckFrequency: 'daily'
        },
        reorder: {
          enableAutoReorder: false,
          autoCreatePO: false,
          defaultLeadTimeDays: 7,
          reorderCheckFrequency: 'daily'
        },
        reports: {
          defaultDateRange: '30days',
          enableScheduledReports: false,
          reportFormat: 'excel'
        },
        security: {
          sessionTimeout: 30,
          passwordMinLength: 8,
          requireStrongPassword: true,
          enable2FA: false,
          maxLoginAttempts: 5,
          lockoutDuration: 15
        },
        integrations: {
          enableWebhooks: false,
          apiRateLimit: 1000
        }
      });
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
};

// @route   PUT /api/settings
// @desc    Update system settings
// @access  Private (Admin only)
const updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    let settings = await Setting.findOne();

    if (!settings) {
      // Create new settings with updates
      updates.lastUpdatedBy = req.user._id;
      settings = await Setting.create(updates);
    } else {
      // Deep merge updates into existing settings
      Object.keys(updates).forEach(key => {
        if (typeof updates[key] === 'object' && !Array.isArray(updates[key]) && updates[key] !== null) {
          // Deep merge for nested objects
          if (settings[key] && typeof settings[key] === 'object') {
            settings[key] = { ...settings[key].toObject(), ...updates[key] };
          } else {
            settings[key] = updates[key];
          }
        } else {
          settings[key] = updates[key];
        }
      });
      
      settings.lastUpdatedBy = req.user._id;
      await settings.save();
    }

    await settings.populate('defaults.warehouseId', 'name code');
    await settings.populate('lastUpdatedBy', 'name email');

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: error.message
    });
  }
};

// @route   GET /api/settings/permissions
// @desc    Get roles and permissions
// @access  Private
const getPermissions = async (req, res) => {
  try {
    // Define role-based permissions
    const permissions = {
      roles: [
        {
          role: 'admin',
          displayName: 'Administrator',
          description: 'Full system access with all permissions',
          permissions: [
            'users:read',
            'users:create',
            'users:update',
            'users:delete',
            'products:read',
            'products:create',
            'products:update',
            'products:delete',
            'warehouses:read',
            'warehouses:create',
            'warehouses:update',
            'warehouses:delete',
            'stock:read',
            'stock:create',
            'stock:update',
            'stock:delete',
            'receipts:read',
            'receipts:create',
            'receipts:approve',
            'receipts:cancel',
            'deliveries:read',
            'deliveries:create',
            'deliveries:approve',
            'deliveries:cancel',
            'transfers:read',
            'transfers:create',
            'transfers:approve',
            'transfers:cancel',
            'adjustments:read',
            'adjustments:create',
            'adjustments:approve',
            'adjustments:cancel',
            'reports:read',
            'reports:generate',
            'alerts:read',
            'alerts:create',
            'alerts:resolve',
            'alerts:delete',
            'reorder:read',
            'reorder:create',
            'reorder:update',
            'reorder:delete',
            'purchaseorders:read',
            'purchaseorders:create',
            'purchaseorders:approve',
            'purchaseorders:cancel',
            'settings:read',
            'settings:update',
            'cron:read',
            'cron:create',
            'cron:update',
            'cron:delete'
          ]
        },
        {
          role: 'manager',
          displayName: 'Manager',
          description: 'Manage inventory operations and approve transactions',
          permissions: [
            'users:read',
            'products:read',
            'products:create',
            'products:update',
            'warehouses:read',
            'stock:read',
            'stock:update',
            'receipts:read',
            'receipts:create',
            'receipts:approve',
            'deliveries:read',
            'deliveries:create',
            'deliveries:approve',
            'transfers:read',
            'transfers:create',
            'transfers:approve',
            'adjustments:read',
            'adjustments:create',
            'adjustments:approve',
            'reports:read',
            'reports:generate',
            'alerts:read',
            'alerts:resolve',
            'reorder:read',
            'reorder:create',
            'reorder:update',
            'purchaseorders:read',
            'purchaseorders:create',
            'purchaseorders:approve',
            'settings:read'
          ]
        },
        {
          role: 'user',
          displayName: 'User',
          description: 'Basic inventory operations',
          permissions: [
            'products:read',
            'warehouses:read',
            'stock:read',
            'receipts:read',
            'receipts:create',
            'deliveries:read',
            'deliveries:create',
            'transfers:read',
            'transfers:create',
            'adjustments:read',
            'reports:read',
            'alerts:read',
            'reorder:read',
            'purchaseorders:read'
          ]
        }
      ],
      modules: [
        {
          name: 'Users',
          permissions: ['read', 'create', 'update', 'delete']
        },
        {
          name: 'Products',
          permissions: ['read', 'create', 'update', 'delete']
        },
        {
          name: 'Warehouses',
          permissions: ['read', 'create', 'update', 'delete']
        },
        {
          name: 'Stock',
          permissions: ['read', 'create', 'update', 'delete']
        },
        {
          name: 'Receipts',
          permissions: ['read', 'create', 'approve', 'cancel']
        },
        {
          name: 'Deliveries',
          permissions: ['read', 'create', 'approve', 'cancel']
        },
        {
          name: 'Transfers',
          permissions: ['read', 'create', 'approve', 'cancel']
        },
        {
          name: 'Adjustments',
          permissions: ['read', 'create', 'approve', 'cancel']
        },
        {
          name: 'Reports',
          permissions: ['read', 'generate']
        },
        {
          name: 'Alerts',
          permissions: ['read', 'create', 'resolve', 'delete']
        },
        {
          name: 'Reorder Rules',
          permissions: ['read', 'create', 'update', 'delete']
        },
        {
          name: 'Purchase Orders',
          permissions: ['read', 'create', 'approve', 'cancel']
        },
        {
          name: 'Settings',
          permissions: ['read', 'update']
        },
        {
          name: 'Cron Jobs',
          permissions: ['read', 'create', 'update', 'delete']
        }
      ]
    };

    res.json({
      success: true,
      permissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching permissions',
      error: error.message
    });
  }
};

// @route   GET /api/settings/cron-jobs
// @desc    Get all cron job configurations
// @access  Private (Admin only)
const getCronJobs = async (req, res) => {
  try {
    const { jobType, enabled } = req.query;
    const query = { isDeleted: false };

    if (jobType) query.jobType = jobType;
    if (enabled !== undefined) query['config.enabled'] = enabled === 'true';

    const cronJobs = await CronConfig.find(query)
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      cronJobs,
      total: cronJobs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cron jobs',
      error: error.message
    });
  }
};

// @route   POST /api/settings/cron-jobs
// @desc    Create cron job configuration
// @access  Private (Admin only)
const createCronJob = async (req, res) => {
  try {
    const {
      jobName,
      jobType,
      description,
      schedule,
      config,
      parameters
    } = req.body;

    // Calculate next run time
    const nextRun = calculateNextRun(schedule);

    const cronJob = await CronConfig.create({
      jobName,
      jobType,
      description,
      schedule,
      config: config || {},
      parameters: parameters || {},
      nextRun,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Cron job created successfully',
      cronJob
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A cron job with this name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating cron job',
      error: error.message
    });
  }
};

// @route   PUT /api/settings/cron-jobs/:id
// @desc    Update cron job configuration
// @access  Private (Admin only)
const updateCronJob = async (req, res) => {
  try {
    const updates = req.body;
    updates.lastUpdatedBy = req.user._id;

    // Recalculate next run if schedule changed
    if (updates.schedule) {
      updates.nextRun = calculateNextRun(updates.schedule);
    }

    const cronJob = await CronConfig.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!cronJob || cronJob.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Cron job not found'
      });
    }

    res.json({
      success: true,
      message: 'Cron job updated successfully',
      cronJob
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating cron job',
      error: error.message
    });
  }
};

// @route   DELETE /api/settings/cron-jobs/:id
// @desc    Delete cron job
// @access  Private (Admin only)
const deleteCronJob = async (req, res) => {
  try {
    const cronJob = await CronConfig.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, 'config.enabled': false },
      { new: true }
    );

    if (!cronJob) {
      return res.status(404).json({
        success: false,
        message: 'Cron job not found'
      });
    }

    res.json({
      success: true,
      message: 'Cron job deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting cron job',
      error: error.message
    });
  }
};

// Helper function to calculate next run time
function calculateNextRun(schedule) {
  const now = new Date();
  const nextRun = new Date();

  switch (schedule.frequency) {
    case 'minutely':
      nextRun.setMinutes(now.getMinutes() + 1);
      break;
    case 'hourly':
      nextRun.setHours(now.getHours() + 1);
      nextRun.setMinutes(0);
      break;
    case 'daily':
      const [hours, minutes] = (schedule.time || '00:00').split(':');
      nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    case 'weekly':
      nextRun.setDate(now.getDate() + ((schedule.dayOfWeek - now.getDay() + 7) % 7));
      const [wHours, wMinutes] = (schedule.time || '00:00').split(':');
      nextRun.setHours(parseInt(wHours), parseInt(wMinutes), 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 7);
      }
      break;
    case 'monthly':
      nextRun.setDate(schedule.dayOfMonth || 1);
      const [mHours, mMinutes] = (schedule.time || '00:00').split(':');
      nextRun.setHours(parseInt(mHours), parseInt(mMinutes), 0, 0);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
    default:
      nextRun.setHours(now.getHours() + 1);
  }

  return nextRun;
}

module.exports = {
  getSettings,
  updateSettings,
  getPermissions,
  getCronJobs,
  createCronJob,
  updateCronJob,
  deleteCronJob
};
