const mongoose = require('mongoose');

const adjustmentLineSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  sku: {
    type: String,
    trim: true
  },
  systemQty: {
    type: Number,
    required: true,
    min: 0
  },
  countedQty: {
    type: Number,
    required: true,
    min: 0
  },
  variance: {
    type: Number,
    default: 0
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

const adjustmentEventSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['created', 'applied', 'canceled']
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

const adjustmentSchema = new mongoose.Schema({
  adjustmentNumber: {
    type: String,
    unique: true,
    trim: true
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'applied', 'canceled'],
    default: 'draft'
  },
  reason: {
    type: String,
    required: true,
    enum: ['physical_count', 'damaged', 'lost', 'found', 'expired', 'other']
  },
  lines: [adjustmentLineSchema],
  totalSystemQty: {
    type: Number,
    default: 0
  },
  totalCountedQty: {
    type: Number,
    default: 0
  },
  totalVariance: {
    type: Number,
    default: 0
  },
  adjustmentDate: {
    type: Date,
    default: Date.now
  },
  appliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  appliedAt: {
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
  events: [adjustmentEventSchema],
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
adjustmentSchema.index({ status: 1, createdAt: -1 });
adjustmentSchema.index({ warehouseId: 1, status: 1 });
adjustmentSchema.index({ reason: 1, status: 1 });
adjustmentSchema.index({ adjustmentNumber: 1 });

// Generate adjustment number before saving
adjustmentSchema.pre('save', async function(next) {
  if (this.isNew && !this.adjustmentNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Find last adjustment number for this month
    const lastAdjustment = await this.constructor.findOne({
      adjustmentNumber: new RegExp(`^ADJ-${year}${month}`)
    }).sort({ adjustmentNumber: -1 });
    
    let sequence = 1;
    if (lastAdjustment && lastAdjustment.adjustmentNumber) {
      const lastSeq = parseInt(lastAdjustment.adjustmentNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }
    
    this.adjustmentNumber = `ADJ-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }
  next();
});

// Calculate variance and totals before saving
adjustmentSchema.pre('save', function(next) {
  if (this.lines && this.lines.length > 0) {
    // Calculate variance for each line
    this.lines.forEach(line => {
      line.variance = line.countedQty - line.systemQty;
    });

    // Calculate totals
    this.totalSystemQty = this.lines.reduce((sum, line) => sum + line.systemQty, 0);
    this.totalCountedQty = this.lines.reduce((sum, line) => sum + line.countedQty, 0);
    this.totalVariance = this.lines.reduce((sum, line) => sum + line.variance, 0);
  }
  next();
});

// Add event helper
adjustmentSchema.methods.addEvent = function(type, userId, notes, status) {
  this.events.push({
    type,
    status: status || this.status,
    userId,
    notes,
    timestamp: new Date()
  });
};

// Check if adjustment can be edited
adjustmentSchema.methods.canEdit = function() {
  return this.status === 'draft';
};

// Check if adjustment can be applied
adjustmentSchema.methods.canApply = function() {
  return this.status === 'draft';
};

// Check if adjustment can be canceled
adjustmentSchema.methods.canCancel = function() {
  return this.status === 'draft';
};

// Public JSON representation
adjustmentSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    adjustmentNumber: this.adjustmentNumber,
    warehouseId: this.warehouseId,
    status: this.status,
    reason: this.reason,
    lines: this.lines,
    totalSystemQty: this.totalSystemQty,
    totalCountedQty: this.totalCountedQty,
    totalVariance: this.totalVariance,
    adjustmentDate: this.adjustmentDate,
    appliedBy: this.appliedBy,
    appliedAt: this.appliedAt,
    notes: this.notes,
    events: this.events,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

module.exports = mongoose.model('Adjustment', adjustmentSchema);
