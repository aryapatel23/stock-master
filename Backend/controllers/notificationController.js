const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    List user notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const {
      type,
      isRead,
      priority,
      page = 1,
      limit = 50
    } = req.query;

    const query = {
      userId: req.user._id,
      isDeleted: false
    };

    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';
    if (priority) query.priority = priority;

    const notifications = await Notification.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
      isDeleted: false
    });

    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error.message
    });
  }
};

// @route   POST /api/notifications
// @desc    Create notification (internal)
// @access  Private (Admin/Manager)
const createNotification = async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      userIds,
      channels,
      relatedEntity,
      actionUrl,
      actionText,
      priority,
      expiresAt,
      metadata
    } = req.body;

    const targetUsers = userIds || [req.user._id];

    // Create notifications for each user
    const notifications = await Promise.all(
      targetUsers.map(userId =>
        Notification.create({
          type,
          title,
          message,
          userId,
          channels: channels || ['in_app'],
          relatedEntity,
          actionUrl,
          actionText,
          priority: priority || 'normal',
          expiresAt,
          metadata,
          createdBy: req.user._id,
          deliveryStatus: {
            in_app: {
              status: 'delivered',
              deliveredAt: new Date()
            }
          }
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `${notifications.length} notification(s) created`,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error.message
    });
  }
};

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id,
        isDeleted: false
      },
      {
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error.message
    });
  }
};

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        userId: req.user._id,
        isRead: false,
        isDeleted: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notification(s) marked as read`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking notifications as read',
      error: error.message
    });
  }
};

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id
      },
      { isDeleted: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error.message
    });
  }
};

// @route   DELETE /api/notifications/clear-all
// @desc    Clear all read notifications
// @access  Private
const clearAllRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      {
        userId: req.user._id,
        isRead: true,
        isDeleted: false
      },
      { isDeleted: true }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} notification(s) cleared`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing notifications',
      error: error.message
    });
  }
};

// Helper function to send notification (to be called from other controllers)
async function sendNotification(type, title, message, userIds, options = {}) {
  try {
    const notifications = await Promise.all(
      userIds.map(userId =>
        Notification.create({
          type,
          title,
          message,
          userId,
          channels: options.channels || ['in_app'],
          relatedEntity: options.relatedEntity,
          actionUrl: options.actionUrl,
          actionText: options.actionText,
          priority: options.priority || 'normal',
          expiresAt: options.expiresAt,
          metadata: options.metadata,
          createdBy: options.createdBy,
          deliveryStatus: {
            in_app: {
              status: 'delivered',
              deliveredAt: new Date()
            }
          }
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
}

module.exports = {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllRead,
  sendNotification
};
