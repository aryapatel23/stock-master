const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true,
    default: null
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  uom: {
    type: String,
    required: [true, 'Unit of measure is required'],
    trim: true,
    uppercase: true,
    default: 'PCS'
  },
  defaultWarehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    default: null
  },
  attributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Stock tracking fields
  totalOnHand: {
    type: Number,
    default: 0,
    min: 0
  },
  totalReserved: {
    type: Number,
    default: 0,
    min: 0
  },
  reorderLevel: {
    type: Number,
    default: 0,
    min: 0
  },
  // Pricing (optional)
  price: {
    type: Number,
    default: 0,
    min: 0
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  // Status
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

// Indexes for search and filtering
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ sku: 1 });
productSchema.index({ categoryId: 1 });
productSchema.index({ isDeleted: 1 });

// Virtual for available quantity
productSchema.virtual('availableQty').get(function() {
  return this.totalOnHand - this.totalReserved;
});

// Virtual for low stock check
productSchema.virtual('isLowStock').get(function() {
  return this.totalOnHand <= this.reorderLevel;
});

// Method to get public JSON
productSchema.methods.toPublicJSON = function() {
  return {
    _id: this._id,
    name: this.name,
    sku: this.sku,
    description: this.description,
    category: this.categoryId ? (this.categoryId.name ? { _id: this.categoryId._id, name: this.categoryId.name } : this.categoryId) : null,
    uom: this.uom,
    defaultWarehouseId: this.defaultWarehouseId,
    attributes: Object.fromEntries(this.attributes),
    totalStock: this.totalOnHand,
    totalOnHand: this.totalOnHand,
    totalReserved: this.totalReserved,
    availableQty: this.availableQty,
    reorderPoint: this.reorderLevel,
    reorderQuantity: this.reorderLevel,
    isLowStock: this.isLowStock,
    price: this.price,
    cost: this.cost,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Ensure virtuals are included in JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
