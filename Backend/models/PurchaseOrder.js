const mongoose = require('mongoose');

const purchaseOrderLineSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sku: {
    type: String,
    trim: true
  },
  orderedQty: {
    type: Number,
    required: true,
    min: 1
  },
  receivedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  unitPrice: {
    type: Number,
    min: 0
  },
  totalPrice: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  }
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    unique: true,
    trim: true
  },
  
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
    index: true
  },
  
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'ordered', 'partial_received', 'received', 'canceled'],
    default: 'draft',
    index: true
  },
  
  orderDate: {
    type: Date,
    default: Date.now
  },
  
  expectedDeliveryDate: {
    type: Date
  },
  
  actualDeliveryDate: {
    type: Date
  },
  
  lines: [purchaseOrderLineSchema],
  
  totalOrderedQty: {
    type: Number,
    default: 0
  },
  
  totalReceivedQty: {
    type: Number,
    default: 0
  },
  
  subtotal: {
    type: Number,
    default: 0
  },
  
  tax: {
    type: Number,
    default: 0
  },
  
  shipping: {
    type: Number,
    default: 0
  },
  
  total: {
    type: Number,
    default: 0
  },
  
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  paymentTerms: {
    type: String,
    trim: true
  },
  
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  notes: {
    type: String,
    trim: true
  },
  
  internalNotes: {
    type: String,
    trim: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: {
    type: Date
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Generate PO number
purchaseOrderSchema.pre('save', async function(next) {
  if (!this.poNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const lastPO = await mongoose.model('PurchaseOrder').findOne({
      poNumber: new RegExp(`^PO-${year}${month}-`)
    }).sort({ poNumber: -1 });
    
    let sequence = 1;
    if (lastPO && lastPO.poNumber) {
      const lastSequence = parseInt(lastPO.poNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.poNumber = `PO-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }
  
  // Calculate totals
  this.totalOrderedQty = this.lines.reduce((sum, line) => sum + line.orderedQty, 0);
  this.totalReceivedQty = this.lines.reduce((sum, line) => sum + line.receivedQty, 0);
  
  // Calculate line totals
  this.lines.forEach(line => {
    if (line.unitPrice) {
      line.totalPrice = line.unitPrice * line.orderedQty;
    }
  });
  
  // Calculate financial totals
  this.subtotal = this.lines.reduce((sum, line) => sum + (line.totalPrice || 0), 0);
  this.total = this.subtotal + (this.tax || 0) + (this.shipping || 0);
  
  next();
});

// Indexes
purchaseOrderSchema.index({ status: 1, warehouseId: 1 });
purchaseOrderSchema.index({ supplierId: 1, status: 1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

module.exports = PurchaseOrder;
