const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getDashboardSummary } = require('../controllers/dashboardController');

// @route   GET /api/dashboard/summary
// @desc    Get dashboard summary with KPIs
// @access  Private
router.get('/summary', auth, getDashboardSummary);

module.exports = router;
