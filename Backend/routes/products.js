const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const productController = require('../controllers/productController');

const router = express.Router();

// Validation rules
const createProductValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Name must be between 2-200 characters'),
  body('sku')
    .trim()
    .notEmpty().withMessage('SKU is required')
    .isLength({ min: 1, max: 50 }).withMessage('SKU must be between 1-50 characters'),
  body('description')
    .optional()
    .trim(),
  body('categoryId')
    .optional()
    .isMongoId().withMessage('Invalid category ID'),
  body('uom')
    .optional()
    .trim(),
  body('defaultWarehouseId')
    .optional()
    .isMongoId().withMessage('Invalid warehouse ID'),
  body('attributes')
    .optional()
    .isObject().withMessage('Attributes must be an object'),
  body('reorderLevel')
    .optional()
    .isNumeric().withMessage('Reorder level must be a number')
    .isFloat({ min: 0 }).withMessage('Reorder level must be non-negative'),
  body('price')
    .optional()
    .isNumeric().withMessage('Price must be a number')
    .isFloat({ min: 0 }).withMessage('Price must be non-negative'),
  body('cost')
    .optional()
    .isNumeric().withMessage('Cost must be a number')
    .isFloat({ min: 0 }).withMessage('Cost must be non-negative')
];

const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Name must be between 2-200 characters'),
  body('description')
    .optional()
    .trim(),
  body('categoryId')
    .optional()
    .isMongoId().withMessage('Invalid category ID'),
  body('uom')
    .optional()
    .trim(),
  body('defaultWarehouseId')
    .optional()
    .isMongoId().withMessage('Invalid warehouse ID'),
  body('attributes')
    .optional()
    .isObject().withMessage('Attributes must be an object'),
  body('reorderLevel')
    .optional()
    .isNumeric().withMessage('Reorder level must be a number')
    .isFloat({ min: 0 }).withMessage('Reorder level must be non-negative'),
  body('price')
    .optional()
    .isNumeric().withMessage('Price must be a number')
    .isFloat({ min: 0 }).withMessage('Price must be non-negative'),
  body('cost')
    .optional()
    .isNumeric().withMessage('Cost must be a number')
    .isFloat({ min: 0 }).withMessage('Cost must be non-negative'),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
];

const bulkProductsValidation = [
  body('products')
    .isArray({ min: 1 }).withMessage('Products array is required'),
  body('preview')
    .optional()
    .isBoolean().withMessage('Preview must be a boolean')
];

// Routes
router.get('/', auth, productController.getProducts);
router.post('/', auth, createProductValidation, validate, productController.createProduct);
router.post('/bulk', auth, bulkProductsValidation, validate, productController.bulkProducts);
router.get('/:productId', auth, productController.getProductById);
router.put('/:productId', auth, updateProductValidation, validate, productController.updateProduct);
router.delete('/:productId', auth, productController.deleteProduct);

module.exports = router;
