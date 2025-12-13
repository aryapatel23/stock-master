const mongoose = require('mongoose');

// Schema for cron job configurations
const cronConfigSchema = new mongoose.Schema({
  jobName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  jobType: {
    type: String,
    enum: [
      'stock_revaluation',
      'low_stock_check',
      'expiry_check',
      'reorder_check',
      'scheduled_report',
      'data_cleanup',
      'backup',
      'custom'
    ],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Cron schedule (cron expression or simple schedule)
  schedule: {
    cronExpression: {
      type: String,
      trim: true
    },
    frequency: {
      type: String,
      enum: ['minutely', 'hourly', 'daily', 'weekly', 'monthly', 'custom'],
      default: 'daily'
    },
    time: {
      type: String, // HH:MM format
      default: '00:00'
    },
    dayOfWeek: {
      type: Number, // 0-6 (Sunday-Saturday)
      min: 0,
      max: 6
    },
    dayOfMonth: {
      type: Number, // 1-31
      min: 1,
      max: 31
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },

  // Job configuration
  config: {
    enabled: {
      type: Boolean,
      default: true
    },
    retryOnFailure: {
      type: Boolean,
      default: true
    },
    maxRetries: {
      type: Number,
      default: 3
    },
    timeout: {
      type: Number,
      default: 300000 // 5 minutes in ms
    },
    notifyOnSuccess: {
      type: Boolean,
      default: false
    },
    notifyOnFailure: {
      type: Boolean,
      default: true
    },
    notificationEmails: [String]
  },

  // Job-specific parameters
  parameters: {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    reportType: String,
    emailRecipients: [String],
    customSettings: mongoose.Schema.Types.Mixed
  },

  // Execution tracking
  lastRun: {
    startTime: Date,
    endTime: Date,
    status: {
      type: String,
      enum: ['success', 'failed', 'timeout', 'skipped']
    },
    message: String,
    recordsProcessed: Number,
    error: String
  },

  nextRun: Date,
  runCount: {
    type: Number,
    default: 0
  },
  successCount: {
    type: Number,
    default: 0
  },
  failureCount: {
    type: Number,
    default: 0
  },

  // Execution history (last 10 runs)
  history: [{
    runTime: Date,
    duration: Number, // milliseconds
    status: String,
    message: String,
    recordsProcessed: Number
  }],

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
cronConfigSchema.index({ jobName: 1, isDeleted: 1 });
cronConfigSchema.index({ 'config.enabled': 1, nextRun: 1 });
cronConfigSchema.index({ jobType: 1 });

module.exports = mongoose.model('CronConfig', cronConfigSchema);
