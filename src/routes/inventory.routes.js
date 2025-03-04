const express = require('express');
const { body } = require('express-validator');
const { getInventoryByProductId, updateInventory, createInventoryItem } = require('../controllers/inventory.controller');
const { validate } = require('../middleware/validator.middleware');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// All inventory routes require authentication
router.use(authMiddleware);

// Get inventory by product ID
router.get('/:productId', getInventoryByProductId);

// Update inventory
router.put(
  '/:productId',
  [
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    validate,
  ],
  updateInventory
);

// Create inventory item
router.post(
  '/',
  [
    body('productId').notEmpty().withMessage('Product ID is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
    validate,
  ],
  createInventoryItem
);

module.exports = router;
