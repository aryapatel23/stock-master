const mongoose = require('mongoose');

const stockLocationSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reserved: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Compound index for unique product-location combination
stockLocationSchema.index({ productId: 1, locationId: 1 }, { unique: true });

module.exports = mongoose.model('StockLocation', stockLocationSchema);
