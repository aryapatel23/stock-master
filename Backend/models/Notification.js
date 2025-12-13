const mongoose = require('mongoose');

// Schema for user notifications
const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'info',
      'success',
      'warning',
      'error',
      'alert',
      'system',
      'low_stock',
      'out_of_stock',
      'expiry_warning',
      'reorder_needed',
      'approval_required',
      'order_completed',
      'transfer_completed'
    ],
    required: true
  },
  
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  message: {
    type: String,
    required: true,
    trim: true
  },

  // Target users
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Delivery channels
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'sms', 'push'],
    default: ['in_app']
  }],

  // Related entities
  relatedEntity: {
    entityType: {
      type: String,
      enum: [
        'receipt',
        'delivery',
        'transfer',
        'adjustment',
        'purchase_order',
        'alert',
        'product',
        'warehouse',
        'reorder_rule'
      ]
    },
    entityId: mongoose.Schema.Types.ObjectId
  },

  // Action link
  actionUrl: {
    type: String,
    trim: true
  },
  actionText: {
    type: String,
    trim: true
  },

  // Status tracking
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,

  // Delivery status
  deliveryStatus: {
    in_app: {
      status: {
        type: String,
        enum: ['pending', 'delivered', 'failed'],
        default: 'delivered'
      },
      deliveredAt: Date
    },
    email: {
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
      },
      sentAt: Date,
      error: String
    },
    sms: {
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
      },
      sentAt: Date,
      error: String
    },
    push: {
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
      },
      sentAt: Date,
      error: String
    }
  },

  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Expiration
  expiresAt: Date,

  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  createdBy: {
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
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, userId: 1 });
notificationSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('Notification', notificationSchema);
