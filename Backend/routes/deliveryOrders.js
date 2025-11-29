const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const validate = require('../middleware/validate');
const {
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
} = require('../controllers/deliveryOrderController');
const { auth, authorize } = require('../middleware/auth');

// Validation rules
const listDeliveryOrdersValidation = [
  query('status').optional().isIn(['draft', 'waiting', 'picking', 'packed', 'ready', 'done', 'canceled']),
  query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  query('customerName').optional().trim(),
  query('warehouseId').optional().isMongoId(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

const createDeliveryOrderValidation = [
  body('orderNumber').optional().trim(),
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('customerEmail').optional().isEmail(),
  body('customerPhone').optional().trim(),
  body('warehouseId').notEmpty().withMessage('Warehouse ID is required').isMongoId(),
  body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
  body('deliveryAddress.street').notEmpty().withMessage('Street is required'),
  body('deliveryAddress.city').notEmpty().withMessage('City is required'),
  body('deliveryAddress.state').optional().trim(),
  body('deliveryAddress.postalCode').optional().trim(),
  body('deliveryAddress.country').notEmpty().withMessage('Country is required'),
  body('lines').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lines.*.productId').notEmpty().withMessage('Product ID is required').isMongoId(),
  body('lines.*.orderedQty').isInt({ min: 1 }).withMessage('Ordered quantity must be at least 1'),
  body('lines.*.unitPrice').optional().isFloat({ min: 0 }),
  body('lines.*.locationId').optional().isMongoId(),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('autoReserve').optional().isBoolean(),
  body('expectedDeliveryDate').optional().isISO8601(),
  body('notes').optional().trim()
];

const updateDeliveryOrderValidation = [
  param('id').isMongoId(),
  body('customerName').optional().trim(),
  body('customerEmail').optional().isEmail(),
  body('customerPhone').optional().trim(),
  body('deliveryAddress').optional(),
  body('lines').optional().isArray({ min: 1 }),
  body('lines.*.productId').optional().isMongoId(),
  body('lines.*.orderedQty').optional().isInt({ min: 1 }),
  body('lines.*.unitPrice').optional().isFloat({ min: 0 }),
  body('lines.*.locationId').optional().isMongoId(),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
  body('expectedDeliveryDate').optional().isISO8601(),
  body('notes').optional().trim()
];

const reserveStockValidation = [
  param('id').isMongoId(),
  body('idempotencyKey').optional().trim(),
  body('expiryDate').optional().isISO8601(),
  body('notes').optional().trim()
];

const pickItemsValidation = [
  param('id').isMongoId(),
  body('pickedLines').isArray({ min: 1 }).withMessage('Picked lines are required'),
  body('pickedLines.*.lineId').notEmpty().withMessage('Line ID is required'),
  body('pickedLines.*.qty').isInt({ min: 1 }).withMessage('Picked quantity must be at least 1'),
  body('pickedLines.*.locationId').optional().isMongoId(),
  body('userId').optional().isMongoId()
];

const packItemsValidation = [
  param('id').isMongoId(),
  body('packages').isArray({ min: 1 }).withMessage('At least one package is required'),
  body('packages.*.packageId').optional().trim(),
  body('packages.*.weight').optional().isFloat({ min: 0 }),
  body('packages.*.dimensions').optional(),
  body('packages.*.dimensions.length').optional().isFloat({ min: 0 }),
  body('packages.*.dimensions.width').optional().isFloat({ min: 0 }),
  body('packages.*.dimensions.height').optional().isFloat({ min: 0 }),
  body('packages.*.trackingNumber').optional().trim(),
  body('packages.*.carrier').optional().trim(),
  body('packages.*.lines').isArray({ min: 1 }).withMessage('Package must contain at least one line'),
  body('packages.*.lines.*.lineId').notEmpty().withMessage('Line ID is required'),
  body('packages.*.lines.*.qty').isInt({ min: 1 }).withMessage('Packed quantity must be at least 1'),
  body('trackingNumber').optional().trim()
];

const validateDeliveryOrderValidation = [
  param('id').isMongoId(),
  body('idempotencyKey').optional().trim()
];

const cancelDeliveryOrderValidation = [
  param('id').isMongoId(),
  body('notes').optional().trim()
];

// Routes
// @route   GET /api/delivery-orders
// @desc    List delivery orders with filters
// @access  Private
router.get('/', auth, listDeliveryOrdersValidation, validate, getDeliveryOrders);

// @route   POST /api/delivery-orders
// @desc    Create new delivery order
// @access  Private
router.post('/', auth, createDeliveryOrderValidation, validate, createDeliveryOrder);

// @route   GET /api/delivery-orders/:id
// @desc    Get delivery order by ID
// @access  Private
router.get('/:id', auth, [param('id').isMongoId()], validate, getDeliveryOrderById);

// @route   PUT /api/delivery-orders/:id
// @desc    Update delivery order (draft/waiting only)
// @access  Private
router.put('/:id', auth, updateDeliveryOrderValidation, validate, updateDeliveryOrder);

// @route   POST /api/delivery-orders/:id/reserve
// @desc    Reserve stock for delivery order
// @access  Private
router.post('/:id/reserve', auth, reserveStockValidation, validate, reserveStock);

// @route   POST /api/delivery-orders/:id/pick
// @desc    Mark items as picked
// @access  Private
router.post('/:id/pick', auth, pickItemsValidation, validate, pickItems);

// @route   POST /api/delivery-orders/:id/pack
// @desc    Confirm packing and add packages
// @access  Private
router.post('/:id/pack', auth, packItemsValidation, validate, packItems);

// @route   POST /api/delivery-orders/:id/validate
// @desc    Finalize delivery order and decrease stock
// @access  Private (admin/manager)
router.post('/:id/validate', auth, authorize('admin', 'manager'), validateDeliveryOrderValidation, validate, validateDeliveryOrder);

// @route   POST /api/delivery-orders/:id/cancel
// @desc    Cancel delivery order
// @access  Private (admin/manager)
router.post('/:id/cancel', auth, authorize('admin', 'manager'), cancelDeliveryOrderValidation, validate, cancelDeliveryOrder);

// @route   GET /api/delivery-orders/:id/labels
// @desc    Get shipping labels
// @access  Private
router.get('/:id/labels', auth, [param('id').isMongoId()], validate, getLabels);

module.exports = router;
