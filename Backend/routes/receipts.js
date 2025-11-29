const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { auth, authorize } = require('../middleware/auth');
const receiptController = require('../controllers/receiptController');

const router = express.Router();

// Validation rules
const createReceiptValidation = [
  body('warehouseId')
    .notEmpty().withMessage('Warehouse ID is required')
    .isMongoId().withMessage('Invalid warehouse ID'),
  body('expectedDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('supplierId')
    .optional()
    .isMongoId().withMessage('Invalid supplier ID'),
  body('supplierName')
    .optional()
    .trim(),
  body('referenceNumber')
    .optional()
    .trim(),
  body('lines')
    .isArray({ min: 1 }).withMessage('At least one line item is required'),
  body('lines.*.productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),
  body('lines.*.expectedQty')
    .notEmpty().withMessage('Expected quantity is required')
    .isInt({ min: 1 }).withMessage('Expected quantity must be at least 1'),
  body('lines.*.uom')
    .optional()
    .trim(),
  body('lines.*.unitPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Unit price must be 0 or greater')
];

const updateReceiptValidation = [
  param('id')
    .isMongoId().withMessage('Invalid receipt ID'),
  body('warehouseId')
    .optional()
    .isMongoId().withMessage('Invalid warehouse ID'),
  body('expectedDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),
  body('supplierId')
    .optional()
    .isMongoId().withMessage('Invalid supplier ID'),
  body('lines')
    .optional()
    .isArray({ min: 1 }).withMessage('At least one line item required'),
  body('status')
    .optional()
    .isIn(['draft', 'waiting', 'ready', 'done', 'canceled']).withMessage('Invalid status')
];

const updateQtyValidation = [
  param('id')
    .isMongoId().withMessage('Invalid receipt ID'),
  body('lines')
    .isArray({ min: 1 }).withMessage('At least one line update is required'),
  body('lines.*.lineId')
    .notEmpty().withMessage('Line ID is required'),
  body('lines.*.receivedQty')
    .notEmpty().withMessage('Received quantity is required')
    .isInt({ min: 0 }).withMessage('Received quantity must be 0 or greater')
];

const validateReceiptValidation = [
  param('id')
    .isMongoId().withMessage('Invalid receipt ID'),
  body('idempotencyKey')
    .optional()
    .trim()
];

const cancelReceiptValidation = [
  param('id')
    .isMongoId().withMessage('Invalid receipt ID'),
  body('notes')
    .optional()
    .trim()
];

// Routes
router.get('/', auth, receiptController.getReceipts);
router.post('/', auth, createReceiptValidation, validate, receiptController.createReceipt);
router.get('/:id', auth, param('id').isMongoId(), validate, receiptController.getReceiptById);
router.put('/:id', auth, updateReceiptValidation, validate, receiptController.updateReceipt);
router.post('/:id/update-qty', auth, updateQtyValidation, validate, receiptController.updateReceivedQty);
router.post('/:id/validate', auth, authorize('admin', 'manager'), validateReceiptValidation, validate, receiptController.validateReceipt);
router.post('/:id/cancel', auth, authorize('admin', 'manager'), cancelReceiptValidation, validate, receiptController.cancelReceipt);
router.get('/:id/attachments', auth, param('id').isMongoId(), validate, receiptController.getAttachments);

module.exports = router;
