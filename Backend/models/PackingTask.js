const mongoose = require('mongoose');

const packingLineSchema = new mongoose.Schema({
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
    min: 0
  },
  packedQty: {
    type: Number,
    default: 0,
    min: 0
  },
  uom: {
    type: String,
    default: 'unit'
  },
  notes: {
    type: String,
    trim: true
  }
});

const packingTaskSchema = new mongoose.Schema({
  taskNumber: {
    type: String,
    unique: true,
    trim: true
  },
  
  deliveryOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryOrder',
    required: true,
    index: true
  },
  
  pickingTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PickingTask',
    index: true
  },
  
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
    index: true
  },
  
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'canceled'],
    default: 'pending',
    index: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  lines: [packingLineSchema],
  
  totalRequestedQty: {
    type: Number,
    default: 0
  },
  
  totalPackedQty: {
    type: Number,
    default: 0
  },
  
  numberOfBoxes: {
    type: Number,
    default: 0
  },
  
  totalWeight: {
    type: Number,
    default: 0
  },
  
  startedAt: {
    type: Date
  },
  
  completedAt: {
    type: Date
  },
  
  notes: {
    type: String,
    trim: true
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

// Generate packing task number
packingTaskSchema.pre('save', async function(next) {
  if (!this.taskNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const lastTask = await mongoose.model('PackingTask').findOne({
      taskNumber: new RegExp(`^PACK-${year}${month}-`)
    }).sort({ taskNumber: -1 });
    
    let sequence = 1;
    if (lastTask && lastTask.taskNumber) {
      const lastSequence = parseInt(lastTask.taskNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.taskNumber = `PACK-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }
  
  // Calculate totals
  this.totalRequestedQty = this.lines.reduce((sum, line) => sum + line.requestedQty, 0);
  this.totalPackedQty = this.lines.reduce((sum, line) => sum + line.packedQty, 0);
  
  next();
});

// Indexes
packingTaskSchema.index({ status: 1, warehouseId: 1 });
packingTaskSchema.index({ assignedTo: 1, status: 1 });
packingTaskSchema.index({ deliveryOrderId: 1 });
packingTaskSchema.index({ pickingTaskId: 1 });

// Helper methods
packingTaskSchema.methods.canStart = function() {
  return this.status === 'pending';
};

packingTaskSchema.methods.canComplete = function() {
  return this.status === 'in_progress';
};

packingTaskSchema.methods.canCancel = function() {
  return ['pending', 'in_progress'].includes(this.status);
};

const PackingTask = mongoose.model('PackingTask', packingTaskSchema);

module.exports = PackingTask;
