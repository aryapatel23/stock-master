const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const locationController = require('../controllers/locationController');

const router = express.Router();

// Validation rules
const updateLocationValidation = [
  body('code')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Code must be between 1-50 characters'),
  body('type')
    .optional()
    .isIn(['rack', 'bin', 'shelf', 'zone', 'other']).withMessage('Invalid location type'),
  body('capacity')
    .optional()
    .isNumeric().withMessage('Capacity must be a number')
    .isFloat({ min: 0 }).withMessage('Capacity must be non-negative'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

// Location routes
router.get('/:locationId', auth, locationController.getLocationById);
router.put('/:locationId', auth, updateLocationValidation, validate, locationController.updateLocation);
router.delete('/:locationId', auth, locationController.deleteLocation);

module.exports = router;
