const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const warehouseController = require('../controllers/warehouseController');

const router = express.Router();

// Validation rules
const createWarehouseValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Warehouse name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  body('address')
    .optional()
    .isObject().withMessage('Address must be an object'),
  body('contact')
    .optional()
    .isObject().withMessage('Contact must be an object'),
  body('isDefault')
    .optional()
    .isBoolean().withMessage('isDefault must be a boolean')
];

const updateWarehouseValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  body('address')
    .optional()
    .isObject().withMessage('Address must be an object'),
  body('contact')
    .optional()
    .isObject().withMessage('Contact must be an object'),
  body('isDefault')
    .optional()
    .isBoolean().withMessage('isDefault must be a boolean'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

const createLocationValidation = [
  body('code')
    .trim()
    .notEmpty().withMessage('Location code is required')
    .isLength({ min: 1, max: 50 }).withMessage('Code must be between 1-50 characters'),
  body('type')
    .optional()
    .isIn(['rack', 'bin', 'shelf', 'zone', 'other']).withMessage('Invalid location type'),
  body('capacity')
    .optional()
    .isNumeric().withMessage('Capacity must be a number')
    .isFloat({ min: 0 }).withMessage('Capacity must be non-negative')
];

// Warehouse routes
router.get('/', auth, warehouseController.getWarehouses);
router.post('/', auth, createWarehouseValidation, validate, warehouseController.createWarehouse);
router.get('/:id', auth, warehouseController.getWarehouseById);
router.put('/:id', auth, updateWarehouseValidation, validate, warehouseController.updateWarehouse);
router.delete('/:id', auth, warehouseController.deleteWarehouse);

// Warehouse locations routes
router.get('/:id/locations', auth, warehouseController.getWarehouseLocations);
router.post('/:id/locations', auth, createLocationValidation, validate, warehouseController.createLocation);

module.exports = router;
