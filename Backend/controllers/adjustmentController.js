const Adjustment = require('../models/Adjustment');
const Warehouse = require('../models/Warehouse');
const Location = require('../models/Location');
const Product = require('../models/Product');
const StockLocation = require('../models/StockLocation');
const InventoryLedger = require('../models/InventoryLedger');

// @route   GET /api/adjustments
// @desc    List adjustments with filters
// @access  Private
const getAdjustments = async (req, res) => {
  try {
    const {
      status,
      reason,
      warehouseId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    const query = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    if (reason) {
      query.reason = reason;
    }

    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    if (dateFrom || dateTo) {
      query.adjustmentDate = {};
      if (dateFrom) {
        query.adjustmentDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.adjustmentDate.$lte = new Date(dateTo);
      }
    }

    const adjustments = await Adjustment.find(query)
      .populate('warehouseId', 'name code address')
      .populate('createdBy', 'name email')
      .populate('appliedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Adjustment.countDocuments(query);

    res.json({
      success: true,
      adjustments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching adjustments',
      error: error.message
    });
  }
};

// @route   POST /api/adjustments
// @desc    Create adjustment (draft)
// @access  Private
const createAdjustment = async (req, res) => {
  try {
    const {
      reason,
      warehouseId,
      lines,
      notes
    } = req.body;

    // Validate warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse || warehouse.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Validate and enrich lines
    for (const line of lines) {
      // Validate product
      const product = await Product.findById(line.productId);
      if (!product || product.isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${line.productId}`
        });
      }

      // Auto-fill SKU
      if (!line.sku) {
        line.sku = product.sku;
      }

      // Validate location
      const location = await Location.findById(line.locationId);
      if (!location || location.isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Location not found: ${line.locationId}`
        });
      }

      // Check if location belongs to warehouse
      if (location.warehouseId.toString() !== warehouseId) {
        return res.status(400).json({
          success: false,
          message: `Location ${location.code} does not belong to selected warehouse`
        });
      }

      // Get current system quantity
      const stockLoc = await StockLocation.findOne({
        productId: line.productId,
        locationId: line.locationId
      });

      // Set systemQty if not provided
      if (line.systemQty === undefined || line.systemQty === null) {
        line.systemQty = stockLoc ? stockLoc.quantity : 0;
      }
    }

    const adjustment = await Adjustment.create({
      reason,
      warehouseId,
      lines,
      notes,
      status: 'draft',
      createdBy: req.user._id
    });

    adjustment.addEvent('created', req.user._id, 'Adjustment created', 'draft');
    await adjustment.save();

    res.status(201).json({
      success: true,
      message: 'Adjustment created successfully',
      adjustment: adjustment.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating adjustment',
      error: error.message
    });
  }
};

// @route   GET /api/adjustments/:id
// @desc    Get adjustment by ID
// @access  Private
const getAdjustmentById = async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id)
      .populate('warehouseId', 'name code address')
      .populate('lines.productId', 'name sku uom totalOnHand')
      .populate('lines.locationId', 'code type capacity currentQty')
      .populate('createdBy', 'name email')
      .populate('appliedBy', 'name email')
      .populate('events.userId', 'name email');

    if (!adjustment || adjustment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found'
      });
    }

    res.json({
      success: true,
      adjustment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching adjustment',
      error: error.message
    });
  }
};

// @route   POST /api/adjustments/:id/apply
// @desc    Apply adjustment - reconcile stock and create ledger entries
// @access  Private
const applyAdjustment = async (req, res) => {
  try {
    const { idempotencyKey, notes } = req.body;

    // Check idempotency FIRST
    if (idempotencyKey) {
      const existing = await Adjustment.findOne({ idempotencyKey });
      if (existing) {
        return res.json({
          success: true,
          message: 'Adjustment already applied (idempotent)',
          adjustment: existing.toPublicJSON(),
          isExisting: true
        });
      }
    }

    const adjustment = await Adjustment.findById(req.params.id);

    if (!adjustment || adjustment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found'
      });
    }

    if (adjustment.status === 'applied') {
      return res.status(400).json({
        success: false,
        message: 'Adjustment already applied'
      });
    }

    if (!adjustment.canApply()) {
      return res.status(400).json({
        success: false,
        message: `Cannot apply adjustment in ${adjustment.status} status`
      });
    }

    // Set idempotency key if provided
    if (idempotencyKey) {
      adjustment.idempotencyKey = idempotencyKey;
    }

    const ledgerEntries = [];

    // Process each line - reconcile stock
    for (const line of adjustment.lines) {
      const product = await Product.findById(line.productId);

      // Find or create stock location
      let stockLoc = await StockLocation.findOne({
        productId: line.productId,
        locationId: line.locationId
      });

      const balanceBefore = stockLoc ? stockLoc.quantity : 0;

      if (!stockLoc) {
        // Create new stock location if doesn't exist
        stockLoc = await StockLocation.create({
          productId: line.productId,
          locationId: line.locationId,
          quantity: line.countedQty,
          reserved: 0
        });
      } else {
        // Update existing stock location
        stockLoc.quantity = line.countedQty;
        await stockLoc.save();
      }

      // Create ledger entry for the adjustment
      const ledgerEntry = await InventoryLedger.create({
        productId: line.productId,
        locationId: line.locationId,
        warehouseId: adjustment.warehouseId,
        transactionType: 'adjustment',
        referenceType: 'adjustment',
        referenceId: adjustment._id,
        referenceNumber: adjustment.adjustmentNumber,
        quantity: line.variance,
        balanceBefore,
        balanceAfter: stockLoc.quantity,
        createdBy: req.user._id,
        transactionDate: new Date(),
        notes: `${adjustment.reason}: ${line.notes || ''}`
      });

      ledgerEntries.push(ledgerEntry);

      // Update product total on hand
      product.totalOnHand += line.variance;
      await product.save();

      // Update location current quantity
      const locationTotal = await StockLocation.aggregate([
        { $match: { locationId: line.locationId } },
        { $group: { _id: null, total: { $sum: '$quantity' } } }
      ]);

      const location = await Location.findById(line.locationId);
      if (location) {
        location.currentQty = locationTotal[0]?.total || 0;
        await location.save();
      }
    }

    // Update adjustment status
    adjustment.status = 'applied';
    adjustment.appliedBy = req.user._id;
    adjustment.appliedAt = new Date();
    adjustment.addEvent('applied', req.user._id, notes || 'Adjustment applied', 'applied');

    await adjustment.save();

    res.json({
      success: true,
      message: 'Adjustment applied successfully',
      adjustment: adjustment.toPublicJSON(),
      ledgerEntries: ledgerEntries.length,
      summary: {
        adjustmentNumber: adjustment.adjustmentNumber,
        reason: adjustment.reason,
        itemsAdjusted: adjustment.lines.length,
        totalVariance: adjustment.totalVariance,
        appliedAt: adjustment.appliedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error applying adjustment',
      error: error.message
    });
  }
};

// @route   POST /api/adjustments/:id/cancel
// @desc    Cancel adjustment
// @access  Private
const cancelAdjustment = async (req, res) => {
  try {
    const adjustment = await Adjustment.findById(req.params.id);

    if (!adjustment || adjustment.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Adjustment not found'
      });
    }

    if (adjustment.status === 'canceled') {
      return res.status(400).json({
        success: false,
        message: 'Adjustment already canceled'
      });
    }

    if (adjustment.status === 'applied') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel applied adjustment'
      });
    }

    if (!adjustment.canCancel()) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel adjustment in ${adjustment.status} status`
      });
    }

    const { notes } = req.body;

    adjustment.status = 'canceled';
    adjustment.addEvent('canceled', req.user._id, notes || 'Adjustment canceled', 'canceled');
    adjustment.updatedBy = req.user._id;

    await adjustment.save();

    res.json({
      success: true,
      message: 'Adjustment canceled successfully',
      adjustment: adjustment.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error canceling adjustment',
      error: error.message
    });
  }
};

module.exports = {
  getAdjustments,
  createAdjustment,
  getAdjustmentById,
  applyAdjustment,
  cancelAdjustment
};
