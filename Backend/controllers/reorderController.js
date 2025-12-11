const ReorderRule = require('../models/ReorderRule');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const StockLocation = require('../models/StockLocation');
const Alert = require('../models/Alert');

// @route   GET /api/reorder-rules
// @desc    List reorder rules with filters
// @access  Private
const getReorderRules = async (req, res) => {
  try {
    const {
      productId,
      warehouseId,
      isActive,
      page = 1,
      limit = 50
    } = req.query;

    const query = { isDeleted: false };

    if (productId) {
      query.productId = productId;
    }

    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const rules = await ReorderRule.find(query)
      .populate('productId', 'name sku uom totalOnHand')
      .populate('warehouseId', 'name code')
      .populate('supplierId', 'name email phone')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ReorderRule.countDocuments(query);

    res.json({
      success: true,
      rules,
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
      message: 'Error fetching reorder rules',
      error: error.message
    });
  }
};

// @route   POST /api/reorder-rules
// @desc    Create reorder rule
// @access  Private
const createReorderRule = async (req, res) => {
  try {
    const {
      productId,
      warehouseId,
      minQty,
      maxQty,
      reorderQty,
      supplierId,
      leadTimeDays,
      autoCreatePO,
      notes
    } = req.body;

    // Validate product
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Validate warehouse if provided
    if (warehouseId) {
      const warehouse = await Warehouse.findById(warehouseId);
      if (!warehouse || warehouse.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Warehouse not found'
        });
      }
    }

    // Check for existing rule
    const existingRule = await ReorderRule.findOne({
      productId,
      warehouseId: warehouseId || null,
      isDeleted: false
    });

    if (existingRule) {
      return res.status(400).json({
        success: false,
        message: 'Reorder rule already exists for this product/warehouse combination'
      });
    }

    const rule = await ReorderRule.create({
      productId,
      warehouseId,
      minQty,
      maxQty,
      reorderQty,
      supplierId,
      leadTimeDays,
      autoCreatePO: autoCreatePO || false,
      notes,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Reorder rule created successfully',
      rule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating reorder rule',
      error: error.message
    });
  }
};

// @route   PUT /api/reorder-rules/:id
// @desc    Update reorder rule
// @access  Private
const updateReorderRule = async (req, res) => {
  try {
    const rule = await ReorderRule.findById(req.params.id);

    if (!rule || rule.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Reorder rule not found'
      });
    }

    const {
      minQty,
      maxQty,
      reorderQty,
      supplierId,
      leadTimeDays,
      autoCreatePO,
      isActive,
      notes
    } = req.body;

    if (minQty !== undefined) rule.minQty = minQty;
    if (maxQty !== undefined) rule.maxQty = maxQty;
    if (reorderQty !== undefined) rule.reorderQty = reorderQty;
    if (supplierId !== undefined) rule.supplierId = supplierId;
    if (leadTimeDays !== undefined) rule.leadTimeDays = leadTimeDays;
    if (autoCreatePO !== undefined) rule.autoCreatePO = autoCreatePO;
    if (isActive !== undefined) rule.isActive = isActive;
    if (notes !== undefined) rule.notes = notes;

    rule.updatedBy = req.user._id;

    await rule.save();

    res.json({
      success: true,
      message: 'Reorder rule updated successfully',
      rule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating reorder rule',
      error: error.message
    });
  }
};

// @route   DELETE /api/reorder-rules/:id
// @desc    Delete reorder rule
// @access  Private
const deleteReorderRule = async (req, res) => {
  try {
    const rule = await ReorderRule.findById(req.params.id);

    if (!rule || rule.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Reorder rule not found'
      });
    }

    rule.isDeleted = true;
    rule.updatedBy = req.user._id;
    await rule.save();

    res.json({
      success: true,
      message: 'Reorder rule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting reorder rule',
      error: error.message
    });
  }
};

// @route   POST /api/reorder-rules/check
// @desc    Check reorder levels and generate alerts
// @access  Private
const checkReorderLevels = async (req, res) => {
  try {
    const rules = await ReorderRule.find({ isActive: true, isDeleted: false })
      .populate('productId', 'name sku totalOnHand');

    const alertsCreated = [];
    const productsChecked = [];

    for (const rule of rules) {
      let currentQty = 0;

      if (rule.warehouseId) {
        // Check stock in specific warehouse
        const stockLocations = await StockLocation.aggregate([
          {
            $lookup: {
              from: 'locations',
              localField: 'locationId',
              foreignField: '_id',
              as: 'location'
            }
          },
          { $unwind: '$location' },
          {
            $match: {
              productId: rule.productId._id,
              'location.warehouseId': rule.warehouseId
            }
          },
          {
            $group: {
              _id: null,
              totalQty: { $sum: '$quantity' }
            }
          }
        ]);

        currentQty = stockLocations[0]?.totalQty || 0;
      } else {
        // Check total stock
        currentQty = rule.productId.totalOnHand || 0;
      }

      productsChecked.push({
        productId: rule.productId._id,
        productName: rule.productId.name,
        currentQty,
        minQty: rule.minQty,
        needsReorder: currentQty <= rule.minQty
      });

      // Create alert if stock is low
      if (currentQty <= rule.minQty) {
        // Check if alert already exists
        const existingAlert = await Alert.findOne({
          productId: rule.productId._id,
          warehouseId: rule.warehouseId,
          type: currentQty === 0 ? 'out_of_stock' : 'low_stock',
          resolved: false
        });

        if (!existingAlert) {
          const alert = await Alert.create({
            type: currentQty === 0 ? 'out_of_stock' : 'low_stock',
            severity: currentQty === 0 ? 'critical' : 'high',
            productId: rule.productId._id,
            warehouseId: rule.warehouseId,
            currentQty,
            thresholdQty: rule.minQty,
            reorderRuleId: rule._id,
            message: `${rule.productId.name} (${rule.productId.sku}) stock level is ${currentQty === 0 ? 'out of stock' : 'below minimum'}. Current: ${currentQty}, Min: ${rule.minQty}`,
            createdBy: req.user?._id
          });

          alertsCreated.push(alert);
        }
      }
    }

    res.json({
      success: true,
      message: 'Reorder levels checked successfully',
      summary: {
        rulesChecked: rules.length,
        alertsCreated: alertsCreated.length,
        productsNeedingReorder: productsChecked.filter(p => p.needsReorder).length
      },
      productsChecked,
      alertsCreated
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking reorder levels',
      error: error.message
    });
  }
};

module.exports = {
  getReorderRules,
  createReorderRule,
  updateReorderRule,
  deleteReorderRule,
  checkReorderLevels
};
