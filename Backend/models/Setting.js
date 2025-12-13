const mongoose = require('mongoose');

// Schema for system and company settings
const settingSchema = new mongoose.Schema({
  // Company Information
  company: {
    name: {
      type: String,
      trim: true
    },
    legalName: {
      type: String,
      trim: true
    },
    taxId: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    },
    logo: {
      type: String,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String
    }
  },

  // Default Configuration
  defaults: {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true
    },
    currencySymbol: {
      type: String,
      default: '$'
    },
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'YYYY-MM-DD'
    },
    timeFormat: {
      type: String,
      enum: ['12h', '24h'],
      default: '24h'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    language: {
      type: String,
      default: 'en'
    },
    decimalPlaces: {
      type: Number,
      default: 2,
      min: 0,
      max: 4
    }
  },

  // Inventory Settings
  inventory: {
    enableBarcodeScanning: {
      type: Boolean,
      default: false
    },
    enableBatchTracking: {
      type: Boolean,
      default: false
    },
    enableSerialNumbers: {
      type: Boolean,
      default: false
    },
    enableExpiryTracking: {
      type: Boolean,
      default: false
    },
    lowStockThreshold: {
      type: Number,
      default: 10
    },
    autoGenerateSKU: {
      type: Boolean,
      default: false
    },
    skuPrefix: {
      type: String,
      default: 'SKU'
    },
    allowNegativeStock: {
      type: Boolean,
      default: false
    },
    defaultUoM: {
      type: String,
      default: 'unit'
    }
  },

  // Order Settings
  orders: {
    autoApproveReceipts: {
      type: Boolean,
      default: false
    },
    autoApproveDeliveries: {
      type: Boolean,
      default: false
    },
    autoApproveTransfers: {
      type: Boolean,
      default: false
    },
    requirePOForReceipts: {
      type: Boolean,
      default: false
    },
    orderNumberPrefix: {
      receipt: { type: String, default: 'RCP' },
      delivery: { type: String, default: 'DO' },
      transfer: { type: String, default: 'TRF' },
      adjustment: { type: String, default: 'ADJ' },
      purchaseOrder: { type: String, default: 'PO' }
    }
  },

  // Alert Settings
  alerts: {
    enableLowStockAlerts: {
      type: Boolean,
      default: true
    },
    enableExpiryAlerts: {
      type: Boolean,
      default: true
    },
    expiryWarningDays: {
      type: Number,
      default: 30
    },
    enableEmailNotifications: {
      type: Boolean,
      default: false
    },
    notificationEmails: [String],
    alertCheckFrequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly'],
      default: 'daily'
    }
  },

  // Reorder Settings
  reorder: {
    enableAutoReorder: {
      type: Boolean,
      default: false
    },
    autoCreatePO: {
      type: Boolean,
      default: false
    },
    defaultLeadTimeDays: {
      type: Number,
      default: 7
    },
    reorderCheckFrequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly'],
      default: 'daily'
    }
  },

  // Report Settings
  reports: {
    defaultDateRange: {
      type: String,
      enum: ['7days', '30days', '90days', '1year'],
      default: '30days'
    },
    enableScheduledReports: {
      type: Boolean,
      default: false
    },
    reportFormat: {
      type: String,
      enum: ['pdf', 'excel', 'csv'],
      default: 'excel'
    }
  },

  // Security Settings
  security: {
    sessionTimeout: {
      type: Number,
      default: 30 // minutes
    },
    passwordMinLength: {
      type: Number,
      default: 8
    },
    requireStrongPassword: {
      type: Boolean,
      default: true
    },
    enable2FA: {
      type: Boolean,
      default: false
    },
    maxLoginAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      default: 15 // minutes
    }
  },

  // Integration Settings
  integrations: {
    enableWebhooks: {
      type: Boolean,
      default: false
    },
    webhookURL: String,
    apiRateLimit: {
      type: Number,
      default: 1000 // requests per hour
    }
  },

  // Metadata
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingSchema.index({ _id: 1 }, { unique: true });

module.exports = mongoose.model('Setting', settingSchema);
