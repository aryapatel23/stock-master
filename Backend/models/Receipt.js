const mongoose = require('mongoose');

const receiptLineSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sku: {
    type: String,
    trim: true
  },
  expectedQty: {
    type: Number,
    required: true,
    min: 0
  },
  receivedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  uom: {
    type: String,
    default: 'unit',
    trim: true
  },
  unitPrice: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: true });

const receiptEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['created', 'status_changed', 'qty_updated', 'validated', 'canceled', 'edited'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'waiting', 'ready', 'done', 'canceled']
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const receiptSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    unique: true,
    trim: true
  },
  referenceNumber: {
    type: String,
    trim: true,
    index: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    index: true
  },
  supplierName: {
    type: String,
    trim: true
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'waiting', 'ready', 'done', 'canceled'],
    default: 'draft',
    index: true
  },
  expectedDate: {
    type: Date,
    index: true
  },
  receivedDate: {
    type: Date
  },
  lines: [receiptLineSchema],
  
  totalExpectedQty: {
    type: Number,
    default: 0
  },
  totalReceivedQty: {
    type: Number,
    default: 0
  },
  
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  events: [receiptEventSchema],
  
  validatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  validatedAt: {
    type: Date
  },
  idempotencyKey: {
    type: String,
    sparse: true,
    unique: true
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

// Generate receipt number before saving
receiptSchema.pre('save', async function(next) {
  if (this.isNew && !this.receiptNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Find last receipt number for this month
    const lastReceipt = await this.constructor.findOne({
      receiptNumber: new RegExp(`^RCP-${year}${month}`)
    }).sort({ receiptNumber: -1 });
    
    let sequence = 1;
    if (lastReceipt && lastReceipt.receiptNumber) {
      const lastSeq = parseInt(lastReceipt.receiptNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }
    
    this.receiptNumber = `RCP-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }
  next();
});

// Calculate totals before saving
receiptSchema.pre('save', function(next) {
  if (this.lines && this.lines.length > 0) {
    this.totalExpectedQty = this.lines.reduce((sum, line) => sum + line.expectedQty, 0);
    this.totalReceivedQty = this.lines.reduce((sum, line) => sum + line.receivedQty, 0);
  }
  next();
});

// Add event helper
receiptSchema.methods.addEvent = function(type, userId, notes, status) {
  this.events.push({
    type,
    status: status || this.status,
    userId,
    notes,
    timestamp: new Date()
  });
};

// Check if receipt can be edited
receiptSchema.methods.canEdit = function() {
  return ['draft', 'waiting'].includes(this.status);
};

// Check if receipt can be validated
receiptSchema.methods.canValidate = function() {
  return ['ready'].includes(this.status) && this.totalReceivedQty > 0;
};

// Public JSON
receiptSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    receiptNumber: this.receiptNumber,
    referenceNumber: this.referenceNumber,
    supplierId: this.supplierId,
    supplierName: this.supplierName,
    warehouseId: this.warehouseId,
    status: this.status,
    expectedDate: this.expectedDate,
    receivedDate: this.receivedDate,
    lines: this.lines,
    totalExpectedQty: this.totalExpectedQty,
    totalReceivedQty: this.totalReceivedQty,
    attachments: this.attachments,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const Receipt = mongoose.model('Receipt', receiptSchema);

module.exports = Receipt;
