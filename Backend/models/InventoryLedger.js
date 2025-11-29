const mongoose = require('mongoose');

const inventoryLedgerSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    index: true
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
    index: true
  },
  
  transactionType: {
    type: String,
    enum: ['receipt', 'adjustment', 'transfer_in', 'transfer_out', 'delivery', 'reversal', 'cycle_count'],
    required: true,
    index: true
  },
  
  referenceType: {
    type: String,
    enum: ['receipt', 'adjustment', 'transfer', 'delivery_order', 'reservation', 'cycle_count'],
    index: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  referenceNumber: {
    type: String,
    trim: true,
    index: true
  },
  
  quantity: {
    type: Number,
    required: true
  },
  
  balanceBefore: {
    type: Number,
    default: 0
  },
  balanceAfter: {
    type: Number,
    default: 0
  },
  
  unitPrice: {
    type: Number,
    min: 0
  },
  totalValue: {
    type: Number
  },
  
  notes: {
    type: String,
    trim: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  transactionDate: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
inventoryLedgerSchema.index({ productId: 1, warehouseId: 1, transactionDate: -1 });
inventoryLedgerSchema.index({ referenceType: 1, referenceId: 1 });

// Calculate total value before saving
inventoryLedgerSchema.pre('save', function(next) {
  if (this.unitPrice && this.quantity) {
    this.totalValue = this.unitPrice * Math.abs(this.quantity);
  }
  next();
});

const InventoryLedger = mongoose.model('InventoryLedger', inventoryLedgerSchema);

module.exports = InventoryLedger;
