const mongoose = require('mongoose');

// Schema for uploaded files/documents
const uploadSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  
  // Storage information
  storage: {
    provider: {
      type: String,
      enum: ['local', 's3', 'azure', 'gcs'],
      default: 'local'
    },
    path: {
      type: String,
      required: true
    },
    bucket: String,
    key: String,
    url: String
  },

  // File categorization
  fileType: {
    type: String,
    enum: ['image', 'document', 'spreadsheet', 'pdf', 'video', 'audio', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'product_image',
      'product_document',
      'receipt_document',
      'delivery_document',
      'invoice',
      'packing_slip',
      'report',
      'attachment',
      'other'
    ],
    default: 'other'
  },

  // Related entities
  relatedEntity: {
    entityType: {
      type: String,
      enum: [
        'product',
        'receipt',
        'delivery',
        'transfer',
        'adjustment',
        'purchase_order',
        'warehouse',
        'user',
        'report'
      ]
    },
    entityId: mongoose.Schema.Types.ObjectId
  },

  // Access control
  isPublic: {
    type: Boolean,
    default: false
  },
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  allowedRoles: [{
    type: String,
    enum: ['user', 'manager', 'admin']
  }],

  // Signed URL for temporary access (S3/Azure)
  signedUrl: String,
  signedUrlExpiresAt: Date,

  // Metadata
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed,

  // Virus scan results (if enabled)
  scanStatus: {
    type: String,
    enum: ['pending', 'clean', 'infected', 'error'],
    default: 'pending'
  },
  scanResult: String,

  // Download tracking
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloadedAt: Date,

  // Expiration
  expiresAt: Date,

  // Metadata
  uploadedBy: {
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
uploadSchema.index({ uploadedBy: 1, createdAt: -1 });
uploadSchema.index({ 'relatedEntity.entityType': 1, 'relatedEntity.entityId': 1 });
uploadSchema.index({ category: 1 });
uploadSchema.index({ fileType: 1 });
uploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('Upload', uploadSchema);
