const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const {
  getAlerts,
  resolveAlert,
  createAlert,
  deleteAlert
} = require('../controllers/alertController');

// @route   GET /api/alerts
// @desc    List alerts with filters and summary
// @access  Private
router.get(
  '/',
  auth,
  getAlerts
);

// @route   POST /api/alerts
// @desc    Create alert
// @access  Private (Admin/Manager)
router.post(
  '/',
  auth,
  authorize('admin', 'manager'),
  [
    body('type').isIn(['low_stock', 'out_of_stock', 'backorder', 'expiring', 'reorder_needed', 'overstock'])
      .withMessage('Invalid alert type'),
    body('severity').isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Invalid severity level'),
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('message').notEmpty().withMessage('Message is required')
  ],
  createAlert
);

// @route   POST /api/alerts/resolve
// @desc    Resolve alerts (batch)
// @access  Private (Admin/Manager)
router.post(
  '/resolve',
  auth,
  authorize('admin', 'manager'),
  [
    body('alertIds').isArray({ min: 1 }).withMessage('At least one alert ID is required'),
    body('alertIds.*').notEmpty().withMessage('Invalid alert ID')
  ],
  resolveAlert
);

// @route   DELETE /api/alerts/:id
// @desc    Delete alert
// @access  Private (Admin)
router.delete(
  '/:id',
  auth,
  authorize('admin'),
  deleteAlert
);

module.exports = router;
