const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, 'Warehouse ID is required']
  },
  code: {
    type: String,
    required: [true, 'Location code is required'],
    trim: true,
    uppercase: true
  },
  type: {
    type: String,
    enum: ['rack', 'bin', 'shelf', 'zone', 'other'],
    default: 'rack'
  },
  capacity: {
    type: Number,
    default: 0,
    min: 0
  },
  currentQty: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Compound unique index for warehouse + code
locationSchema.index({ warehouseId: 1, code: 1 }, { unique: true });

// Virtual for available capacity
locationSchema.virtual('availableCapacity').get(function() {
  return this.capacity - this.currentQty;
});

// Method to get public JSON
locationSchema.methods.toPublicJSON = function() {
  return {
    id: this._id,
    warehouseId: this.warehouseId,
    code: this.code,
    type: this.type,
    capacity: this.capacity,
    currentQty: this.currentQty,
    availableCapacity: this.availableCapacity,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Ensure virtuals are included in JSON
locationSchema.set('toJSON', { virtuals: true });
locationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Location', locationSchema);
