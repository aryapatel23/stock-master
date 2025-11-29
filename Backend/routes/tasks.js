const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const {
  getPickingTasks,
  startPickingTask,
  completePickingTask,
  getPackingTasks,
  startPackingTask,
  completePackingTask,
  createPickingTask,
  createPackingTask
} = require('../controllers/taskController');

// Validation rules
const listPickingTasksValidation = [
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  query('warehouseId')
    .optional()
    .isMongoId()
    .withMessage('Invalid warehouse ID'),
  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'canceled'])
    .withMessage('Invalid status'),
  query('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  query('deliveryOrderId')
    .optional()
    .isMongoId()
    .withMessage('Invalid delivery order ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const completePickingTaskValidation = [
  param('taskId')
    .notEmpty()
    .withMessage('Task ID is required')
    .isMongoId()
    .withMessage('Invalid task ID'),
  body('pickedLines')
    .isArray({ min: 1 })
    .withMessage('At least one picked line is required'),
  body('pickedLines.*.lineId')
    .notEmpty()
    .withMessage('Line ID is required')
    .isMongoId()
    .withMessage('Invalid line ID'),
  body('pickedLines.*.pickedQty')
    .isNumeric()
    .withMessage('Picked quantity must be a number')
    .isFloat({ min: 0 })
    .withMessage('Picked quantity cannot be negative'),
  body('notes')
    .optional()
    .trim()
];

const listPackingTasksValidation = [
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID'),
  query('warehouseId')
    .optional()
    .isMongoId()
    .withMessage('Invalid warehouse ID'),
  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'canceled'])
    .withMessage('Invalid status'),
  query('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  query('deliveryOrderId')
    .optional()
    .isMongoId()
    .withMessage('Invalid delivery order ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const completePackingTaskValidation = [
  param('taskId')
    .notEmpty()
    .withMessage('Task ID is required')
    .isMongoId()
    .withMessage('Invalid task ID'),
  body('packedLines')
    .isArray({ min: 1 })
    .withMessage('At least one packed line is required'),
  body('packedLines.*.lineId')
    .notEmpty()
    .withMessage('Line ID is required')
    .isMongoId()
    .withMessage('Invalid line ID'),
  body('packedLines.*.packedQty')
    .isNumeric()
    .withMessage('Packed quantity must be a number')
    .isFloat({ min: 0 })
    .withMessage('Packed quantity cannot be negative'),
  body('numberOfBoxes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Number of boxes must be a non-negative integer'),
  body('totalWeight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total weight must be a non-negative number'),
  body('notes')
    .optional()
    .trim()
];

const createPickingTaskValidation = [
  body('deliveryOrderId')
    .notEmpty()
    .withMessage('Delivery order ID is required')
    .isMongoId()
    .withMessage('Invalid delivery order ID'),
  body('warehouseId')
    .notEmpty()
    .withMessage('Warehouse ID is required')
    .isMongoId()
    .withMessage('Invalid warehouse ID'),
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid assigned user ID'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('lines')
    .isArray({ min: 1 })
    .withMessage('At least one line is required'),
  body('lines.*.productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('lines.*.locationId')
    .notEmpty()
    .withMessage('Location ID is required')
    .isMongoId()
    .withMessage('Invalid location ID'),
  body('lines.*.requestedQty')
    .isNumeric()
    .withMessage('Requested quantity must be a number')
    .isFloat({ min: 1 })
    .withMessage('Requested quantity must be at least 1'),
  body('notes')
    .optional()
    .trim()
];

const createPackingTaskValidation = [
  body('deliveryOrderId')
    .notEmpty()
    .withMessage('Delivery order ID is required')
    .isMongoId()
    .withMessage('Invalid delivery order ID'),
  body('warehouseId')
    .notEmpty()
    .withMessage('Warehouse ID is required')
    .isMongoId()
    .withMessage('Invalid warehouse ID'),
  body('pickingTaskId')
    .optional()
    .isMongoId()
    .withMessage('Invalid picking task ID'),
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid assigned user ID'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('lines')
    .isArray({ min: 1 })
    .withMessage('At least one line is required'),
  body('lines.*.productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('lines.*.requestedQty')
    .isNumeric()
    .withMessage('Requested quantity must be a number')
    .isFloat({ min: 1 })
    .withMessage('Requested quantity must be at least 1'),
  body('notes')
    .optional()
    .trim()
];

const taskIdValidation = [
  param('taskId')
    .notEmpty()
    .withMessage('Task ID is required')
    .isMongoId()
    .withMessage('Invalid task ID')
];

// Picking task routes
router.get(
  '/picking',
  auth,
  listPickingTasksValidation,
  validate,
  getPickingTasks
);

router.post(
  '/picking',
  auth,
  createPickingTaskValidation,
  validate,
  createPickingTask
);

router.post(
  '/picking/:taskId/start',
  auth,
  taskIdValidation,
  validate,
  startPickingTask
);

router.post(
  '/picking/:taskId/complete',
  auth,
  completePickingTaskValidation,
  validate,
  completePickingTask
);

// Packing task routes
router.get(
  '/packing',
  auth,
  listPackingTasksValidation,
  validate,
  getPackingTasks
);

router.post(
  '/packing',
  auth,
  createPackingTaskValidation,
  validate,
  createPackingTask
);

router.post(
  '/packing/:taskId/start',
  auth,
  taskIdValidation,
  validate,
  startPackingTask
);

router.post(
  '/packing/:taskId/complete',
  auth,
  completePackingTaskValidation,
  validate,
  completePackingTask
);

module.exports = router;
