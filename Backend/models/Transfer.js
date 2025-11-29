const mongoose = require('mongoose');

const transferLineSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sku: {
    type: String,
    trim: true
  },
  requestedQty: {
    type: Number,
    required: true,
    min: 1
  },
  transferredQty: {
    type: Number,
    default: 0,
    min: 0
  },
  uom: {
    type: String,
    default: 'unit',
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: true });

const transferEventSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['created', 'submitted', 'in_transit', 'executed', 'canceled']
  },
  status: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const transferSchema = new mongoose.Schema({
  transferNumber: {
    type: String,
    unique: true,
    trim: true
  },
  fromLocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  toLocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  fromWarehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  toWarehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'in_transit', 'completed', 'canceled'],
    default: 'draft'
  },
  lines: [transferLineSchema],
  totalRequestedQty: {
    type: Number,
    default: 0
  },
  totalTransferredQty: {
    type: Number,
    default: 0
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedDate: {
    type: Date,
    default: Date.now
  },
  executedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  executedAt: {
    type: Date
  },
  expectedDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  events: [transferEventSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

// Indexes
transferSchema.index({ status: 1, createdAt: -1 });
transferSchema.index({ fromLocationId: 1, status: 1 });
transferSchema.index({ toLocationId: 1, status: 1 });
transferSchema.index({ fromWarehouseId: 1, status: 1 });
transferSchema.index({ toWarehouseId: 1, status: 1 });
transferSchema.index({ transferNumber: 1 });

// Generate transfer number before saving
transferSchema.pre('save', async function(next) {
  if (this.isNew && !this.transferNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Find last transfer number for this month
    const lastTransfer = await this.constructor.findOne({
      transferNumber: new RegExp(`^TRF-${year}${month}`)
    }).sort({ transferNumber: -1 });
    
    let sequence = 1;
    if (lastTransfer && lastTransfer.transferNumber) {
      const lastSeq = parseInt(lastTransfer.transferNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }
    
    this.transferNumber = `TRF-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }
  next();
});

// Calculate totals before saving
transferSchema.pre('save', function(next) {
  if (this.lines && this.lines.length > 0) {
    this.totalRequestedQty = this.lines.reduce((sum, line) => sum + line.requestedQty, 0);
    this.totalTransferredQty = this.lines.reduce((sum, line) => sum + line.transferredQty, 0);
  }
  next();
});

// Add event helper
transferSchema.methods.addEvent = function(type, userId, notes, status) {
  this.events.push({
    type,
    status: status || this.status,
    userId,
    notes,
    timestamp: new Date()
  });
};

// Check if transfer can be edited
transferSchema.methods.canEdit = function() {
  return ['draft', 'pending'].includes(this.status);
};

// Check if transfer can be executed
transferSchema.methods.canExecute = function() {
  return ['pending', 'in_transit'].includes(this.status);
};

// Check if transfer can be canceled
transferSchema.methods.canCancel = function() {
  return ['draft', 'pending', 'in_transit'].includes(this.status);
};

// Validation: fromLocation and toLocation must be different
transferSchema.pre('save', function(next) {
  if (this.fromLocationId && this.toLocationId && 
      this.fromLocationId.toString() === this.toLocationId.toString()) {
    return next(new Error('Source and destination locations must be different'));
  }
  next();
});

// Public JSON representation
transferSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    transferNumber: this.transferNumber,
    fromLocationId: this.fromLocationId,
    toLocationId: this.toLocationId,
    fromWarehouseId: this.fromWarehouseId,
    toWarehouseId: this.toWarehouseId,
    status: this.status,
    lines: this.lines,
    totalRequestedQty: this.totalRequestedQty,
    totalTransferredQty: this.totalTransferredQty,
    requestedBy: this.requestedBy,
    requestedDate: this.requestedDate,
    executedBy: this.executedBy,
    executedAt: this.executedAt,
    expectedDate: this.expectedDate,
    notes: this.notes,
    events: this.events,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Transfer', transferSchema);
