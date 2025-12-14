const DeliveryOrder = require('../models/DeliveryOrder');
const Reservation = require('../models/Reservation');
const InventoryLedger = require('../models/InventoryLedger');
const StockLocation = require('../models/StockLocation');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Location = require('../models/Location');

// @route   GET /api/delivery-orders
// @desc    List delivery orders with filters
// @access  Private
const getDeliveryOrders = async (req, res) => {
  try {
    const {
      status,
      customerId,
      warehouseId,
      priority,
      page = 1,
      limit = 20,
      dateFrom,
      dateTo
    } = req.query;

    const query = { isDeleted: false };

    if (status) query.status = status;
    if (customerId) query.customerId = customerId;
    if (warehouseId) query.warehouseId = warehouseId;
    if (priority) query.priority = priority;
    
    if (dateFrom || dateTo) {
      query.promisedDate = {};
      if (dateFrom) query.promisedDate.$gte = new Date(dateFrom);
      if (dateTo) query.promisedDate.$lte = new Date(dateTo);
    }

    const skip = (page - 1) * limit;

    const orders = await DeliveryOrder.find(query)
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DeliveryOrder.countDocuments(query);

    res.json({
      success: true,
      data: orders,
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
      message: 'Error fetching delivery orders',
      error: error.message
    });
  }
};

// @route   POST /api/delivery-orders
// @desc    Create delivery order (with optional auto-reserve)
// @access  Private
const createDeliveryOrder = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      warehouseId,
      lines,
      priority,
      promisedDate,
      shippingAddress,
      notes,
      autoReserve = false
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

    const deliveryOrder = await DeliveryOrder.create({
      customerId,
      customerName,
      warehouseId,
      lines,
      priority,
      promisedDate,
      shippingAddress,
      notes,
      status: 'draft',
      createdBy: req.user._id
    });

    deliveryOrder.addEvent('created', req.user._id, 'Delivery order created');
    await deliveryOrder.save();

    // Auto-reserve stock if requested
    if (autoReserve) {
      try {
        const reservationLines = lines.map(line => ({
          productId: line.productId,
          locationId: line.locationId,
          qty: line.orderedQty
        }));

        const expiresAt = new Date(Date.now() + 1440 * 60 * 1000); // 24 hours default

        const reservation = await Reservation.create({
          referenceType: 'delivery_order',
          referenceId: deliveryOrder._id,
          lines: reservationLines,
          expiresAt,
          createdBy: req.user._id
        });

        // Update reserved quantities in DO lines
        for (let i = 0; i < deliveryOrder.lines.length; i++) {
          deliveryOrder.lines[i].reservedQty = lines[i].orderedQty;
        }

        deliveryOrder.reservationId = reservation._id;
        deliveryOrder.status = 'waiting';
        deliveryOrder.addEvent('reserved', req.user._id, 'Stock auto-reserved', 'waiting');
        await deliveryOrder.save();
      } catch (reserveError) {
        // If reservation fails, return warning but keep the DO
        return res.status(201).json({
          success: true,
          message: 'Delivery order created but auto-reserve failed',
          deliveryOrder: deliveryOrder.toPublicJSON(),
          warning: reserveError.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Delivery order created successfully',
      deliveryOrder: deliveryOrder.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating delivery order',
      error: error.message
    });
  }
};

// @route   GET /api/delivery-orders/:id
// @desc    Get delivery order detail
// @access  Private
const getDeliveryOrderById = async (req, res) => {
  try {
    const deliveryOrder = await DeliveryOrder.findById(req.params.id)
      .populate('warehouseId', 'name code address')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('lines.productId', 'name sku description')
      .populate('lines.locationId', 'code')
      .populate('reservationId')
      .populate('events.userId', 'name email');

    if (!deliveryOrder || deliveryOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    res.json({
      success: true,
      deliveryOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching delivery order',
      error: error.message
    });
  }
};

// @route   PUT /api/delivery-orders/:id
// @desc    Edit delivery order (allowed while Draft/Waiting)
// @access  Private
const updateDeliveryOrder = async (req, res) => {
  try {
    const deliveryOrder = await DeliveryOrder.findById(req.params.id);

    if (!deliveryOrder || deliveryOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    if (!deliveryOrder.canEdit()) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit delivery order in ${deliveryOrder.status} status. Only draft or waiting orders can be edited.`
      });
    }

    const {
      customerId,
      customerName,
      warehouseId,
      lines,
      priority,
      promisedDate,
      shippingAddress,
      notes,
      status
    } = req.body;

    // Update fields
    if (customerId !== undefined) deliveryOrder.customerId = customerId;
    if (customerName !== undefined) deliveryOrder.customerName = customerName;
    if (warehouseId !== undefined) deliveryOrder.warehouseId = warehouseId;
    if (lines !== undefined) deliveryOrder.lines = lines;
    if (priority !== undefined) deliveryOrder.priority = priority;
    if (promisedDate !== undefined) deliveryOrder.promisedDate = promisedDate;
    if (shippingAddress !== undefined) deliveryOrder.shippingAddress = shippingAddress;
    if (notes !== undefined) deliveryOrder.notes = notes;
    
    // Status change
    if (status && status !== deliveryOrder.status) {
      const oldStatus = deliveryOrder.status;
      deliveryOrder.status = status;
      deliveryOrder.addEvent('status_changed', req.user._id, `Status changed from ${oldStatus} to ${status}`, status);
    }

    deliveryOrder.updatedBy = req.user._id;
    deliveryOrder.addEvent('edited', req.user._id, 'Delivery order updated');
    
    await deliveryOrder.save();

    res.json({
      success: true,
      message: 'Delivery order updated successfully',
      deliveryOrder: deliveryOrder.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating delivery order',
      error: error.message
    });
  }
};

// @route   POST /api/delivery-orders/:id/reserve
// @desc    Reserve required stock for delivery order
// @access  Private
const reserveStock = async (req, res) => {
  try {
    const deliveryOrder = await DeliveryOrder.findById(req.params.id);

    if (!deliveryOrder || deliveryOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    if (deliveryOrder.status !== 'draft' && deliveryOrder.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: `Cannot reserve stock for ${deliveryOrder.status} delivery order`
      });
    }

    if (deliveryOrder.reservationId) {
      return res.status(400).json({
        success: false,
        message: 'Stock already reserved for this delivery order'
      });
    }

    // Create reservation
    const reservationLines = deliveryOrder.lines.map(line => ({
      productId: line.productId,
      locationId: line.locationId,
      qty: line.orderedQty
    }));

    // Calculate expiration date
    const expiryMinutes = req.body.expiryMinutes || 1440; // 24 hours default
    const expiresAt = req.body.expiryDate || new Date(Date.now() + expiryMinutes * 60 * 1000);

    const reservation = await Reservation.create({
      referenceType: 'delivery_order',
      referenceId: deliveryOrder._id,
      lines: reservationLines,
      expiresAt,
      idempotencyKey: req.body.idempotencyKey,
      createdBy: req.user._id
    });

    // Update reserved quantities
    for (let i = 0; i < deliveryOrder.lines.length; i++) {
      deliveryOrder.lines[i].reservedQty = deliveryOrder.lines[i].orderedQty;
    }

    deliveryOrder.reservationId = reservation._id;
    deliveryOrder.status = 'waiting';
    deliveryOrder.addEvent('reserved', req.user._id, 'Stock reserved', 'waiting');
    
    await deliveryOrder.save();

    res.json({
      success: true,
      message: 'Stock reserved successfully',
      deliveryOrder: deliveryOrder.toPublicJSON(),
      reservation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reserving stock',
      error: error.message
    });
  }
};

module.exports = {
  getDeliveryOrders,
  createDeliveryOrder,
  getDeliveryOrderById,
  updateDeliveryOrder,
  reserveStock
};

// @route   POST /api/delivery-orders/:id/pick
// @desc    Mark items as picked (supply scanned items)
// @access  Private
const pickItems = async (req, res) => {
  try {
    const { pickedLines, userId } = req.body;

    const deliveryOrder = await DeliveryOrder.findById(req.params.id);

    if (!deliveryOrder || deliveryOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Allow picking from draft, waiting, or picking status
    if (!['draft', 'waiting', 'picking'].includes(deliveryOrder.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot pick items for ${deliveryOrder.status} delivery order. Order must be in draft, waiting, or picking status.`
      });
    }

    // Update picked quantities
    for (const pickedLine of pickedLines) {
      const line = deliveryOrder.lines.id(pickedLine.lineId);
      if (line) {
        line.pickedQty += pickedLine.qty;
        if (pickedLine.locationId) {
          line.locationId = pickedLine.locationId;
        }
      }
    }

    // Change status to picking if not already
    if (deliveryOrder.status !== 'picking') {
      deliveryOrder.status = 'picking';
    }

    deliveryOrder.addEvent('picked', userId || req.user._id, `Items picked: ${pickedLines.length} lines`, 'picking');
    deliveryOrder.updatedBy = req.user._id;
    
    await deliveryOrder.save();

    res.json({
      success: true,
      message: 'Items picked successfully',
      deliveryOrder: deliveryOrder.toPublicJSON(),
      pickSummary: {
        totalPicked: deliveryOrder.totalPickedQty,
        totalOrdered: deliveryOrder.totalOrderedQty,
        complete: deliveryOrder.totalPickedQty >= deliveryOrder.totalOrderedQty
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error picking items',
      error: error.message
    });
  }
};

// @route   POST /api/delivery-orders/:id/pack
// @desc    Confirm packing and package creation
// @access  Private
const packItems = async (req, res) => {
  try {
    const { packages, trackingNumber } = req.body;

    const deliveryOrder = await DeliveryOrder.findById(req.params.id);

    if (!deliveryOrder || deliveryOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    // Allow packing from picking or packed status
    if (!['picking', 'packed'].includes(deliveryOrder.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot pack ${deliveryOrder.status} delivery order. Order must be in picking or packed status.`
      });
    }

    // Add packages
    for (const pkg of packages) {
      // Update packed quantities
      for (const pkgLine of pkg.lines) {
        const line = deliveryOrder.lines.id(pkgLine.lineId);
        if (line) {
          line.packedQty += pkgLine.qty;
        }
      }

      deliveryOrder.packages.push({
        packageId: pkg.packageId || `PKG-${Date.now()}`,
        weight: pkg.weight,
        dimensions: pkg.dimensions,
        trackingNumber: pkg.trackingNumber || trackingNumber,
        carrier: pkg.carrier,
        lines: pkg.lines
      });
    }

    // Manually calculate total packed qty
    const totalPackedQty = deliveryOrder.lines.reduce((sum, line) => sum + line.packedQty, 0);
    const totalOrderedQty = deliveryOrder.lines.reduce((sum, line) => sum + line.orderedQty, 0);

    // Change status based on completion
    if (totalPackedQty >= totalOrderedQty) {
      deliveryOrder.status = 'ready';
      deliveryOrder.addEvent('packed', req.user._id, 'All items packed - ready to ship', 'ready');
    } else {
      deliveryOrder.status = 'packed';
      deliveryOrder.addEvent('packed', req.user._id, `Partial packing: ${totalPackedQty}/${totalOrderedQty}`, 'packed');
    }

    deliveryOrder.updatedBy = req.user._id;
    
    await deliveryOrder.save();

    res.json({
      success: true,
      message: 'Items packed successfully',
      deliveryOrder: deliveryOrder.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error packing items',
      error: error.message
    });
  }
};

// @route   POST /api/delivery-orders/:id/validate
// @desc    Finalize delivery order and decrease stock; emit ledger entries
// @access  Private (requires permission)
const validateDeliveryOrder = async (req, res) => {
  try {
    const { idempotencyKey } = req.body;

    // Check idempotency FIRST
    if (idempotencyKey) {
      const existing = await DeliveryOrder.findOne({ idempotencyKey });
      if (existing) {
        return res.json({
          success: true,
          message: 'Delivery order already validated (idempotent)',
          deliveryOrder: existing.toPublicJSON(),
          isExisting: true
        });
      }
    }

    const deliveryOrder = await DeliveryOrder.findById(req.params.id);

    if (!deliveryOrder || deliveryOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    if (deliveryOrder.status === 'done') {
      return res.status(400).json({
        success: false,
        message: 'Delivery order already validated'
      });
    }

    if (!deliveryOrder.canValidate()) {
      return res.status(400).json({
        success: false,
        message: 'Delivery order must be in "ready" status with packed items to validate'
      });
    }

    const ledgerEntries = [];

    // Set idempotency key if provided
    if (idempotencyKey) {
      deliveryOrder.idempotencyKey = idempotencyKey;
    }

    // Process each line - decrease stock
    for (const line of deliveryOrder.lines) {
      if (line.packedQty > 0) {
        const product = await Product.findById(line.productId);
        
        // Find stock location - if no locationId, find any location with stock
        let stockLoc;
        if (line.locationId) {
          stockLoc = await StockLocation.findOne({
            productId: line.productId,
            locationId: line.locationId
          });
        } else {
          // Auto-select location with stock
          stockLoc = await StockLocation.findOne({
            productId: line.productId,
            quantity: { $gte: line.packedQty }
          });
          
          if (stockLoc) {
            line.locationId = stockLoc.locationId;
          }
        }

        if (!stockLoc) {
          return res.status(400).json({
            success: false,
            message: `No stock found for product ${product.sku}. Available on hand: ${product.totalOnHand}, Required: ${line.packedQty}`
          });
        }

        const balanceBefore = stockLoc.quantity;

        // Decrease stock quantity
        stockLoc.quantity -= line.packedQty;
        
        if (stockLoc.quantity < 0) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product ${product.sku}`
          });
        }

        // Decrease reserved if exists
        if (stockLoc.reserved >= line.packedQty) {
          stockLoc.reserved -= line.packedQty;
        }

        await stockLoc.save();

        // Create ledger entry
        const ledgerEntry = await InventoryLedger.create({
          productId: line.productId,
          locationId: line.locationId,
          warehouseId: deliveryOrder.warehouseId,
          transactionType: 'delivery',
          referenceType: 'delivery_order',
          referenceId: deliveryOrder._id,
          referenceNumber: deliveryOrder.orderNumber,
          quantity: -line.packedQty,
          balanceBefore,
          balanceAfter: stockLoc.quantity,
          unitPrice: line.unitPrice,
          createdBy: req.user._id,
          transactionDate: new Date()
        });

        ledgerEntries.push(ledgerEntry);

        // Update product total on hand
        product.totalOnHand -= line.packedQty;
        
        // Decrease reserved on product if exists
        if (product.totalReserved >= line.packedQty) {
          product.totalReserved -= line.packedQty;
        }
        
        await product.save();

        // Update line shipped quantity
        line.shippedQty = line.packedQty;

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
    }

    // Release reservation if exists
    if (deliveryOrder.reservationId) {
      const reservation = await Reservation.findById(deliveryOrder.reservationId);
      if (reservation && reservation.status === 'active') {
        reservation.status = 'released';
        await reservation.save();
      }
    }

    // Update delivery order status
    deliveryOrder.status = 'done';
    deliveryOrder.shippedDate = new Date();
    deliveryOrder.validatedBy = req.user._id;
    deliveryOrder.validatedAt = new Date();
    deliveryOrder.addEvent('validated', req.user._id, `Delivery order validated. Stock decreased.`, 'done');
    
    await deliveryOrder.save();

    res.json({
      success: true,
      message: 'Delivery order validated successfully. Stock updated.',
      deliveryOrder: deliveryOrder.toPublicJSON(),
      ledgerEntries: ledgerEntries.length,
      shipmentInfo: {
        orderNumber: deliveryOrder.orderNumber,
        packages: deliveryOrder.packages.length,
        totalShipped: deliveryOrder.totalShippedQty,
        shippedDate: deliveryOrder.shippedDate
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error validating delivery order',
      error: error.message
    });
  }
};

// @route   POST /api/delivery-orders/:id/cancel
// @desc    Cancel delivery order and release reservations
// @access  Private
const cancelDeliveryOrder = async (req, res) => {
  try {
    const deliveryOrder = await DeliveryOrder.findById(req.params.id);

    if (!deliveryOrder || deliveryOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    if (deliveryOrder.status === 'canceled') {
      return res.status(400).json({
        success: false,
        message: 'Delivery order already canceled'
      });
    }

    if (deliveryOrder.status === 'done') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed delivery order'
      });
    }

    const { notes } = req.body;

    // Release reservation if exists
    if (deliveryOrder.reservationId) {
      const reservation = await Reservation.findById(deliveryOrder.reservationId);
      if (reservation && reservation.status === 'active') {
        // Release stock reservations
        for (const line of reservation.lines) {
          const stockLoc = await StockLocation.findOne({
            productId: line.productId,
            locationId: line.locationId
          });

          if (stockLoc && stockLoc.reserved >= line.qty) {
            stockLoc.reserved -= line.qty;
            await stockLoc.save();
          }

          // Update product total reserved
          const product = await Product.findById(line.productId);
          if (product && product.totalReserved >= line.qty) {
            product.totalReserved -= line.qty;
            await product.save();
          }
        }

        reservation.status = 'released';
        await reservation.save();
      }
    }

    // Update delivery order status
    deliveryOrder.status = 'canceled';
    deliveryOrder.addEvent('canceled', req.user._id, notes || 'Delivery order canceled', 'canceled');
    deliveryOrder.updatedBy = req.user._id;
    
    await deliveryOrder.save();

    res.json({
      success: true,
      message: 'Delivery order canceled successfully',
      deliveryOrder: deliveryOrder.toPublicJSON()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error canceling delivery order',
      error: error.message
    });
  }
};

// @route   GET /api/delivery-orders/:id/labels
// @desc    Generate/return shipping labels
// @access  Private
const getLabels = async (req, res) => {
  try {
    const deliveryOrder = await DeliveryOrder.findById(req.params.id);

    if (!deliveryOrder || deliveryOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Delivery order not found'
      });
    }

    if (deliveryOrder.packages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No packages found for this delivery order'
      });
    }

    // Generate label data (in real app, integrate with carrier API)
    const labels = deliveryOrder.packages.map(pkg => ({
      packageId: pkg.packageId,
      trackingNumber: pkg.trackingNumber,
      carrier: pkg.carrier,
      weight: pkg.weight,
      dimensions: pkg.dimensions,
      // In production: labelUrl: await generateCarrierLabel(pkg)
      labelUrl: `https://labels.example.com/${pkg.trackingNumber}.pdf`
    }));

    res.json({
      success: true,
      orderNumber: deliveryOrder.orderNumber,
      labels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching labels',
      error: error.message
    });
  }
};

module.exports = {
  getDeliveryOrders,
  createDeliveryOrder,
  getDeliveryOrderById,
  updateDeliveryOrder,
  reserveStock,
  pickItems,
  packItems,
  validateDeliveryOrder,
  cancelDeliveryOrder,
  getLabels
};
