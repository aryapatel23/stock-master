const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authController = require('../controllers/authController');

const router = express.Router();

// Validation rules
const signupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone')
    .optional()
    .trim(),
  body('role')
    .optional()
    .isIn(['user', 'admin', 'manager']).withMessage('Invalid role')
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const refreshValidation = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
];

const requestOTPValidation = [
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
];

const verifyOTPValidation = [
  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
];

// Routes
router.post('/signup', signupValidation, validate, authController.signup);
router.post('/login', loginValidation, validate, authController.login);
router.post('/logout', refreshValidation, validate, authController.logout);
router.post('/refresh', refreshValidation, validate, authController.refresh);
router.post('/request-otp', requestOTPValidation, validate, authController.requestOTP);
router.post('/verify-otp', verifyOTPValidation, validate, authController.verifyOTP);

module.exports = router;
