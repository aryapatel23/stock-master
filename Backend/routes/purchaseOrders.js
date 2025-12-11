const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  createFromReorder,
  updatePurchaseOrderStatus
} = require('../controllers/purchaseOrderController');

// @route   GET /api/purchase-orders
// @desc    List purchase orders with filters
// @access  Private
router.get(
  '/',
  auth,
  getPurchaseOrders
);

// @route   GET /api/purchase-orders/:id
// @desc    Get purchase order by ID
// @access  Private
router.get(
  '/:id',
  auth,
  getPurchaseOrderById
);

// @route   POST /api/purchase-orders
// @desc    Create purchase order
// @access  Private (Admin/Manager)
router.post(
  '/',
  auth,
  authorize('admin', 'manager'),
  [
    body('supplierId').notEmpty().withMessage('Supplier ID is required'),
    body('warehouseId').notEmpty().withMessage('Warehouse ID is required'),
    body('lines').isArray({ min: 1 }).withMessage('At least one line item is required'),
    body('lines.*.productId').notEmpty().withMessage('Product ID is required'),
    body('lines.*.orderedQty').isInt({ min: 1 }).withMessage('Ordered quantity must be at least 1')
  ],
  createPurchaseOrder
);

// @route   POST /api/purchase-orders/from-reorder
// @desc    Create purchase order from reorder rules
// @access  Private (Admin/Manager)
router.post(
  '/from-reorder',
  auth,
  authorize('admin', 'manager'),
  [
    body('warehouseId').notEmpty().withMessage('Warehouse ID is required'),
    body('supplierId').notEmpty().withMessage('Supplier ID is required')
  ],
  createFromReorder
);

// @route   PUT /api/purchase-orders/:id/status
// @desc    Update purchase order status
// @access  Private (Admin/Manager)
router.put(
  '/:id/status',
  auth,
  authorize('admin', 'manager'),
  [
    body('status').isIn(['draft', 'submitted', 'approved', 'ordered', 'partial_received', 'received', 'canceled'])
      .withMessage('Invalid status')
  ],
  updatePurchaseOrderStatus
);

module.exports = router;
