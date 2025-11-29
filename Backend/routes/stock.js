const express = require('express');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const stockController = require('../controllers/stockController');
const reservationController = require('../controllers/reservationController');
const stockAdjustController = require('../controllers/stockAdjustController');

const router = express.Router();

// Validation rules
const reserveStockValidation = [
  body('referenceType')
    .notEmpty().withMessage('Reference type is required')
    .isIn(['delivery_order', 'transfer', 'pick', 'other']).withMessage('Invalid reference type'),
  body('referenceId')
    .notEmpty().withMessage('Reference ID is required')
    .trim(),
  body('lines')
    .isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lines.*.productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),
  body('lines.*.locationId')
    .optional()
    .isMongoId().withMessage('Invalid location ID'),
  body('lines.*.qty')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('expiryMinutes')
    .optional()
    .isInt({ min: 1, max: 1440 }).withMessage('Expiry must be between 1-1440 minutes')
];

const releaseStockValidation = [
  body('reservationId')
    .optional()
    .isMongoId().withMessage('Invalid reservation ID'),
  body('referenceId')
    .optional()
    .trim()
];

const adjustStockValidation = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),
  body('locationId')
    .notEmpty().withMessage('Location ID is required')
    .isMongoId().withMessage('Invalid location ID'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 0 }).withMessage('Quantity must be 0 or greater'),
  body('type')
    .optional()
    .isIn(['set', 'add']).withMessage('Type must be "set" or "add"')
];

// Stock query routes
router.get('/', auth, stockController.getStock);
router.get('/availability', auth, stockController.checkAvailability);
router.get('/:productId', auth, stockController.getStockByProduct);

// Stock adjustment route (for testing/initial setup)
router.post('/adjust', auth, adjustStockValidation, validate, stockAdjustController.adjustStock);

// Reservation routes
router.post('/reserve', auth, reserveStockValidation, validate, reservationController.reserveStock);
router.post('/release', auth, releaseStockValidation, validate, reservationController.releaseStock);

module.exports = router;
