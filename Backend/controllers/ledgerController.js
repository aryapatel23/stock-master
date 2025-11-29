const InventoryLedger = require('../models/InventoryLedger');
const Product = require('../models/Product');
const { Parser } = require('json2csv');

// @route   GET /api/ledger
// @desc    List all ledger entries with filters
// @access  Private
const getLedgerEntries = async (req, res) => {
  try {
    const {
      productId,
      warehouseId,
      locationId,
      transactionType,
      referenceType,
      referenceId,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    if (productId) {
      query.productId = productId;
    }

    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    if (locationId) {
      query.locationId = locationId;
    }

    if (transactionType) {
      query.transactionType = transactionType;
    }

    if (referenceType) {
      query.referenceType = referenceType;
    }

    if (referenceId) {
      query.referenceId = referenceId;
    }

    if (dateFrom || dateTo) {
      query.transactionDate = {};
      if (dateFrom) {
        query.transactionDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.transactionDate.$lte = new Date(dateTo);
      }
    }

    const ledgerEntries = await InventoryLedger.find(query)
      .populate('productId', 'name sku uom')
      .populate('warehouseId', 'name code')
      .populate('locationId', 'code type')
      .populate('createdBy', 'name email')
      .sort({ transactionDate: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await InventoryLedger.countDocuments(query);

    // Transform to match requested format
    const formattedEntries = ledgerEntries.map(entry => ({
      id: entry._id,
      productId: entry.productId?._id,
      productName: entry.productId?.name,
      productSku: entry.productId?.sku,
      qtyDelta: entry.quantity,
      operationType: entry.transactionType,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      referenceNumber: entry.referenceNumber,
      fromLocation: entry.transactionType === 'transfer_out' ? entry.locationId : null,
      toLocation: entry.transactionType === 'transfer_in' ? entry.locationId : null,
      location: entry.locationId,
      warehouse: entry.warehouseId,
      balanceBefore: entry.balanceBefore,
      balanceAfter: entry.balanceAfter,
      unitPrice: entry.unitPrice,
      totalValue: entry.totalValue,
      userId: entry.createdBy?._id,
      userName: entry.createdBy?.name,
      timestamp: entry.transactionDate,
      note: entry.notes,
      createdAt: entry.createdAt
    }));

    res.json({
      success: true,
      ledgerEntries: formattedEntries,
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
      message: 'Error fetching ledger entries',
      error: error.message
    });
  }
};

// @route   GET /api/ledger/:productId
// @desc    Get product-specific ledger history
// @access  Private
const getProductLedger = async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      warehouseId,
      locationId,
      transactionType,
      dateFrom,
      dateTo,
      page = 1,
      limit = 100
    } = req.query;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const query = { productId };

    if (warehouseId) {
      query.warehouseId = warehouseId;
    }

    if (locationId) {
      query.locationId = locationId;
    }

    if (transactionType) {
      query.transactionType = transactionType;
    }

    if (dateFrom || dateTo) {
      query.transactionDate = {};
      if (dateFrom) {
        query.transactionDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.transactionDate.$lte = new Date(dateTo);
      }
    }

    const ledgerEntries = await InventoryLedger.find(query)
      .populate('warehouseId', 'name code')
      .populate('locationId', 'code type')
      .populate('createdBy', 'name email')
      .sort({ transactionDate: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await InventoryLedger.countDocuments(query);

    // Calculate summary statistics
    const summary = await InventoryLedger.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          totalQty: { $sum: '$quantity' }
        }
      }
    ]);

    // Format entries
    const formattedEntries = ledgerEntries.map(entry => ({
      id: entry._id,
      qtyDelta: entry.quantity,
      operationType: entry.transactionType,
      referenceType: entry.referenceType,
      referenceId: entry.referenceId,
      referenceNumber: entry.referenceNumber,
      location: entry.locationId,
      warehouse: entry.warehouseId,
      balanceBefore: entry.balanceBefore,
      balanceAfter: entry.balanceAfter,
      unitPrice: entry.unitPrice,
      totalValue: entry.totalValue,
      userId: entry.createdBy?._id,
      userName: entry.createdBy?.name,
      timestamp: entry.transactionDate,
      note: entry.notes
    }));

    res.json({
      success: true,
      product: {
        id: product._id,
        name: product.name,
        sku: product.sku,
        uom: product.uom,
        currentStock: product.totalOnHand
      },
      ledgerEntries: formattedEntries,
      summary,
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
      message: 'Error fetching product ledger',
      error: error.message
    });
  }
};

// @route   GET /api/ledger/export
// @desc    Export ledger entries (CSV/PDF)
// @access  Private
const exportLedger = async (req, res) => {
  try {
    const {
      productId,
      warehouseId,
      locationId,
      transactionType,
      referenceType,
      dateFrom,
      dateTo,
      format = 'csv'
    } = req.query;

    const query = {};

    if (productId) query.productId = productId;
    if (warehouseId) query.warehouseId = warehouseId;
    if (locationId) query.locationId = locationId;
    if (transactionType) query.transactionType = transactionType;
    if (referenceType) query.referenceType = referenceType;

    if (dateFrom || dateTo) {
      query.transactionDate = {};
      if (dateFrom) query.transactionDate.$gte = new Date(dateFrom);
      if (dateTo) query.transactionDate.$lte = new Date(dateTo);
    }

    const ledgerEntries = await InventoryLedger.find(query)
      .populate('productId', 'name sku uom')
      .populate('warehouseId', 'name code')
      .populate('locationId', 'code type')
      .populate('createdBy', 'name email')
      .sort({ transactionDate: -1 })
      .limit(10000); // Max 10k records for export

    if (format === 'csv') {
      // Prepare data for CSV
      const data = ledgerEntries.map(entry => ({
        'Transaction Date': entry.transactionDate ? new Date(entry.transactionDate).toISOString() : '',
        'Product SKU': entry.productId?.sku || '',
        'Product Name': entry.productId?.name || '',
        'UOM': entry.productId?.uom || '',
        'Warehouse': entry.warehouseId?.name || '',
        'Location': entry.locationId?.code || '',
        'Transaction Type': entry.transactionType,
        'Reference Type': entry.referenceType || '',
        'Reference Number': entry.referenceNumber || '',
        'Quantity Delta': entry.quantity,
        'Balance Before': entry.balanceBefore,
        'Balance After': entry.balanceAfter,
        'Unit Price': entry.unitPrice || '',
        'Total Value': entry.totalValue || '',
        'User': entry.createdBy?.name || '',
        'Notes': entry.notes || ''
      }));

      const fields = [
        'Transaction Date',
        'Product SKU',
        'Product Name',
        'UOM',
        'Warehouse',
        'Location',
        'Transaction Type',
        'Reference Type',
        'Reference Number',
        'Quantity Delta',
        'Balance Before',
        'Balance After',
        'Unit Price',
        'Total Value',
        'User',
        'Notes'
      ];

      const json2csvParser = new Parser({ fields });
      const csv = json2csvParser.parse(data);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=ledger-export-${Date.now()}.csv`);
      res.send(csv);
    } else if (format === 'json') {
      // JSON format
      const data = ledgerEntries.map(entry => ({
        id: entry._id,
        transactionDate: entry.transactionDate,
        product: {
          id: entry.productId?._id,
          sku: entry.productId?.sku,
          name: entry.productId?.name,
          uom: entry.productId?.uom
        },
        warehouse: {
          id: entry.warehouseId?._id,
          name: entry.warehouseId?.name,
          code: entry.warehouseId?.code
        },
        location: {
          id: entry.locationId?._id,
          code: entry.locationId?.code,
          type: entry.locationId?.type
        },
        transactionType: entry.transactionType,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        referenceNumber: entry.referenceNumber,
        quantity: entry.quantity,
        balanceBefore: entry.balanceBefore,
        balanceAfter: entry.balanceAfter,
        unitPrice: entry.unitPrice,
        totalValue: entry.totalValue,
        user: {
          id: entry.createdBy?._id,
          name: entry.createdBy?.name,
          email: entry.createdBy?.email
        },
        notes: entry.notes
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=ledger-export-${Date.now()}.json`);
      res.json({
        success: true,
        exportDate: new Date(),
        totalRecords: data.length,
        filters: query,
        data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Supported formats: csv, json'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting ledger',
      error: error.message
    });
  }
};

module.exports = {
  getLedgerEntries,
  getProductLedger,
  exportLedger
};
