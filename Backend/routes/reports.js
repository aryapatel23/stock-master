const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const {
  getStockAgeing,
  getInventoryTurnover,
  getSlowMovingItems,
  runCustomReport,
  getReportById
} = require('../controllers/reportController');

// @route   GET /api/reports/stock-ageing
// @desc    Get stock aging report
// @access  Private
router.get('/stock-ageing', auth, getStockAgeing);

// @route   GET /api/reports/turnover
// @desc    Get inventory turnover report
// @access  Private
router.get('/turnover', auth, getInventoryTurnover);

// @route   GET /api/reports/slow-moving
// @desc    Get slow-moving items report
// @access  Private
router.get('/slow-moving', auth, getSlowMovingItems);

// @route   POST /api/reports/custom
// @desc    Run custom report (async)
// @access  Private (Admin/Manager)
router.post(
  '/custom',
  auth,
  authorize('admin', 'manager'),
  [
    body('reportName').notEmpty().withMessage('Report name is required'),
    body('reportType').optional().isIn(['stock_ageing', 'turnover', 'slow_moving', 'abc_analysis', 'custom'])
      .withMessage('Invalid report type')
  ],
  runCustomReport
);

// @route   GET /api/reports/:id
// @desc    Get report by ID
// @access  Private
router.get('/:id', auth, getReportById);

module.exports = router;
