const Webhook = require('../models/Webhook');
const axios = require('axios');
const crypto = require('crypto');

// @route   GET /api/webhooks
// @desc    List registered webhooks
// @access  Private (Admin/Manager)
const getWebhooks = async (req, res) => {
  try {
    const { isActive, event } = req.query;
    const query = { isDeleted: false };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (event) {
      query.events = event;
    }

    const webhooks = await Webhook.find(query)
      .populate('createdBy', 'name email')
      .select('-secret') // Don't expose secrets
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      webhooks,
      total: webhooks.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching webhooks',
      error: error.message
    });
  }
};

// @route   POST /api/webhooks
// @desc    Register a webhook
// @access  Private (Admin)
const createWebhook = async (req, res) => {
  try {
    const {
      name,
      url,
      events,
      secret,
      headers,
      retryOnFailure,
      maxRetries,
      timeout,
      description
    } = req.body;

    // Generate secret if not provided
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

    const webhook = await Webhook.create({
      name,
      url,
      events,
      secret: webhookSecret,
      headers,
      retryOnFailure: retryOnFailure !== undefined ? retryOnFailure : true,
      maxRetries: maxRetries || 3,
      timeout: timeout || 30000,
      description,
      isActive: true,
      createdBy: req.user._id
    });

    // Return webhook without exposing the secret
    const webhookResponse = webhook.toObject();
    delete webhookResponse.secret;

    res.status(201).json({
      success: true,
      message: 'Webhook registered successfully',
      webhook: webhookResponse,
      secret: webhookSecret // Return once for user to save
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating webhook',
      error: error.message
    });
  }
};

// @route   PUT /api/webhooks/:id
// @desc    Update webhook
// @access  Private (Admin)
const updateWebhook = async (req, res) => {
  try {
    const updates = req.body;

    const webhook = await Webhook.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-secret');

    if (!webhook || webhook.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    res.json({
      success: true,
      message: 'Webhook updated successfully',
      webhook
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating webhook',
      error: error.message
    });
  }
};

// @route   DELETE /api/webhooks/:id
// @desc    Delete webhook
// @access  Private (Admin)
const deleteWebhook = async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, isActive: false },
      { new: true }
    );

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    res.json({
      success: true,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting webhook',
      error: error.message
    });
  }
};

// @route   POST /api/webhooks/test/:id
// @desc    Test webhook delivery
// @access  Private (Admin)
const testWebhook = async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);

    if (!webhook || webhook.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery'
      }
    };

    const result = await deliverWebhook(webhook, 'test', testPayload);

    res.json({
      success: result.success,
      message: result.success ? 'Webhook test successful' : 'Webhook test failed',
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing webhook',
      error: error.message
    });
  }
};

// Helper function to deliver webhook
async function deliverWebhook(webhook, event, payload, retryCount = 0) {
  const startTime = Date.now();
  
  try {
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': event,
      'X-Webhook-Signature': generateSignature(webhook.secret, payload),
      'User-Agent': 'StockMaster-Webhook/1.0'
    };

    // Add custom headers
    if (webhook.headers && webhook.headers.size > 0) {
      webhook.headers.forEach((value, key) => {
        headers[key] = value;
      });
    }

    // Make HTTP request
    const response = await axios.post(webhook.url, payload, {
      headers,
      timeout: webhook.timeout
    });

    const responseTime = Date.now() - startTime;

    // Update webhook stats
    webhook.stats.totalCalls++;
    webhook.stats.successfulCalls++;
    webhook.stats.lastSuccessAt = new Date();

    // Add to recent deliveries
    webhook.recentDeliveries.unshift({
      event,
      timestamp: new Date(),
      status: 'success',
      statusCode: response.status,
      responseTime
    });

    // Keep only last 10 deliveries
    if (webhook.recentDeliveries.length > 10) {
      webhook.recentDeliveries = webhook.recentDeliveries.slice(0, 10);
    }

    await webhook.save();

    return {
      success: true,
      statusCode: response.status,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    // Update webhook stats
    webhook.stats.totalCalls++;
    webhook.stats.failedCalls++;
    webhook.stats.lastFailureAt = new Date();
    webhook.stats.lastError = error.message;

    // Add to recent deliveries
    webhook.recentDeliveries.unshift({
      event,
      timestamp: new Date(),
      status: error.code === 'ECONNABORTED' ? 'timeout' : 'failed',
      statusCode: error.response?.status,
      responseTime,
      error: error.message
    });

    if (webhook.recentDeliveries.length > 10) {
      webhook.recentDeliveries = webhook.recentDeliveries.slice(0, 10);
    }

    await webhook.save();

    // Retry if enabled
    if (webhook.retryOnFailure && retryCount < webhook.maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
      return deliverWebhook(webhook, event, payload, retryCount + 1);
    }

    return {
      success: false,
      error: error.message,
      statusCode: error.response?.status,
      responseTime
    };
  }
}

// Helper function to generate signature
function generateSignature(secret, payload) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

// Function to trigger webhooks for an event (to be called from other controllers)
async function triggerWebhooks(event, payload) {
  try {
    const webhooks = await Webhook.find({
      events: event,
      isActive: true,
      isDeleted: false
    });

    const deliveryPromises = webhooks.map(webhook =>
      deliverWebhook(webhook, event, payload)
    );

    await Promise.allSettled(deliveryPromises);
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
}

module.exports = {
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  triggerWebhooks
};
