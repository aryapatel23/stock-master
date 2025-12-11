const PurchaseOrder = require('../models/PurchaseOrder');
const ReorderRule = require('../models/ReorderRule');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const User = require('../models/User');

// @route   GET /api/purchase-orders
// @desc    List purchase orders with filters
// @access  Private
const getPurchaseOrders = async (req, res) => {
  try {
    const {
      supplierId,
      warehouseId,
      status,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    const query = { isDeleted: false };

    if (supplierId) {
      query.supplierId = supplierId;
    }

    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    if (status) {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.orderDate = {};
      if (dateFrom) {
        query.orderDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.orderDate.$lte = new Date(dateTo);
      }
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('supplierId', 'name email phone')
      .populate('warehouseId', 'name code address')
      .populate('lines.productId', 'name sku uom')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await PurchaseOrder.countDocuments(query);

    res.json({
      success: true,
      purchaseOrders,
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
      message: 'Error fetching purchase orders',
      error: error.message
    });
  }
};

// @route   GET /api/purchase-orders/:id
// @desc    Get purchase order by ID
// @access  Private
const getPurchaseOrderById = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate('supplierId', 'name email phone')
      .populate('warehouseId', 'name code address')
      .populate('lines.productId', 'name sku uom')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!purchaseOrder || purchaseOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      purchaseOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching purchase order',
      error: error.message
    });
  }
};

// @route   POST /api/purchase-orders
// @desc    Create purchase order
// @access  Private
const createPurchaseOrder = async (req, res) => {
  try {
    const {
      supplierId,
      warehouseId,
      lines,
      expectedDeliveryDate,
      tax,
      shipping,
      paymentTerms,
      shippingAddress,
      notes,
      internalNotes
    } = req.body;

    // Validate supplier
    const supplier = await User.findById(supplierId);
    if (!supplier || supplier.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Validate warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse || warehouse.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Validate products and enrich lines
    for (const line of lines) {
      const product = await Product.findById(line.productId);
      if (!product || product.isDeleted) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${line.productId}`
        });
      }

      if (!line.sku) {
        line.sku = product.sku;
      }
    }

    const purchaseOrder = await PurchaseOrder.create({
      supplierId,
      warehouseId,
      lines,
      expectedDeliveryDate,
      tax: tax || 0,
      shipping: shipping || 0,
      paymentTerms,
      shippingAddress: shippingAddress || warehouse.address,
      notes,
      internalNotes,
      status: 'draft',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      purchaseOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating purchase order',
      error: error.message
    });
  }
};

// @route   POST /api/purchase-orders/from-reorder
// @desc    Create purchase order from reorder rules
// @access  Private
const createFromReorder = async (req, res) => {
  try {
    const { warehouseId, supplierId, productIds } = req.body;

    // Validate warehouse
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse || warehouse.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Validate supplier
    const supplier = await User.findById(supplierId);
    if (!supplier || supplier.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Get reorder rules
    const query = {
      warehouseId,
      supplierId,
      isActive: true,
      isDeleted: false
    };

    if (productIds && productIds.length > 0) {
      query.productId = { $in: productIds };
    }

    const reorderRules = await ReorderRule.find(query).populate('productId', 'name sku uom');

    if (reorderRules.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active reorder rules found for the specified criteria'
      });
    }

    // Create PO lines from reorder rules
    const lines = reorderRules.map(rule => ({
      productId: rule.productId._id,
      sku: rule.productId.sku,
      orderedQty: rule.reorderQty,
      notes: `Auto-generated from reorder rule - Min: ${rule.minQty}, Max: ${rule.maxQty || 'N/A'}`
    }));

    const purchaseOrder = await PurchaseOrder.create({
      supplierId,
      warehouseId,
      lines,
      shippingAddress: warehouse.address,
      notes: 'Auto-generated purchase order from reorder rules',
      internalNotes: `Created from ${reorderRules.length} reorder rule(s)`,
      status: 'draft',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Purchase order created from reorder rules',
      purchaseOrder,
      summary: {
        rulesUsed: reorderRules.length,
        totalItems: lines.length,
        totalQty: lines.reduce((sum, line) => sum + line.orderedQty, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating purchase order from reorder rules',
      error: error.message
    });
  }
};

// @route   PUT /api/purchase-orders/:id/status
// @desc    Update purchase order status
// @access  Private
const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder || purchaseOrder.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    purchaseOrder.status = status;

    if (status === 'approved') {
      purchaseOrder.approvedBy = req.user._id;
      purchaseOrder.approvedAt = new Date();
    }

    if (notes) {
      purchaseOrder.internalNotes = purchaseOrder.internalNotes 
        ? `${purchaseOrder.internalNotes}\n${notes}`
        : notes;
    }

    await purchaseOrder.save();

    res.json({
      success: true,
      message: `Purchase order ${status} successfully`,
      purchaseOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating purchase order status',
      error: error.message
    });
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  createFromReorder,
  updatePurchaseOrderStatus
};
