const StockLocation = require('../models/StockLocation');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Location = require('../models/Location');
const Reservation = require('../models/Reservation');

// @route   GET /api/stock
// @desc    Query stock across warehouses/locations
// @access  Private
const getStock = async (req, res) => {
  try {
    const { 
      productId, 
      sku, 
      warehouseId, 
      locationId, 
      availableOnly, 
      page = 1, 
      limit = 50 
    } = req.query;

    // Build query
    const query = {};

    if (productId) {
      query.productId = productId;
    }

    if (sku) {
      const product = await Product.findOne({ sku: sku.toUpperCase() });
      if (product) {
        query.productId = product._id;
      } else {
        return res.json({
          success: true,
          stock: [],
          meta: { total: 0, page: 1, limit: parseInt(limit), totalPages: 0 }
        });
      }
    }

    if (locationId) {
      query.locationId = locationId;
    } else if (warehouseId) {
      // Get all locations in this warehouse
      const locations = await Location.find({ warehouseId, isDeleted: false });
      query.locationId = { $in: locations.map(l => l._id) };
    }

    if (availableOnly === 'true') {
      query.$expr = { $gt: [{ $subtract: ['$quantity', '$reserved'] }, 0] };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await StockLocation.countDocuments(query);

    const stockData = await StockLocation.find(query)
      .populate('productId', 'name sku uom')
      .populate('locationId', 'code type warehouseId')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ productId: 1, locationId: 1 });

    // Format response
    const stock = await Promise.all(stockData.map(async (item) => {
      const warehouse = item.locationId?.warehouseId 
        ? await Warehouse.findById(item.locationId.warehouseId).select('name')
        : null;

      return {
        productId: item.productId?._id,
        productName: item.productId?.name,
        sku: item.productId?.sku,
        uom: item.productId?.uom,
        warehouseId: warehouse?._id,
        warehouseName: warehouse?.name,
        locationId: item.locationId?._id,
        locationCode: item.locationId?.code,
        qtyOnHand: item.quantity,
        qtyReserved: item.reserved,
        qtyAvailable: item.quantity - item.reserved
      };
    }));

    res.json({
      success: true,
      stock,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching stock',
      error: error.message
    });
  }
};

// @route   GET /api/stock/:productId
// @desc    Get detailed stock per location for a product
// @access  Private
const getStockByProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get all stock locations for this product
    const stockData = await StockLocation.find({ productId: req.params.productId })
      .populate('locationId', 'code type warehouseId');

    // Get warehouse details
    const breakdown = await Promise.all(stockData.map(async (item) => {
      const warehouse = item.locationId?.warehouseId 
        ? await Warehouse.findById(item.locationId.warehouseId).select('name')
        : null;

      return {
        locationId: item.locationId?._id,
        locationCode: item.locationId?.code,
        locationType: item.locationId?.type,
        warehouseId: warehouse?._id,
        warehouseName: warehouse?.name,
        qtyOnHand: item.quantity,
        qtyReserved: item.reserved,
        qtyAvailable: item.quantity - item.reserved
      };
    }));

    res.json({
      success: true,
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      uom: product.uom,
      totalOnHand: product.totalOnHand,
      totalReserved: product.totalReserved,
      totalAvailable: product.totalOnHand - product.totalReserved,
      breakdown
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product stock',
      error: error.message
    });
  }
};

// @route   GET /api/stock/availability
// @desc    Check stock availability across warehouses
// @access  Private
const checkAvailability = async (req, res) => {
  try {
    const { productId, qty } = req.query;

    if (!productId || !qty) {
      return res.status(400).json({
        success: false,
        message: 'productId and qty are required'
      });
    }

    const requestedQty = parseInt(qty);

    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get all stock locations for this product
    const stockData = await StockLocation.find({ productId })
      .populate('locationId', 'code warehouseId');

    const availableByWarehouse = [];
    const warehouseMap = new Map();

    for (const item of stockData) {
      const available = item.quantity - item.reserved;
      if (available > 0 && item.locationId?.warehouseId) {
        const warehouseId = item.locationId.warehouseId.toString();
        
        if (!warehouseMap.has(warehouseId)) {
          const warehouse = await Warehouse.findById(warehouseId).select('name');
          warehouseMap.set(warehouseId, {
            warehouseId,
            warehouseName: warehouse?.name,
            totalAvailable: 0,
            locations: []
          });
        }

        const whData = warehouseMap.get(warehouseId);
        whData.totalAvailable += available;
        whData.locations.push({
          locationId: item.locationId._id,
          locationCode: item.locationId.code,
          available
        });
      }
    }

    availableByWarehouse.push(...warehouseMap.values());

    // Sort by available quantity (descending)
    availableByWarehouse.sort((a, b) => b.totalAvailable - a.totalAvailable);

    const totalAvailable = product.totalOnHand - product.totalReserved;
    const isAvailable = totalAvailable >= requestedQty;

    // Suggest fulfillment strategy
    const fulfillmentOptions = [];
    let remaining = requestedQty;

    for (const wh of availableByWarehouse) {
      if (remaining <= 0) break;

      if (wh.totalAvailable >= remaining) {
        fulfillmentOptions.push({
          warehouseId: wh.warehouseId,
          warehouseName: wh.warehouseName,
          qty: remaining,
          canFulfillFully: true
        });
        remaining = 0;
      } else if (wh.totalAvailable > 0) {
        fulfillmentOptions.push({
          warehouseId: wh.warehouseId,
          warehouseName: wh.warehouseName,
          qty: wh.totalAvailable,
          canFulfillFully: false
        });
        remaining -= wh.totalAvailable;
      }
    }

    res.json({
      success: true,
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      requestedQty,
      totalAvailable,
      isAvailable,
      shortfall: isAvailable ? 0 : remaining,
      availableByWarehouse,
      fulfillmentOptions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking availability',
      error: error.message
    });
  }
};

module.exports = {
  getStock,
  getStockByProduct,
  checkAvailability
};
