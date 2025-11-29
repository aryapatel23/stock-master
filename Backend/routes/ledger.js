const express = require('express');
const router = express.Router();
const { query, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const {
  getLedgerEntries,
  getProductLedger,
  exportLedger
} = require('../controllers/ledgerController');

// Validation rules
const listLedgerValidation = [
  query('productId')
    .optional()
    .isMongoId()
    .withMessage('Invalid product ID'),
  query('warehouseId')
    .optional()
    .isMongoId()
    .withMessage('Invalid warehouse ID'),
  query('locationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid location ID'),
  query('transactionType')
    .optional()
    .isIn(['receipt', 'adjustment', 'transfer_in', 'transfer_out', 'delivery', 'reversal', 'cycle_count'])
    .withMessage('Invalid transaction type'),
  query('referenceType')
    .optional()
    .isIn(['receipt', 'adjustment', 'transfer', 'delivery_order', 'reservation', 'cycle_count'])
    .withMessage('Invalid reference type'),
  query('referenceId')
    .optional()
    .isMongoId()
    .withMessage('Invalid reference ID'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateFrom'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateTo'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const productLedgerValidation = [
  param('productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  query('warehouseId')
    .optional()
    .isMongoId()
    .withMessage('Invalid warehouse ID'),
  query('locationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid location ID'),
  query('transactionType')
    .optional()
    .isIn(['receipt', 'adjustment', 'transfer_in', 'transfer_out', 'delivery', 'reversal', 'cycle_count'])
    .withMessage('Invalid transaction type'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateFrom'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateTo'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500')
];

const exportLedgerValidation = [
  query('productId')
    .optional()
    .isMongoId()
    .withMessage('Invalid product ID'),
  query('warehouseId')
    .optional()
    .isMongoId()
    .withMessage('Invalid warehouse ID'),
  query('locationId')
    .optional()
    .isMongoId()
    .withMessage('Invalid location ID'),
  query('transactionType')
    .optional()
    .isIn(['receipt', 'adjustment', 'transfer_in', 'transfer_out', 'delivery', 'reversal', 'cycle_count'])
    .withMessage('Invalid transaction type'),
  query('referenceType')
    .optional()
    .isIn(['receipt', 'adjustment', 'transfer', 'delivery_order', 'reservation', 'cycle_count'])
    .withMessage('Invalid reference type'),
  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateFrom'),
  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for dateTo'),
  query('format')
    .optional()
    .isIn(['csv', 'json'])
    .withMessage('Format must be csv or json')
];

// Routes
router.get(
  '/export',
  auth,
  exportLedgerValidation,
  validate,
  exportLedger
);

router.get(
  '/:productId',
  auth,
  productLedgerValidation,
  validate,
  getProductLedger
);

router.get(
  '/',
  auth,
  listLedgerValidation,
  validate,
  getLedgerEntries
);

module.exports = router;
