const express = require('express');
const { body } = require('express-validator');
const { register, login, refresh, logout } = require('../controllers/auth.controller');
const { validate } = require('../middleware/validator.middleware');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Register user
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('name').notEmpty().withMessage('Name is required'),
    validate,
  ],
  register
);

// Login user
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  login
);

// Refresh token
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    validate,
  ],
  refresh
);

// Logout user
router.post('/logout', authMiddleware, logout);

module.exports = router;
