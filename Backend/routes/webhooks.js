const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook
} = require('../controllers/webhookController');

// @route   GET /api/webhooks
// @desc    List webhooks
// @access  Private (Admin/Manager)
router.get(
  '/',
  auth,
  authorize('admin', 'manager'),
  getWebhooks
);

// @route   POST /api/webhooks
// @desc    Register webhook
// @access  Private (Admin)
router.post(
  '/',
  auth,
  authorize('admin'),
  [
    body('name').notEmpty().withMessage('Webhook name is required'),
    body('url').isURL().withMessage('Valid URL is required'),
    body('events').isArray({ min: 1 }).withMessage('At least one event is required'),
    body('events.*').notEmpty().withMessage('Event cannot be empty')
  ],
  createWebhook
);

// @route   PUT /api/webhooks/:id
// @desc    Update webhook
// @access  Private (Admin)
router.put(
  '/:id',
  auth,
  authorize('admin'),
  updateWebhook
);

// @route   DELETE /api/webhooks/:id
// @desc    Delete webhook
// @access  Private (Admin)
router.delete(
  '/:id',
  auth,
  authorize('admin'),
  deleteWebhook
);

// @route   POST /api/webhooks/test/:id
// @desc    Test webhook
// @access  Private (Admin)
router.post(
  '/test/:id',
  auth,
  authorize('admin'),
  testWebhook
);

module.exports = router;
