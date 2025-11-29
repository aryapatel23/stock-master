const mongoose = require('mongoose');

const pickingLineSchema = new mongoose.Schema({
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
  requestedQty: {
    type: Number,
    required: true,
    min: 0
  },
  pickedQty: {
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

const pickingTaskSchema = new mongoose.Schema({
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
  
  lines: [pickingLineSchema],
  
  totalRequestedQty: {
    type: Number,
    default: 0
  },
  
  totalPickedQty: {
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

// Generate picking task number
pickingTaskSchema.pre('save', async function(next) {
  if (!this.taskNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    const lastTask = await mongoose.model('PickingTask').findOne({
      taskNumber: new RegExp(`^PICK-${year}${month}-`)
    }).sort({ taskNumber: -1 });
    
    let sequence = 1;
    if (lastTask && lastTask.taskNumber) {
      const lastSequence = parseInt(lastTask.taskNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.taskNumber = `PICK-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }
  
  // Calculate totals
  this.totalRequestedQty = this.lines.reduce((sum, line) => sum + line.requestedQty, 0);
  this.totalPickedQty = this.lines.reduce((sum, line) => sum + line.pickedQty, 0);
  
  next();
});

// Indexes
pickingTaskSchema.index({ status: 1, warehouseId: 1 });
pickingTaskSchema.index({ assignedTo: 1, status: 1 });
pickingTaskSchema.index({ deliveryOrderId: 1 });

// Helper methods
pickingTaskSchema.methods.canStart = function() {
  return this.status === 'pending';
};

pickingTaskSchema.methods.canComplete = function() {
  return this.status === 'in_progress';
};

pickingTaskSchema.methods.canCancel = function() {
  return ['pending', 'in_progress'].includes(this.status);
};

const PickingTask = mongoose.model('PickingTask', pickingTaskSchema);

module.exports = PickingTask;
