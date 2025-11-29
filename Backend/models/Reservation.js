const mongoose = require('mongoose');

const reservationLineSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    default: null
  },
  qty: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false });

const reservationSchema = new mongoose.Schema({
  referenceType: {
    type: String,
    required: true,
    enum: ['delivery_order', 'transfer', 'pick', 'other']
  },
  referenceId: {
    type: String,
    required: true,
    trim: true
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  lines: [reservationLineSchema],
  status: {
    type: String,
    enum: ['active', 'released', 'expired'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  releasedAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Compound index for reference lookup
reservationSchema.index({ referenceType: 1, referenceId: 1 });
reservationSchema.index({ status: 1, expiresAt: 1 });

// Auto-expire reservations using TTL index
reservationSchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { status: 'active' }
});

module.exports = mongoose.model('Reservation', reservationSchema);
