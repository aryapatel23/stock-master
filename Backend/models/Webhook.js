const mongoose = require('mongoose');

// Schema for webhook registrations
const webhookSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid URL format'
    }
  },
  
  // Events to subscribe to
  events: [{
    type: String,
    enum: [
      'receipt.created',
      'receipt.validated',
      'receipt.canceled',
      'delivery.created',
      'delivery.validated',
      'delivery.completed',
      'delivery.canceled',
      'transfer.created',
      'transfer.validated',
      'transfer.completed',
      'transfer.canceled',
      'adjustment.created',
      'adjustment.applied',
      'adjustment.canceled',
      'low_stock',
      'out_of_stock',
      'expiry_warning',
      'reorder_needed',
      'purchase_order.created',
      'purchase_order.approved',
      'purchase_order.received',
      'stock.updated',
      'product.created',
      'product.updated',
      'alert.created',
      'alert.resolved'
    ]
  }],

  // Authentication
  secret: {
    type: String,
    trim: true
  },
  headers: {
    type: Map,
    of: String
  },

  // Configuration
  isActive: {
    type: Boolean,
    default: true
  },
  retryOnFailure: {
    type: Boolean,
    default: true
  },
  maxRetries: {
    type: Number,
    default: 3,
    min: 0,
    max: 10
  },
  timeout: {
    type: Number,
    default: 30000, // 30 seconds
    min: 1000,
    max: 60000
  },

  // Statistics
  stats: {
    totalCalls: {
      type: Number,
      default: 0
    },
    successfulCalls: {
      type: Number,
      default: 0
    },
    failedCalls: {
      type: Number,
      default: 0
    },
    lastSuccessAt: Date,
    lastFailureAt: Date,
    lastError: String
  },

  // Last 10 delivery attempts
  recentDeliveries: [{
    event: String,
    timestamp: Date,
    status: {
      type: String,
      enum: ['success', 'failed', 'timeout']
    },
    statusCode: Number,
    responseTime: Number, // milliseconds
    error: String
  }],

  // Metadata
  description: {
    type: String,
    trim: true
  },
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
webhookSchema.index({ isActive: 1, isDeleted: 1 });
webhookSchema.index({ events: 1 });
webhookSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Webhook', webhookSchema);
