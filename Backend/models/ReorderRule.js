const mongoose = require('mongoose');

const reorderRuleSchema = new mongoose.Schema({
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
  
  minQty: {
    type: Number,
    required: true,
    min: 0
  },
  
  maxQty: {
    type: Number,
    min: 0
  },
  
  reorderQty: {
    type: Number,
    required: true,
    min: 1
  },
  
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  leadTimeDays: {
    type: Number,
    default: 7,
    min: 0
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  autoCreatePO: {
    type: Boolean,
    default: false
  },
  
  notes: {
    type: String,
    trim: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  updatedBy: {
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

// Compound index for unique rule per product/warehouse
reorderRuleSchema.index({ productId: 1, warehouseId: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// Validate that maxQty > minQty if maxQty is provided
reorderRuleSchema.pre('save', function(next) {
  if (this.maxQty && this.maxQty <= this.minQty) {
    return next(new Error('maxQty must be greater than minQty'));
  }
  next();
});

const ReorderRule = mongoose.model('ReorderRule', reorderRuleSchema);

module.exports = ReorderRule;
