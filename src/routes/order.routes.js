const express = require('express');
const { body } = require('express-validator');
const { createOrder, getOrderById, getUserOrders } = require('../controllers/order.controller');
const { validate } = require('../middleware/validator.middleware');

const router = express.Router();

// Create order
router.post(
  '/',
  [
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.productId').notEmpty().withMessage('Product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('shippingAddress').notEmpty().withMessage('Shipping address is required'),
    body('shippingAddress.street').notEmpty().withMessage('Street is required'),
    body('shippingAddress.city').notEmpty().withMessage('City is required'),
    body('shippingAddress.state').notEmpty().withMessage('State is required'),
    body('shippingAddress.zipCode').notEmpty().withMessage('Zip code is required'),
    body('shippingAddress.country').notEmpty().withMessage('Country is required'),
    body('paymentMethod')
      .isIn(['Credit Card', 'PayPal', 'Bank Transfer'])
      .withMessage('Invalid payment method'),
    validate,
  ],
  createOrder
);

// Get order by ID
router.get('/:id', getOrderById);

// Get all orders for a user
router.get('/', getUserOrders);

module.exports = router;
