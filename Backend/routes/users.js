const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

// Validation rules
const updateMeValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  body('phone')
    .optional()
    .trim(),
  body('avatarUrl')
    .optional()
    .trim(),
  body('preferences')
    .optional()
    .isObject().withMessage('Preferences must be an object')
];

const updateUserValidation = [
  body('role')
    .optional()
    .isIn(['user', 'admin', 'manager']).withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

// User profile routes (authenticated users)
router.get('/me', auth, userController.getMe);
router.put('/me', auth, updateMeValidation, validate, userController.updateMe);

// Admin routes (admin only)
router.get('/', auth, authorize('admin'), userController.getUsers);
router.get('/:id', auth, authorize('admin'), userController.getUserById);
router.put('/:id', auth, authorize('admin'), updateUserValidation, validate, userController.updateUser);
router.delete('/:id', auth, authorize('admin'), userController.deleteUser);

module.exports = router;
