const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockLocation = require('../models/StockLocation');
const InventoryLedger = require('../models/InventoryLedger');
const Report = require('../models/Report');

// @route   GET /api/reports/stock-ageing
// @desc    Get stock aging report by product
// @access  Private
const getStockAgeing = async (req, res) => {
  try {
    const { warehouseId, daysBucket = '30,60,90' } = req.query;
    
    const buckets = daysBucket.split(',').map(d => parseInt(d)).sort((a, b) => a - b);
    const now = new Date();

    // Get all stock with receipt dates from ledger
    const ageingData = await InventoryLedger.aggregate([
      {
        $match: {
          movementType: { $in: ['receipt', 'adjustment', 'transfer_in'] },
          quantity: { $gt: 0 },
          ...(warehouseId && { warehouseId: mongoose.Types.ObjectId(warehouseId) })
        }
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
        $project: {
          productId: 1,
          productName: '$product.name',
          sku: '$product.sku',
          quantity: 1,
          warehouseId: 1,
          createdAt: 1,
          ageInDays: {
            $divide: [
              { $subtract: [now, '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            productId: '$productId',
            warehouseId: '$warehouseId'
          },
          productName: { $first: '$productName' },
          sku: { $first: '$sku' },
          totalQty: { $sum: '$quantity' },
          oldestDate: { $min: '$createdAt' },
          newestDate: { $max: '$createdAt' },
          avgAge: { $avg: '$ageInDays' }
        }
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id.warehouseId',
          foreignField: '_id',
          as: 'warehouse'
        }
      },
      { $unwind: { path: '$warehouse', preserveNullAndEmptyArrays: true } }
    ]);

    // Categorize by age buckets
    const categorized = ageingData.map(item => {
      const ageInDays = Math.floor(item.avgAge);
      let ageBucket = `${buckets[buckets.length - 1]}+ days`;
      
      for (let i = 0; i < buckets.length; i++) {
        if (ageInDays <= buckets[i]) {
          ageBucket = i === 0 
            ? `0-${buckets[i]} days` 
            : `${buckets[i-1]}-${buckets[i]} days`;
          break;
        }
      }

      return {
        productId: item._id.productId,
        productName: item.productName,
        sku: item.sku,
        warehouseId: item._id.warehouseId,
        warehouseName: item.warehouse?.name || 'N/A',
        totalQty: item.totalQty,
        ageInDays: Math.floor(item.avgAge),
        ageBucket,
        oldestDate: item.oldestDate,
        newestDate: item.newestDate
      };
    });

    // Summary by bucket
    const summary = {};
    buckets.forEach((bucket, idx) => {
      const key = idx === 0 ? `0-${bucket}` : `${buckets[idx-1]}-${bucket}`;
      summary[key] = {
        count: 0,
        totalQty: 0
      };
    });
    summary[`${buckets[buckets.length - 1]}+`] = { count: 0, totalQty: 0 };

    categorized.forEach(item => {
      const bucketKey = item.ageBucket.replace(' days', '');
      if (summary[bucketKey]) {
        summary[bucketKey].count++;
        summary[bucketKey].totalQty += item.totalQty;
      }
    });

    res.json({
      success: true,
      report: categorized,
      summary,
      buckets,
      totalProducts: categorized.length,
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating stock aging report',
      error: error.message
    });
  }
};

// @route   GET /api/reports/turnover
// @desc    Get inventory turnover report
// @access  Private
const getInventoryTurnover = async (req, res) => {
  try {
    const { from, to, warehouseId, productId } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Date range (from and to) is required'
      });
    }

    const dateFrom = new Date(from);
    const dateTo = new Date(to);
    const periodDays = Math.ceil((dateTo - dateFrom) / (1000 * 60 * 60 * 24));

    const matchQuery = {
      createdAt: { $gte: dateFrom, $lte: dateTo },
      isDeleted: false
    };

    if (warehouseId) matchQuery.warehouseId = mongoose.Types.ObjectId(warehouseId);
    if (productId) matchQuery.productId = mongoose.Types.ObjectId(productId);

    // Calculate COGS (Cost of Goods Sold) - outbound movements
    const cogsData = await InventoryLedger.aggregate([
      {
        $match: {
          ...matchQuery,
          movementType: { $in: ['sale', 'delivery', 'adjustment'] },
          quantity: { $lt: 0 }
        }
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
          _id: '$productId',
          productName: { $first: '$product.name' },
          sku: { $first: '$product.sku' },
          costPrice: { $first: '$product.costPrice' },
          totalSold: { $sum: { $abs: '$quantity' } },
          cogs: {
            $sum: {
              $multiply: [
                { $abs: '$quantity' },
                '$product.costPrice'
              ]
            }
          }
        }
      }
    ]);

    // Calculate average inventory for the period
    const avgInventoryData = await StockLocation.aggregate([
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
          _id: '$productId',
          avgQuantity: { $avg: '$quantity' },
          costPrice: { $first: '$product.costPrice' }
        }
      },
      {
        $project: {
          avgQuantity: 1,
          avgInventoryValue: {
            $multiply: ['$avgQuantity', '$costPrice']
          }
        }
      }
    ]);

    // Combine and calculate turnover ratio
    const turnoverData = cogsData.map(cogs => {
      const avgInv = avgInventoryData.find(inv => 
        inv._id.toString() === cogs._id.toString()
      );

      const avgInventoryValue = avgInv?.avgInventoryValue || 0;
      const turnoverRatio = avgInventoryValue > 0 
        ? (cogs.cogs / avgInventoryValue).toFixed(2)
        : 0;

      const daysInInventory = turnoverRatio > 0
        ? (periodDays / turnoverRatio).toFixed(0)
        : periodDays;

      return {
        productId: cogs._id,
        productName: cogs.productName,
        sku: cogs.sku,
        totalSold: cogs.totalSold,
        cogs: cogs.cogs.toFixed(2),
        avgInventoryValue: avgInventoryValue.toFixed(2),
        turnoverRatio: parseFloat(turnoverRatio),
        daysInInventory: parseInt(daysInInventory),
        status: turnoverRatio > 6 ? 'fast_moving' : turnoverRatio > 3 ? 'normal' : 'slow_moving'
      };
    });

    // Sort by turnover ratio descending
    turnoverData.sort((a, b) => b.turnoverRatio - a.turnoverRatio);

    res.json({
      success: true,
      report: turnoverData,
      summary: {
        totalProducts: turnoverData.length,
        avgTurnoverRatio: (
          turnoverData.reduce((sum, p) => sum + p.turnoverRatio, 0) / turnoverData.length
        ).toFixed(2),
        fastMoving: turnoverData.filter(p => p.status === 'fast_moving').length,
        normal: turnoverData.filter(p => p.status === 'normal').length,
        slowMoving: turnoverData.filter(p => p.status === 'slow_moving').length
      },
      period: {
        from: dateFrom,
        to: dateTo,
        days: periodDays
      },
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating turnover report',
      error: error.message
    });
  }
};

// @route   GET /api/reports/slow-moving
// @desc    Get slow-moving items report
// @access  Private
const getSlowMovingItems = async (req, res) => {
  try {
    const { warehouseId, days = 90, minQty = 0 } = req.query;

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // Find products with no outbound movements in the period
    const recentMovements = await InventoryLedger.aggregate([
      {
        $match: {
          createdAt: { $gte: daysAgo },
          movementType: { $in: ['sale', 'delivery'] },
          quantity: { $lt: 0 },
          ...(warehouseId && { warehouseId: mongoose.Types.ObjectId(warehouseId) })
        }
      },
      {
        $group: {
          _id: '$productId',
          lastMovement: { $max: '$createdAt' },
          totalMoved: { $sum: { $abs: '$quantity' } }
        }
      }
    ]);

    const productsWithMovement = new Set(
      recentMovements.map(m => m._id.toString())
    );

    // Get all products in stock
    const stockQuery = {
      quantity: { $gt: parseInt(minQty) }
    };
    if (warehouseId) stockQuery.warehouseId = mongoose.Types.ObjectId(warehouseId);

    const allStock = await StockLocation.aggregate([
      { $match: stockQuery },
      {
        $group: {
          _id: '$productId',
          totalQty: { $sum: '$quantity' },
          locations: { $sum: 1 }
        }
      },
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
        $lookup: {
          from: 'inventoryledgers',
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$productId', '$$productId'] },
                movementType: { $in: ['sale', 'delivery'] },
                quantity: { $lt: 0 }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: 'lastMovement'
        }
      }
    ]);

    // Filter slow-moving items
    const slowMovingItems = allStock
      .filter(item => !productsWithMovement.has(item._id.toString()))
      .map(item => {
        const lastMovement = item.lastMovement[0];
        const daysSinceLastMovement = lastMovement
          ? Math.floor((new Date() - new Date(lastMovement.createdAt)) / (1000 * 60 * 60 * 24))
          : null;

        return {
          productId: item._id,
          productName: item.product.name,
          sku: item.product.sku,
          category: item.product.category,
          currentQty: item.totalQty,
          locations: item.locations,
          costPrice: item.product.costPrice,
          totalValue: (item.totalQty * item.product.costPrice).toFixed(2),
          lastMovementDate: lastMovement?.createdAt || null,
          daysSinceLastMovement,
          status: !lastMovement ? 'no_movement' : daysSinceLastMovement > 180 ? 'dead_stock' : 'slow_moving'
        };
      });

    // Sort by days since last movement (descending)
    slowMovingItems.sort((a, b) => 
      (b.daysSinceLastMovement || Infinity) - (a.daysSinceLastMovement || Infinity)
    );

    const totalValue = slowMovingItems.reduce((sum, item) => 
      sum + parseFloat(item.totalValue), 0
    );

    res.json({
      success: true,
      report: slowMovingItems,
      summary: {
        totalProducts: slowMovingItems.length,
        totalQty: slowMovingItems.reduce((sum, item) => sum + item.currentQty, 0),
        totalValue: totalValue.toFixed(2),
        noMovement: slowMovingItems.filter(i => i.status === 'no_movement').length,
        deadStock: slowMovingItems.filter(i => i.status === 'dead_stock').length,
        slowMoving: slowMovingItems.filter(i => i.status === 'slow_moving').length
      },
      period: {
        days: parseInt(days),
        from: daysAgo,
        to: new Date()
      },
      generatedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating slow-moving items report',
      error: error.message
    });
  }
};

// @route   POST /api/reports/custom
// @desc    Run custom report (async for complex queries)
// @access  Private
const runCustomReport = async (req, res) => {
  try {
    const { reportType, reportName, parameters } = req.body;

    // Create report record
    const report = await Report.create({
      reportType: reportType || 'custom',
      reportName,
      parameters,
      status: 'processing',
      createdBy: req.user._id
    });

    // For demo purposes, process immediately
    // In production, this should be a background job
    try {
      let results;
      const startTime = Date.now();

      switch (reportType) {
        case 'stock_ageing':
          // Call stock ageing logic
          results = { message: 'Use GET /api/reports/stock-ageing endpoint' };
          break;
        
        case 'turnover':
          // Call turnover logic
          results = { message: 'Use GET /api/reports/turnover endpoint' };
          break;
        
        case 'slow_moving':
          // Call slow-moving logic
          results = { message: 'Use GET /api/reports/slow-moving endpoint' };
          break;
        
        default:
          results = { message: 'Custom report type not implemented' };
      }

      const processingTime = Date.now() - startTime;

      // Update report with results
      report.status = 'completed';
      report.results = {
        data: results,
        generatedAt: new Date(),
        totalRecords: Array.isArray(results) ? results.length : 0
      };
      report.processingTime = processingTime;
      await report.save();

      res.json({
        success: true,
        message: 'Report generated successfully',
        reportId: report._id,
        status: report.status,
        processingTime,
        results: report.results
      });
    } catch (processingError) {
      report.status = 'failed';
      report.errorMessage = processingError.message;
      await report.save();

      throw processingError;
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error running custom report',
      error: error.message
    });
  }
};

// @route   GET /api/reports/:id
// @desc    Get custom report by ID
// @access  Private
const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('parameters.warehouseId', 'name code')
      .populate('parameters.productId', 'name sku')
      .populate('parameters.categoryId', 'name');

    if (!report || report.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching report',
      error: error.message
    });
  }
};

module.exports = {
  getStockAgeing,
  getInventoryTurnover,
  getSlowMovingItems,
  runCustomReport,
  getReportById
};
