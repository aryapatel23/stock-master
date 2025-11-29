const Transfer = require('../models/Transfer');
const Location = require('../models/Location');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const StockLocation = require('../models/StockLocation');
const InventoryLedger = require('../models/InventoryLedger');

// @route   GET /api/transfers
// @desc    List transfers with filters
// @access  Private
const getTransfers = async (req, res) => {
  try {
    const {
      status,
      fromWarehouse,
      toWarehouse,
      fromLocation,
      toLocation,
      page = 1,
      limit = 50
    } = req.query;

    const query = { isDeleted: false };

    if (status) {
      query.status = status;
    }

    if (fromWarehouse) {
      query.fromWarehouseId = fromWarehouse;
    }

    if (toWarehouse) {
      query.toWarehouseId = toWarehouse;
    }

    if (fromLocation) {
      query.fromLocationId = fromLocation;
    }

    if (toLocation) {
      query.toLocationId = toLocation;
    }

    const transfers = await Transfer.find(query)
      .populate('fromLocationId', 'code type warehouseId')
      .populate('toLocationId', 'code type warehouseId')
      .populate('fromWarehouseId', 'name code')
      .populate('toWarehouseId', 'name code')
      .populate('requestedBy', 'name email')
      .populate('executedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Transfer.countDocuments(query);

    res.json({
      success: true,
      transfers,
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
      message: 'Error fetching transfers',
      error: error.message
    });
  }
};

// @route   POST /api/transfers
// @desc    Create transfer request
// @access  Private
const createTransfer = async (req, res) => {
  try {
    const {
      fromLocationId,
      toLocationId,
      lines,
      expectedDate,
      notes
    } = req.body;

    // Validate from location
    const fromLocation = await Location.findById(fromLocationId);
    if (!fromLocation || fromLocation.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Source location not found'
      });
    }

    // Validate to location
    const toLocation = await Location.findById(toLocationId);
    if (!toLocation || toLocation.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Destination location not found'
      });
    }

    // Check if locations are different
    if (fromLocationId === toLocationId) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination locations must be different'
      });
    }

    // Get warehouses
    const fromWarehouse = await Warehouse.findById(fromLocation.warehouseId);
    const toWarehouse = await Warehouse.findById(toLocation.warehouseId);

    // Validate products and check stock availability
    for (const line of lines) {
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

      // Check stock availability at source location
      const stockLoc = await StockLocation.findOne({
        productId: line.productId,
        locationId: fromLocationId
      });

      if (!stockLoc) {
        return res.status(400).json({
          success: false,
          message: `No stock found for product ${product.sku} at source location`
        });
      }

      const available = stockLoc.quantity - stockLoc.reserved;
      if (available < line.requestedQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.sku}. Available: ${available}, Requested: ${line.requestedQty}`
        });
      }

      // Map requestedQty from qty if needed
      if (line.qty && !line.requestedQty) {
        line.requestedQty = line.qty;
      }
    }

    const transfer = await Transfer.create({
      fromLocationId,
      toLocationId,
      fromWarehouseId: fromLocation.warehouseId,
      toWarehouseId: toLocation.warehouseId,
      lines,
      expectedDate,
      notes,
      status: 'pending',
      requestedBy: req.user._id,
      createdBy: req.user._id
    });

    transfer.addEvent('created', req.user._id, 'Transfer request created', 'pending');
    await transfer.save();

    res.status(201).json({
      success: true,
      message: 'Transfer request created successfully',
      transfer: transfer.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating transfer',
      error: error.message
    });
  }
};

// @route   GET /api/transfers/:id
// @desc    Get transfer by ID
// @access  Private
const getTransferById = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id)
      .populate('fromLocationId', 'code type warehouseId capacity currentQty')
      .populate('toLocationId', 'code type warehouseId capacity currentQty')
      .populate('fromWarehouseId', 'name code address')
      .populate('toWarehouseId', 'name code address')
      .populate('lines.productId', 'name sku uom totalOnHand')
      .populate('requestedBy', 'name email')
      .populate('executedBy', 'name email')
      .populate('events.userId', 'name email');

    if (!transfer || transfer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    res.json({
      success: true,
      transfer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transfer',
      error: error.message
    });
  }
};

// @route   POST /api/transfers/:id/execute
// @desc    Execute transfer - move stock between locations
// @access  Private
const executeTransfer = async (req, res) => {
  try {
    const { idempotencyKey, notes } = req.body;

    // Check idempotency FIRST
    if (idempotencyKey) {
      const existing = await Transfer.findOne({ idempotencyKey });
      if (existing) {
        return res.json({
          success: true,
          message: 'Transfer already executed (idempotent)',
          transfer: existing.toPublicJSON(),
          isExisting: true
        });
      }
    }

    const transfer = await Transfer.findById(req.params.id);

    if (!transfer || transfer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    if (transfer.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Transfer already executed'
      });
    }

    if (!transfer.canExecute()) {
      return res.status(400).json({
        success: false,
        message: `Cannot execute transfer in ${transfer.status} status`
      });
    }

    // Set idempotency key if provided
    if (idempotencyKey) {
      transfer.idempotencyKey = idempotencyKey;
    }

    const ledgerEntries = [];

    // Process each line - move stock from source to destination
    for (const line of transfer.lines) {
      const product = await Product.findById(line.productId);

      // Find source stock location
      const fromStockLoc = await StockLocation.findOne({
        productId: line.productId,
        locationId: transfer.fromLocationId
      });

      if (!fromStockLoc) {
        return res.status(400).json({
          success: false,
          message: `No stock found for product ${product.sku} at source location`
        });
      }

      if (fromStockLoc.quantity < line.requestedQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.sku}. Available: ${fromStockLoc.quantity}, Requested: ${line.requestedQty}`
        });
      }

      const fromBalanceBefore = fromStockLoc.quantity;

      // Decrease from source location
      fromStockLoc.quantity -= line.requestedQty;
      await fromStockLoc.save();

      // Create outbound ledger entry (from source)
      const outboundLedger = await InventoryLedger.create({
        productId: line.productId,
        locationId: transfer.fromLocationId,
        warehouseId: transfer.fromWarehouseId,
        transactionType: 'transfer_out',
        referenceType: 'transfer',
        referenceId: transfer._id,
        referenceNumber: transfer.transferNumber,
        quantity: -line.requestedQty,
        balanceBefore: fromBalanceBefore,
        balanceAfter: fromStockLoc.quantity,
        createdBy: req.user._id,
        transactionDate: new Date()
      });

      ledgerEntries.push(outboundLedger);

      // Find or create destination stock location
      let toStockLoc = await StockLocation.findOne({
        productId: line.productId,
        locationId: transfer.toLocationId
      });

      const toBalanceBefore = toStockLoc ? toStockLoc.quantity : 0;

      if (!toStockLoc) {
        toStockLoc = await StockLocation.create({
          productId: line.productId,
          locationId: transfer.toLocationId,
          quantity: line.requestedQty,
          reserved: 0
        });
      } else {
        toStockLoc.quantity += line.requestedQty;
        await toStockLoc.save();
      }

      // Create inbound ledger entry (to destination)
      const inboundLedger = await InventoryLedger.create({
        productId: line.productId,
        locationId: transfer.toLocationId,
        warehouseId: transfer.toWarehouseId,
        transactionType: 'transfer_in',
        referenceType: 'transfer',
        referenceId: transfer._id,
        referenceNumber: transfer.transferNumber,
        quantity: line.requestedQty,
        balanceBefore: toBalanceBefore,
        balanceAfter: toStockLoc.quantity,
        createdBy: req.user._id,
        transactionDate: new Date()
      });

      ledgerEntries.push(inboundLedger);

      // Update line transferred quantity
      line.transferredQty = line.requestedQty;

      // Update location current quantities
      const fromLocation = await Location.findById(transfer.fromLocationId);
      if (fromLocation) {
        const fromLocationTotal = await StockLocation.aggregate([
          { $match: { locationId: transfer.fromLocationId } },
          { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]);
        fromLocation.currentQty = fromLocationTotal[0]?.total || 0;
        await fromLocation.save();
      }

      const toLocation = await Location.findById(transfer.toLocationId);
      if (toLocation) {
        const toLocationTotal = await StockLocation.aggregate([
          { $match: { locationId: transfer.toLocationId } },
          { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]);
        toLocation.currentQty = toLocationTotal[0]?.total || 0;
        await toLocation.save();
      }
    }

    // Update transfer status
    transfer.status = 'completed';
    transfer.executedBy = req.user._id;
    transfer.executedAt = new Date();
    transfer.addEvent('executed', req.user._id, notes || 'Transfer executed successfully', 'completed');

    await transfer.save();

    res.json({
      success: true,
      message: 'Transfer executed successfully',
      transfer: transfer.toPublicJSON(),
      ledgerEntries: ledgerEntries.length,
      summary: {
        transferNumber: transfer.transferNumber,
        itemsTransferred: transfer.lines.length,
        totalQuantity: transfer.totalTransferredQty,
        executedAt: transfer.executedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error executing transfer',
      error: error.message
    });
  }
};

// @route   POST /api/transfers/:id/cancel
// @desc    Cancel transfer request
// @access  Private
const cancelTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);

    if (!transfer || transfer.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    if (transfer.status === 'canceled') {
      return res.status(400).json({
        success: false,
        message: 'Transfer already canceled'
      });
    }

    if (transfer.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed transfer'
      });
    }

    if (!transfer.canCancel()) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel transfer in ${transfer.status} status`
      });
    }

    const { notes } = req.body;

    transfer.status = 'canceled';
    transfer.addEvent('canceled', req.user._id, notes || 'Transfer canceled', 'canceled');
    transfer.updatedBy = req.user._id;

    await transfer.save();

    res.json({
      success: true,
      message: 'Transfer canceled successfully',
      transfer: transfer.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error canceling transfer',
      error: error.message
    });
  }
};

module.exports = {
  getTransfers,
  createTransfer,
  getTransferById,
  executeTransfer,
  cancelTransfer
};
