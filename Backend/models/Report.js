const mongoose = require('mongoose');

// Schema for storing custom report configurations and results
const reportSchema = new mongoose.Schema({
  reportType: {
    type: String,
    enum: ['stock_ageing', 'turnover', 'slow_moving', 'abc_analysis', 'custom'],
    required: true
  },
  reportName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Report parameters
  parameters: {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },
    dateFrom: Date,
    dateTo: Date,
    daysBucket: [Number],
    limit: Number,
    customQuery: mongoose.Schema.Types.Mixed
  },
  
  // Report results
  results: {
    data: mongoose.Schema.Types.Mixed,
    summary: mongoose.Schema.Types.Mixed,
    totalRecords: Number,
    generatedAt: Date
  },
  
  // Result file storage (for large reports)
  resultFile: {
    filename: String,
    path: String,
    format: {
      type: String,
      enum: ['json', 'csv', 'excel']
    },
    size: Number
  },
  
  // Processing info
  processingTime: Number, // milliseconds
  errorMessage: String,
  
  // Scheduling
  isScheduled: {
    type: Boolean,
    default: false
  },
  scheduleConfig: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    time: String, // HH:MM format
    lastRun: Date,
    nextRun: Date
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
reportSchema.index({ reportType: 1, status: 1 });
reportSchema.index({ createdBy: 1, createdAt: -1 });
reportSchema.index({ isScheduled: 1, 'scheduleConfig.nextRun': 1 });

module.exports = mongoose.model('Report', reportSchema);
