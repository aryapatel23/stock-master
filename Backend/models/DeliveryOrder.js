const mongoose = require('mongoose');

const deliveryLineSchema = new mongoose.Schema({
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
    min: 0
  },
  reservedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  pickedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  packedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  shippedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
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

const packageSchema = new mongoose.Schema({
  packageId: {
    type: String,
    trim: true
  },
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      default: 'cm'
    }
  },
  trackingNumber: {
    type: String,
    trim: true
  },
  carrier: {
    type: String,
    trim: true
  },
  lines: [{
    lineId: mongoose.Schema.Types.ObjectId,
    qty: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const deliveryOrderEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['created', 'status_changed', 'reserved', 'picked', 'packed', 'validated', 'canceled', 'edited'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'waiting', 'picking', 'packed', 'ready', 'done', 'canceled']
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

const deliveryOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    index: true
  },
  customerName: {
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
    enum: ['draft', 'waiting', 'picking', 'packed', 'ready', 'done', 'canceled'],
    default: 'draft',
    index: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  
  promisedDate: {
    type: Date,
    index: true
  },
  shippedDate: {
    type: Date
  },
  
  lines: [deliveryLineSchema],
  packages: [packageSchema],
  
  totalOrderedQty: {
    type: Number,
    default: 0
  },
  totalReservedQty: {
    type: Number,
    default: 0
  },
  totalPickedQty: {
    type: Number,
    default: 0
  },
  totalPackedQty: {
    type: Number,
    default: 0
  },
  totalShippedQty: {
    type: Number,
    default: 0
  },
  
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  
  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation'
  },
  
  events: [deliveryOrderEventSchema],
  
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

// Generate order number before saving
deliveryOrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Find last order number for this month
    const lastOrder = await this.constructor.findOne({
      orderNumber: new RegExp(`^DO-${year}${month}`)
    }).sort({ orderNumber: -1 });
    
    let sequence = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const lastSeq = parseInt(lastOrder.orderNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }
    
    this.orderNumber = `DO-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }
  next();
});

// Calculate totals before saving
deliveryOrderSchema.pre('save', function(next) {
  if (this.lines && this.lines.length > 0) {
    this.totalOrderedQty = this.lines.reduce((sum, line) => sum + line.orderedQty, 0);
    this.totalReservedQty = this.lines.reduce((sum, line) => sum + line.reservedQty, 0);
    this.totalPickedQty = this.lines.reduce((sum, line) => sum + line.pickedQty, 0);
    this.totalPackedQty = this.lines.reduce((sum, line) => sum + line.packedQty, 0);
    this.totalShippedQty = this.lines.reduce((sum, line) => sum + line.shippedQty, 0);
  }
  next();
});

// Add event helper
deliveryOrderSchema.methods.addEvent = function(type, userId, notes, status) {
  this.events.push({
    type,
    status: status || this.status,
    userId,
    notes,
    timestamp: new Date()
  });
};

// Check if order can be edited
deliveryOrderSchema.methods.canEdit = function() {
  return ['draft', 'waiting'].includes(this.status);
};

// Check if order can be picked
deliveryOrderSchema.methods.canPick = function() {
  return ['draft', 'waiting', 'picking'].includes(this.status);
};

// Check if order can be packed
deliveryOrderSchema.methods.canPack = function() {
  return ['picking', 'packed'].includes(this.status);
};

// Check if order can be validated
deliveryOrderSchema.methods.canValidate = function() {
  return ['ready'].includes(this.status) && this.totalPackedQty > 0;
};

// Public JSON
deliveryOrderSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    orderNumber: this.orderNumber,
    customerId: this.customerId,
    customerName: this.customerName,
    warehouseId: this.warehouseId,
    status: this.status,
    priority: this.priority,
    promisedDate: this.promisedDate,
    shippedDate: this.shippedDate,
    lines: this.lines,
    packages: this.packages,
    totalOrderedQty: this.totalOrderedQty,
    totalReservedQty: this.totalReservedQty,
    totalPickedQty: this.totalPickedQty,
    totalPackedQty: this.totalPackedQty,
    totalShippedQty: this.totalShippedQty,
    shippingAddress: this.shippingAddress,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

const DeliveryOrder = mongoose.model('DeliveryOrder', deliveryOrderSchema);

module.exports = DeliveryOrder;
