const Inventory = require('../models/inventory.model');
const Product = require('../models/product.model');
const { createError } = require('../utils/error.utils');
const logger = require('../config/logger');

// Get inventory item by product ID
const getInventoryByProductId = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const inventoryItem = await Inventory.findOne({ productId });
    if (!inventoryItem) {
      return next(createError(404, 'Inventory item not found'));
    }

    res.status(200).json({
      success: true,
      data: {
        inventory: inventoryItem,
      },
    });
  } catch (error) {
    logger.error(`Get inventory error: ${error.message}`);
    next(error);
  }
};

// Update inventory quantity
const updateInventory = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity < 0) {
      return next(createError(400, 'Valid quantity is required'));
    }

    const inventoryItem = await Inventory.findOne({ productId });
    if (!inventoryItem) {
      return next(createError(404, 'Inventory item not found'));
    }

    // Ensure we don't set quantity below reserved
    if (quantity < inventoryItem.reserved) {
      return next(createError(400, `Cannot set quantity below reserved amount (${inventoryItem.reserved})`));
    }

    inventoryItem.quantity = quantity;
    await inventoryItem.save();

    res.status(200).json({
      success: true,
      data: {
        inventory: inventoryItem,
      },
    });
  } catch (error) {
    logger.error(`Update inventory error: ${error.message}`);
    next(error);
  }
};

// Create inventory item for a product
const createInventoryItem = async (req, res, next) => {
  try {
    const { productId, quantity, price } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return next(createError(404, 'Product not found'));
    }

    // Check if inventory item already exists
    const existingItem = await Inventory.findOne({ productId });
    if (existingItem) {
      return next(createError(400, 'Inventory item already exists for this product'));
    }

    // Create inventory item
    const inventoryItem = new Inventory({
      productId,
      name: product.name,
      quantity,
      price: price || product.price,
      reserved: 0,
    });

    await inventoryItem.save();

    res.status(201).json({
      success: true,
      data: {
        inventory: inventoryItem,
      },
    });
  } catch (error) {
    logger.error(`Create inventory error: ${error.message}`);
    next(error);
  }
};

module.exports = {
  getInventoryByProductId,
  updateInventory,
  createInventoryItem,
};
