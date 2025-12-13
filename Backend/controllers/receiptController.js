const Receipt = require('../models/Receipt');
const InventoryLedger = require('../models/InventoryLedger');
const StockLocation = require('../models/StockLocation');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Location = require('../models/Location');
const mongoose = require('mongoose');

// @route   GET /api/receipts
// @desc    List receipts with filters
// @access  Private
const getReceipts = async (req, res) => {
  try {
    const {
      status,
      supplierId,
      warehouseId,
      page = 1,
      limit = 20,
      dateFrom,
      dateTo
    } = req.query;

    const query = { isDeleted: false };

    if (status) query.status = status;
    if (supplierId) query.supplierId = supplierId;
    if (warehouseId) query.warehouseId = warehouseId;
    
    if (dateFrom || dateTo) {
      query.expectedDate = {};
      if (dateFrom) query.expectedDate.$gte = new Date(dateFrom);
      if (dateTo) query.expectedDate.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const receipts = await Receipt.find(query)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Receipt.countDocuments(query);

    res.json({
      success: true,
      data: receipts,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching receipts',
      error: error.message
    });
  }
};

// @route   POST /api/receipts
// @desc    Create receipt document (draft)
// @access  Private
const createReceipt = async (req, res) => {
  try {
    const {
      supplierId,
      supplierName,
      expectedDate,
      warehouseId,
      referenceNumber,
      lines,
      attachments,
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

    // Validate products in lines
    for (const line of lines) {
      const product = await Product.findById(line.productId);
      if (!product || product.isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${line.productId}`
        });
      }
      // Auto-fill SKU if not provided
      if (!line.sku) {
        line.sku = product.sku;
      }
    }

    const receipt = await Receipt.create({
      supplierId,
      supplierName,
      expectedDate,
      warehouseId,
      referenceNumber,
      lines,
      attachments,
      notes,
      status: 'draft',
      createdBy: req.user._id
    });

    receipt.addEvent('created', req.user._id, 'Receipt created');
    await receipt.save();

    res.status(201).json({
      success: true,
      message: 'Receipt created successfully',
      receipt: receipt.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating receipt',
      error: error.message
    });
  }
};

// @route   GET /api/receipts/:id
// @desc    Get receipt detail (lines, events)
// @access  Private
const getReceiptById = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id)
      .populate('warehouseId', 'name code address')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('lines.productId', 'name sku description')
      .populate('events.userId', 'name email');

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    res.json({
      success: true,
      receipt
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching receipt',
      error: error.message
    });
  }
};

// @route   PUT /api/receipts/:id
// @desc    Edit receipt (allowed while Draft/Waiting)
// @access  Private
const updateReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    if (!receipt.canEdit()) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit receipt in ${receipt.status} status. Only draft or waiting receipts can be edited.`
      });
    }

    const {
      supplierId,
      supplierName,
      expectedDate,
      warehouseId,
      referenceNumber,
      lines,
      attachments,
      notes,
      status
    } = req.body;

    // Update fields
    if (supplierId !== undefined) receipt.supplierId = supplierId;
    if (supplierName !== undefined) receipt.supplierName = supplierName;
    if (expectedDate !== undefined) receipt.expectedDate = expectedDate;
    if (warehouseId !== undefined) receipt.warehouseId = warehouseId;
    if (referenceNumber !== undefined) receipt.referenceNumber = referenceNumber;
    if (lines !== undefined) receipt.lines = lines;
    if (attachments !== undefined) receipt.attachments = attachments;
    if (notes !== undefined) receipt.notes = notes;
    
    // Status change
    if (status && status !== receipt.status) {
      const oldStatus = receipt.status;
      receipt.status = status;
      receipt.addEvent('status_changed', req.user._id, `Status changed from ${oldStatus} to ${status}`, status);
    }

    receipt.updatedBy = req.user._id;
    receipt.addEvent('edited', req.user._id, 'Receipt updated');
    
    await receipt.save();

    res.json({
      success: true,
      message: 'Receipt updated successfully',
      receipt: receipt.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating receipt',
      error: error.message
    });
  }
};

// @route   POST /api/receipts/:id/update-qty
// @desc    Update received qty per line during receiving (partial receipts)
// @access  Private
const updateReceivedQty = async (req, res) => {
  try {
    const { lines } = req.body;

    const receipt = await Receipt.findById(req.params.id);

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    if (receipt.status === 'done' || receipt.status === 'canceled') {
      return res.status(400).json({
        success: false,
        message: `Cannot update quantities for ${receipt.status} receipt`
      });
    }

    // Update received quantities
    for (const update of lines) {
      const line = receipt.lines.id(update.lineId);
      if (line) {
        line.receivedQty = update.receivedQty;
      }
    }

    receipt.addEvent('qty_updated', req.user._id, 'Received quantities updated');
    receipt.updatedBy = req.user._id;
    
    await receipt.save();

    res.json({
      success: true,
      message: 'Received quantities updated successfully',
      receipt: receipt.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating quantities',
      error: error.message
    });
  }
};

// @route   POST /api/receipts/:id/validate
// @desc    Validate & post receipt — increase stock and append ledger entries
// @access  Private (requires permission)
const validateReceipt = async (req, res) => {
  try {
    const { idempotencyKey } = req.body;

    // Check idempotency FIRST (before fetching receipt)
    if (idempotencyKey) {
      const existing = await Receipt.findOne({ idempotencyKey });
      if (existing) {
        return res.json({
          success: true,
          message: 'Receipt already validated (idempotent)',
          receipt: existing.toPublicJSON(),
          isExisting: true
        });
      }
    }

    const receipt = await Receipt.findById(req.params.id);

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    if (receipt.status === 'done') {
      return res.status(400).json({
        success: false,
        message: 'Receipt already validated'
      });
    }

    if (!receipt.canValidate()) {
      return res.status(400).json({
        success: false,
        message: 'Receipt must be in "ready" status with received quantities to validate'
      });
    }

    const ledgerEntries = [];
    const warehouse = await Warehouse.findById(receipt.warehouseId);

    // Get default location for this warehouse
    let defaultLocation = await Location.findOne({
      warehouseId: receipt.warehouseId,
      code: 'RECEIVING'
    });

    if (!defaultLocation) {
      defaultLocation = await Location.findOne({
        warehouseId: receipt.warehouseId,
        isDeleted: false
      });
    }

    if (!defaultLocation) {
      return res.status(400).json({
        success: false,
        message: 'No location found in warehouse. Please create a location first.'
      });
    }

    // Set idempotency key if provided
    if (idempotencyKey) {
      receipt.idempotencyKey = idempotencyKey;
    }

    // Process each line
    for (const line of receipt.lines) {
      if (line.receivedQty > 0) {
        const product = await Product.findById(line.productId);
        
        // Update or create stock location
        let stockLoc = await StockLocation.findOne({
          productId: line.productId,
          locationId: defaultLocation._id
        });

        const balanceBefore = stockLoc ? stockLoc.quantity : 0;

        if (!stockLoc) {
          stockLoc = await StockLocation.create({
            productId: line.productId,
            locationId: defaultLocation._id,
            quantity: line.receivedQty,
            reserved: 0
          });
        } else {
          stockLoc.quantity += line.receivedQty;
          await stockLoc.save();
        }

        // Create ledger entry
        const ledgerEntry = await InventoryLedger.create({
          productId: line.productId,
          locationId: defaultLocation._id,
          warehouseId: receipt.warehouseId,
          transactionType: 'receipt',
          referenceType: 'receipt',
          referenceId: receipt._id,
          referenceNumber: receipt.receiptNumber,
          quantity: line.receivedQty,
          balanceBefore,
          balanceAfter: stockLoc.quantity,
          unitPrice: line.unitPrice,
          createdBy: req.user._id,
          transactionDate: new Date()
        });

        ledgerEntries.push(ledgerEntry);

        // Update product total on hand
        product.totalOnHand += line.receivedQty;
        await product.save();

        // Update location current quantity
        const locationTotal = await StockLocation.aggregate([
          { $match: { locationId: defaultLocation._id } },
          { $group: { _id: null, total: { $sum: '$quantity' } } }
        ]);
        defaultLocation.currentQty = locationTotal[0]?.total || 0;
        await defaultLocation.save();
      }
    }

    // Update receipt status
    receipt.status = 'done';
    receipt.receivedDate = new Date();
    receipt.validatedBy = req.user._id;
    receipt.validatedAt = new Date();
    receipt.addEvent('validated', req.user._id, `Receipt validated. Stock increased.`, 'done');
    
    await receipt.save();

    res.json({
      success: true,
      message: 'Receipt validated successfully. Stock updated.',
      receipt: receipt.toPublicJSON(),
      ledgerEntries: ledgerEntries.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating receipt',
      error: error.message
    });
  }
};

// @route   POST /api/receipts/:id/cancel
// @desc    Cancel receipt. If already validated, create reversing adjustments (admin only)
// @access  Private (admin only)
const cancelReceipt = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    if (receipt.status === 'canceled') {
      return res.status(400).json({
        success: false,
        message: 'Receipt already canceled'
      });
    }

    const { notes } = req.body;

    // If receipt was validated, create reversal entries
    if (receipt.status === 'done') {
      // Only admin can cancel validated receipts
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can cancel validated receipts'
        });
      }

      // Find all ledger entries for this receipt
      const ledgerEntries = await InventoryLedger.find({
        referenceType: 'receipt',
        referenceId: receipt._id
      });

      // Create reversal entries
      for (const entry of ledgerEntries) {
        const stockLoc = await StockLocation.findOne({
          productId: entry.productId,
          locationId: entry.locationId
        });

        if (stockLoc) {
          const balanceBefore = stockLoc.quantity;
          stockLoc.quantity -= entry.quantity;
          
          if (stockLoc.quantity < 0) {
            return res.status(400).json({
              success: false,
              message: `Cannot cancel: insufficient stock for product ${entry.productId}`
            });
          }

          await stockLoc.save();

          // Create reversal ledger entry
          await InventoryLedger.create({
            productId: entry.productId,
            locationId: entry.locationId,
            warehouseId: entry.warehouseId,
            transactionType: 'reversal',
            referenceType: 'receipt',
            referenceId: receipt._id,
            referenceNumber: receipt.receiptNumber,
            quantity: -entry.quantity,
            balanceBefore,
            balanceAfter: stockLoc.quantity,
            unitPrice: entry.unitPrice,
            notes: `Reversal of receipt ${receipt.receiptNumber}. ${notes || ''}`,
            createdBy: req.user._id,
            transactionDate: new Date()
          });

          // Update product total
          const product = await Product.findById(entry.productId);
          product.totalOnHand -= entry.quantity;
          await product.save();
        }
      }
    }

    // Update receipt status
    receipt.status = 'canceled';
    receipt.addEvent('canceled', req.user._id, notes || 'Receipt canceled', 'canceled');
    receipt.updatedBy = req.user._id;
    
    await receipt.save();

    res.json({
      success: true,
      message: 'Receipt canceled successfully',
      receipt: receipt.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error canceling receipt',
      error: error.message
    });
  }
};

// @route   GET /api/receipts/:id/attachments
// @desc    List/download attached invoices/documents
// @access  Private
const getAttachments = async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);

    if (!receipt || receipt.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    res.json({
      success: true,
      receiptNumber: receipt.receiptNumber,
      attachments: receipt.attachments || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching attachments',
      error: error.message
    });
  }
};

module.exports = {
  getReceipts,
  createReceipt,
  getReceiptById,
  updateReceipt,
  updateReceivedQty,
  validateReceipt,
  cancelReceipt,
  getAttachments
};
