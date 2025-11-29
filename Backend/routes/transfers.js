const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const validate = require('../middleware/validate');
const {
  getTransfers,
  createTransfer,
  getTransferById,
  executeTransfer,
  cancelTransfer
} = require('../controllers/transferController');
const { auth, authorize } = require('../middleware/auth');

// Validation rules
const listTransfersValidation = [
  query('status').optional().isIn(['draft', 'pending', 'in_transit', 'completed', 'canceled']),
  query('fromWarehouse').optional().isMongoId(),
  query('toWarehouse').optional().isMongoId(),
  query('fromLocation').optional().isMongoId(),
  query('toLocation').optional().isMongoId(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

const createTransferValidation = [
  body('fromLocationId').notEmpty().withMessage('Source location ID is required').isMongoId(),
  body('toLocationId').notEmpty().withMessage('Destination location ID is required').isMongoId(),
  body('lines').isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lines.*.productId').notEmpty().withMessage('Product ID is required').isMongoId(),
  body('lines.*.requestedQty').optional().isInt({ min: 1 }).withMessage('Requested quantity must be at least 1'),
  body('lines.*.qty').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('expectedDate').optional().isISO8601(),
  body('notes').optional().trim()
];

const executeTransferValidation = [
  param('id').isMongoId(),
  body('executedBy').optional().isMongoId(),
  body('idempotencyKey').optional().trim(),
  body('notes').optional().trim()
];

const cancelTransferValidation = [
  param('id').isMongoId(),
  body('notes').optional().trim()
];

// Routes
// @route   GET /api/transfers
// @desc    List transfers with filters
// @access  Private
router.get('/', auth, listTransfersValidation, validate, getTransfers);

// @route   POST /api/transfers
// @desc    Create transfer request
// @access  Private
router.post('/', auth, createTransferValidation, validate, createTransfer);

// @route   GET /api/transfers/:id
// @desc    Get transfer by ID
// @access  Private
router.get('/:id', auth, [param('id').isMongoId()], validate, getTransferById);

// @route   POST /api/transfers/:id/execute
// @desc    Execute transfer - move stock between locations
// @access  Private (admin/manager)
router.post('/:id/execute', auth, authorize('admin', 'manager'), executeTransferValidation, validate, executeTransfer);

// @route   POST /api/transfers/:id/cancel
// @desc    Cancel transfer request
// @access  Private (admin/manager)
router.post('/:id/cancel', auth, authorize('admin', 'manager'), cancelTransferValidation, validate, cancelTransfer);

module.exports = router;
