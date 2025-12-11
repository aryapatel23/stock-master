const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const {
  getReorderRules,
  createReorderRule,
  updateReorderRule,
  deleteReorderRule,
  checkReorderLevels
} = require('../controllers/reorderController');

// @route   GET /api/reorder-rules
// @desc    List reorder rules with filters
// @access  Private
router.get(
  '/',
  auth,
  getReorderRules
);

// @route   POST /api/reorder-rules
// @desc    Create reorder rule
// @access  Private (Admin/Manager)
router.post(
  '/',
  auth,
  authorize('admin', 'manager'),
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('minQty').isInt({ min: 0 }).withMessage('Minimum quantity must be a positive integer'),
    body('reorderQty').isInt({ min: 1 }).withMessage('Reorder quantity must be at least 1'),
    body('supplierId').notEmpty().withMessage('Supplier ID is required')
  ],
  createReorderRule
);

// @route   PUT /api/reorder-rules/:id
// @desc    Update reorder rule
// @access  Private (Admin/Manager)
router.put(
  '/:id',
  auth,
  authorize('admin', 'manager'),
  updateReorderRule
);

// @route   DELETE /api/reorder-rules/:id
// @desc    Delete reorder rule
// @access  Private (Admin/Manager)
router.delete(
  '/:id',
  auth,
  authorize('admin', 'manager'),
  deleteReorderRule
);

// @route   POST /api/reorder-rules/check
// @desc    Check reorder levels and generate alerts
// @access  Private (Admin/Manager)
router.post(
  '/check',
  auth,
  authorize('admin', 'manager'),
  checkReorderLevels
);

module.exports = router;
