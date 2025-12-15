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
    .isIn(['employee', 'admin', 'manager']).withMessage('Invalid role'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

const createUserValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role')
    .optional()
    .isIn(['employee', 'admin', 'manager']).withMessage('Invalid role')
];

// User profile routes (authenticated users)
router.get('/me', auth, userController.getMe);
router.put('/me', auth, updateMeValidation, validate, userController.updateMe);

// Admin routes (admin only)
router.get('/', auth, authorize('admin'), userController.getUsers);
router.post('/', auth, authorize('admin'), createUserValidation, validate, userController.createUser);
router.get('/:id', auth, authorize('admin'), userController.getUserById);
router.put('/:id', auth, authorize('admin'), updateUserValidation, validate, userController.updateUser);
router.patch('/:id/status', auth, authorize('admin'), userController.toggleUserStatus);
router.delete('/:id', auth, authorize('admin'), userController.deleteUser);

module.exports = router;
