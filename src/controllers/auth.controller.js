const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const { createError } = require('../utils/error.utils');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/token.utils');
const logger = require('../config/logger');

// Register a new user
const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(createError(400, 'User already exists'));
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
    });

    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return next(createError(401, 'Invalid credentials'));
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(createError(401, 'Invalid credentials'));
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

// Refresh token
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(createError(400, 'Refresh token is required'));
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return next(createError(401, 'Invalid refresh token'));
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return next(createError(401, 'Invalid refresh token'));
    }

    // Generate new tokens
    const accessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Save new refresh token to user
    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      },
    });
  } catch (error) {
    logger.error(`Token refresh error: ${error.message}`);
    next(error);
  }
};

// Logout user
const logout = async (req, res, next) => {
  try {
    // Clear refresh token
    req.user.refreshToken = null;
    await req.user.save();

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
