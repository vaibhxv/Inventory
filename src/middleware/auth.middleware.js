const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { createError } = require('../utils/error.utils');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError(401, 'No token provided'));
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return next(createError(401, 'User not found'));
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(createError(401, 'Token expired'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(createError(401, 'Invalid token'));
    }
    next(createError(500, error.message));
  }
};

module.exports = {
  authMiddleware,
};
