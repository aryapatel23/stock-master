const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['low_stock', 'out_of_stock', 'backorder', 'expiring', 'reorder_needed', 'overstock'],
    required: true,
    index: true
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    index: true
  },
  
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    index: true
  },
  
  currentQty: {
    type: Number,
    default: 0
  },
  
  thresholdQty: {
    type: Number
  },
  
  reorderRuleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ReorderRule',
    index: true
  },
  
  message: {
    type: String,
    required: true,
    trim: true
  },
  
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  resolvedAt: {
    type: Date
  },
  
  resolutionNotes: {
    type: String,
    trim: true
  },
  
  expiryDate: {
    type: Date
  },
  
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
alertSchema.index({ type: 1, resolved: 1 });
alertSchema.index({ severity: 1, resolved: 1 });
alertSchema.index({ productId: 1, warehouseId: 1, resolved: 1 });

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
