const StockLocation = require('../models/StockLocation');
const Product = require('../models/Product');
const Location = require('../models/Location');

// @route   POST /api/stock/adjust
// @desc    Adjust stock quantity at a location (for testing/initial setup)
// @access  Private
const adjustStock = async (req, res) => {
  try {
    const { productId, locationId, quantity, type } = req.body;

    // type: 'set' (set to value) or 'add' (add to existing)
    const adjustType = type || 'add';

    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const location = await Location.findById(locationId);
    if (!location || location.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Find or create stock location
    let stockLoc = await StockLocation.findOne({ productId, locationId });

    if (!stockLoc) {
      stockLoc = await StockLocation.create({
        productId,
        locationId,
        quantity: 0,
        reserved: 0
      });
    }

    const oldQty = stockLoc.quantity;

    if (adjustType === 'set') {
      stockLoc.quantity = quantity;
    } else {
      stockLoc.quantity += quantity;
    }

    if (stockLoc.quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity cannot be negative'
      });
    }

    await stockLoc.save();

    // Update location current quantity
    location.currentQty = await StockLocation.aggregate([
      { $match: { locationId: location._id } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]).then(result => result[0]?.total || 0);
    await location.save();

    // Update product total on hand
    product.totalOnHand = await StockLocation.aggregate([
      { $match: { productId: product._id } },
      { $group: { _id: null, total: { $sum: '$quantity' } } }
    ]).then(result => result[0]?.total || 0);
    await product.save();

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      stock: {
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        locationId: location._id,
        locationCode: location.code,
        oldQuantity: oldQty,
        newQuantity: stockLoc.quantity,
        change: stockLoc.quantity - oldQty
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adjusting stock',
      error: error.message
    });
  }
};

module.exports = {
  adjustStock
};
