const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockLocation = require('../models/StockLocation');
const Receipt = require('../models/Receipt');
const DeliveryOrder = require('../models/DeliveryOrder');
const Transfer = require('../models/Transfer');
const InventoryLedger = require('../models/InventoryLedger');
const Alert = require('../models/Alert');
const ReorderRule = require('../models/ReorderRule');

// @route   GET /api/dashboard/summary
// @desc    Get dashboard summary with aggregated KPIs
// @access  Private
const getDashboardSummary = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    const query = { isDeleted: false };
    
    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    // Total SKUs (unique products)
    const totalSKUs = await Product.countDocuments({ isDeleted: false, isActive: true });

    // Total on-hand stock value
    const stockValueAgg = await StockLocation.aggregate([
      {
        $match: warehouseId ? { warehouseId: mongoose.Types.ObjectId(warehouseId) } : {}
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: null,
          totalOnHand: { $sum: '$quantity' },
          totalValue: {
            $sum: { $multiply: ['$quantity', '$product.costPrice'] }
          }
        }
      }
    ]);

    const stockSummary = stockValueAgg[0] || { totalOnHand: 0, totalValue: 0 };

    // Low stock count (products below reorder level)
    const lowStockCount = await Alert.countDocuments({
      type: { $in: ['low_stock', 'out_of_stock'] },
      resolved: false,
      isDeleted: false
    });

    // Pending receipts
    const pendingReceipts = await Receipt.countDocuments({
      status: { $in: ['draft', 'in_transit'] },
      isDeleted: false
    });

    // Pending delivery orders
    const pendingDeliveryOrders = await DeliveryOrder.countDocuments({
      status: { $in: ['draft', 'picking', 'packing', 'ready'] },
      isDeleted: false
    });

    // Pending transfers
    const pendingTransfers = await Transfer.countDocuments({
      status: { $in: ['draft', 'pending', 'in_transit'] },
      isDeleted: false
    });

    // Top movers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topMovers = await InventoryLedger.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          movementType: { $in: ['sale', 'delivery'] }
        }
      },
      {
        $group: {
          _id: '$productId',
          totalQty: { $sum: { $abs: '$quantity' } }
        }
      },
      { $sort: { totalQty: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          productName: '$product.name',
          sku: '$product.sku',
          totalQty: 1
        }
      }
    ]);

    // Recent alerts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAlerts = await Alert.find({
      createdAt: { $gte: sevenDaysAgo },
      resolved: false,
      isDeleted: false
    })
      .populate('productId', 'name sku')
      .populate('warehouseId', 'name code')
      .sort({ createdAt: -1 })
      .limit(10);

    // Stock by warehouse
    const stockByWarehouse = await StockLocation.aggregate([
      {
        $group: {
          _id: '$warehouseId',
          totalQty: { $sum: '$quantity' },
          uniqueProducts: { $addToSet: '$productId' }
        }
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouse'
        }
      },
      { $unwind: '$warehouse' },
      {
        $project: {
          warehouseId: '$_id',
          warehouseName: '$warehouse.name',
          warehouseCode: '$warehouse.code',
          totalQty: 1,
          productCount: { $size: '$uniqueProducts' }
        }
      },
      { $sort: { totalQty: -1 } }
    ]);

    res.json({
      success: true,
      summary: {
        totalSKUs,
        totalOnHand: stockSummary.totalOnHand,
        totalStockValue: stockSummary.totalValue,
        lowStockCount,
        pendingReceipts,
        pendingDeliveryOrders,
        pendingTransfers
      },
      topMovers,
      recentAlerts,
      stockByWarehouse,
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardSummary
};
