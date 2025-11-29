const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const {
  getAdjustments,
  createAdjustment,
  getAdjustmentById,
  applyAdjustment,
  cancelAdjustment
} = require('../controllers/adjustmentController');

// Validation rules
const createAdjustmentValidation = [
  body('reason')
    .isIn(['physical_count', 'damaged', 'lost', 'found', 'expired', 'other'])
    .withMessage('Invalid adjustment reason'),
  body('warehouseId')
    .notEmpty()
    .withMessage('Warehouse is required')
    .isMongoId()
    .withMessage('Invalid warehouse ID'),
  body('lines')
    .isArray({ min: 1 })
    .withMessage('At least one adjustment line is required'),
  body('lines.*.productId')
    .notEmpty()
    .withMessage('Product is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('lines.*.locationId')
    .notEmpty()
    .withMessage('Location is required')
    .isMongoId()
    .withMessage('Invalid location ID'),
  body('lines.*.countedQty')
    .isNumeric()
    .withMessage('Counted quantity must be a number')
    .isFloat({ min: 0 })
    .withMessage('Counted quantity cannot be negative'),
  body('lines.*.systemQty')
    .optional()
    .isNumeric()
    .withMessage('System quantity must be a number'),
  body('notes')
    .optional()
    .trim()
];

const applyAdjustmentValidation = [
  body('idempotencyKey')
    .optional()
    .trim(),
  body('notes')
    .optional()
    .trim()
];

const cancelAdjustmentValidation = [
  body('notes')
    .optional()
    .trim()
];

// Routes
router.get('/', auth, getAdjustments);

router.post(
  '/',
  auth,
  createAdjustmentValidation,
  validate,
  createAdjustment
);

router.get('/:id', auth, getAdjustmentById);

router.post(
  '/:id/apply',
  auth,
  authorize('admin', 'manager'),
  applyAdjustmentValidation,
  validate,
  applyAdjustment
);

router.post(
  '/:id/cancel',
  auth,
  authorize('admin', 'manager'),
  cancelAdjustmentValidation,
  validate,
  cancelAdjustment
);

module.exports = router;
