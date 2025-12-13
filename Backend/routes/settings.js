const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const {
  getSettings,
  updateSettings,
  getPermissions,
  getCronJobs,
  createCronJob,
  updateCronJob,
  deleteCronJob
} = require('../controllers/settingController');

// @route   GET /api/settings
// @desc    Get system settings
// @access  Private
router.get('/', auth, getSettings);

// @route   PUT /api/settings
// @desc    Update system settings
// @access  Private (Admin only)
router.put(
  '/',
  auth,
  authorize('admin'),
  updateSettings
);

// @route   GET /api/settings/permissions
// @desc    Get roles and permissions
// @access  Private
router.get('/permissions', auth, getPermissions);

// @route   GET /api/settings/cron-jobs
// @desc    Get all cron job configurations
// @access  Private (Admin only)
router.get(
  '/cron-jobs',
  auth,
  authorize('admin'),
  getCronJobs
);

// @route   POST /api/settings/cron-jobs
// @desc    Create cron job configuration
// @access  Private (Admin only)
router.post(
  '/cron-jobs',
  auth,
  authorize('admin'),
  [
    body('jobName').notEmpty().withMessage('Job name is required'),
    body('jobType').isIn([
      'stock_revaluation',
      'low_stock_check',
      'expiry_check',
      'reorder_check',
      'scheduled_report',
      'data_cleanup',
      'backup',
      'custom'
    ]).withMessage('Invalid job type'),
    body('schedule.frequency').isIn(['minutely', 'hourly', 'daily', 'weekly', 'monthly', 'custom'])
      .withMessage('Invalid schedule frequency')
  ],
  createCronJob
);

// @route   PUT /api/settings/cron-jobs/:id
// @desc    Update cron job configuration
// @access  Private (Admin only)
router.put(
  '/cron-jobs/:id',
  auth,
  authorize('admin'),
  updateCronJob
);

// @route   DELETE /api/settings/cron-jobs/:id
// @desc    Delete cron job
// @access  Private (Admin only)
router.delete(
  '/cron-jobs/:id',
  auth,
  authorize('admin'),
  deleteCronJob
);

module.exports = router;
