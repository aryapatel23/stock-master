const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

const router = express.Router();

// Validation rules
const createCategoryValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Category name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  body('description')
    .optional()
    .trim(),
  body('parentId')
    .optional()
    .isMongoId().withMessage('Invalid parent category ID')
];

const updateCategoryValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
  body('description')
    .optional()
    .trim(),
  body('parentId')
    .optional()
    .isMongoId().withMessage('Invalid parent category ID'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

// Routes
router.get('/', auth, categoryController.getCategories);
router.post('/', auth, createCategoryValidation, validate, categoryController.createCategory);
router.get('/:id', auth, categoryController.getCategoryById);
router.put('/:id', auth, updateCategoryValidation, validate, categoryController.updateCategory);
router.delete('/:id', auth, categoryController.deleteCategory);

module.exports = router;
