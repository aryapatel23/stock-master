const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { auth, authorize } = require('../middleware/auth');
const {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllRead
} = require('../controllers/notificationController');

// @route   GET /api/notifications
// @desc    List user notifications
// @access  Private
router.get('/', auth, getNotifications);

// @route   POST /api/notifications
// @desc    Create notification
// @access  Private (Admin/Manager)
router.post(
  '/',
  auth,
  authorize('admin', 'manager'),
  [
    body('type').notEmpty().withMessage('Notification type is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required')
  ],
  createNotification
);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, markAsRead);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, markAllAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', auth, deleteNotification);

// @route   DELETE /api/notifications/clear-all
// @desc    Clear all read notifications
// @access  Private
router.delete('/clear-all', auth, clearAllRead);

module.exports = router;
