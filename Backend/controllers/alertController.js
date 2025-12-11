const Alert = require('../models/Alert');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');

// @route   GET /api/alerts
// @desc    List alerts with filters
// @access  Private
const getAlerts = async (req, res) => {
  try {
    const {
      type,
      severity,
      resolved,
      productId,
      warehouseId,
      page = 1,
      limit = 50
    } = req.query;

    const query = { isDeleted: false };

    if (type) {
      query.type = type;
    }

    if (severity) {
      query.severity = severity;
    }

    if (resolved !== undefined) {
      query.resolved = resolved === 'true';
    }

    if (productId) {
      query.productId = productId;
    }

    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    const alerts = await Alert.find(query)
      .populate('productId', 'name sku uom totalOnHand')
      .populate('warehouseId', 'name code')
      .populate('locationId', 'code type')
      .populate('reorderRuleId', 'minQty maxQty reorderQty')
      .populate('createdBy', 'name email')
      .populate('resolvedBy', 'name email')
      .sort({ severity: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Alert.countDocuments(query);

    // Get summary counts
    const summary = await Alert.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$resolved',
          count: { $sum: 1 },
          critical: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
          },
          high: {
            $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      alerts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts',
      error: error.message
    });
  }
};

// @route   POST /api/alerts/resolve
// @desc    Resolve alerts
// @access  Private
const resolveAlert = async (req, res) => {
  try {
    const { alertIds, resolutionNotes } = req.body;

    const alerts = await Alert.find({
      _id: { $in: alertIds },
      isDeleted: false
    });

    if (alerts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No alerts found'
      });
    }

    const updatedAlerts = [];

    for (const alert of alerts) {
      if (!alert.resolved) {
        alert.resolved = true;
        alert.resolvedBy = req.user._id;
        alert.resolvedAt = new Date();
        if (resolutionNotes) {
          alert.resolutionNotes = resolutionNotes;
        }
        await alert.save();
        updatedAlerts.push(alert);
      }
    }

    res.json({
      success: true,
      message: `${updatedAlerts.length} alert(s) resolved successfully`,
      alerts: updatedAlerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resolving alerts',
      error: error.message
    });
  }
};

// @route   POST /api/alerts
// @desc    Create manual alert
// @access  Private
const createAlert = async (req, res) => {
  try {
    const {
      type,
      severity,
      productId,
      warehouseId,
      locationId,
      message,
      currentQty,
      thresholdQty
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

    const alert = await Alert.create({
      type,
      severity: severity || 'medium',
      productId,
      warehouseId,
      locationId,
      message,
      currentQty,
      thresholdQty,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Alert created successfully',
      alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating alert',
      error: error.message
    });
  }
};

// @route   DELETE /api/alerts/:id
// @desc    Delete alert
// @access  Private
const deleteAlert = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert || alert.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.isDeleted = true;
    await alert.save();

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting alert',
      error: error.message
    });
  }
};

module.exports = {
  getAlerts,
  resolveAlert,
  createAlert,
  deleteAlert
};
