const { v4: uuidv4 } = require('uuid');
const { createClient } = require('redis');
const Order = require('../models/order.model');
const Inventory = require('../models/inventory.model');
const { createError } = require('../utils/error.utils');
const logger = require('../config/logger');
const { sendToSQS } = require('../config/aws');

// Redis client configuration
let redisClient;

// Initialize Redis client
async function initRedisClient() {
  if (!redisClient) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL
      });

      redisClient.on('error', (err) => {
        logger.error('Redis Client Error', err);
      });

      await redisClient.connect();
      logger.info('Redis client connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }
  return redisClient;
}

// Create a new order
const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user._id;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return next(createError(400, 'Items are required'));
    }

    // Check inventory for all items
    const inventoryCheck = await Promise.all(
      items.map(async (item) => {
        const inventoryItem = await Inventory.findOne({ productId: item.productId });
        if (!inventoryItem) {
          return { success: false, message: `Product ${item.productId} not found in inventory` };
        }
        if (inventoryItem.available < item.quantity) {
          return { 
            success: false, 
            message: `Insufficient stock for product ${inventoryItem.name}. Available: ${inventoryItem.available}, Requested: ${item.quantity}` 
          };
        }
        return { 
          success: true, 
          inventoryItem,
          orderItem: {
            productId: item.productId,
            name: inventoryItem.name,
            quantity: item.quantity,
            price: inventoryItem.price
          }
        };
      })
    );

    // Check if any item failed inventory check
    const failedItems = inventoryCheck.filter(item => !item.success);
    if (failedItems.length > 0) {
      return next(createError(400, 'Inventory check failed', failedItems.map(item => item.message)));
    }

    // Calculate total amount
    const orderItems = inventoryCheck.map(item => item.orderItem);
    const totalAmount = orderItems.reduce((total, item) => total + (item.price * item.quantity), 0);

    // Create order
    const orderId = uuidv4();
    const order = new Order({
      orderId,
      userId,
      items: orderItems,
      totalAmount,
      status: 'Pending',
      shippingAddress,
      paymentMethod,
    });

    await order.save();

    // Reserve inventory
    await Promise.all(
      inventoryCheck.map(async (item) => {
        const inventoryItem = item.inventoryItem;
        inventoryItem.reserved += item.orderItem.quantity;
        await inventoryItem.save();
      })
    );

    // Send order to SQS for processing
    await sendToSQS({
      action: 'PROCESS_ORDER',
      orderId: order.orderId,
    });

    // Cache order in Redis
    try {
      const client = await initRedisClient();
      const cacheKey = `order:${order.orderId}`;
      
      // Use JSON.stringify to ensure proper serialization
      await client.set(
        cacheKey, 
        JSON.stringify(order.toObject()), 
        { 
          EX: parseInt(process.env.REDIS_CACHE_EXPIRATION || 3600) 
        }
      );
    } catch (cacheError) {
      logger.error(`Failed to cache order: ${cacheError.message}`);
      // Non-critical error, so we'll continue
    }

    res.status(201).json({
      success: true,
      data: {
        order,
      },
    });
  } catch (error) {
    logger.error(`Create order error: ${error.message}`);
    next(error);
  }
};

// Get order by ID
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Try to get order from Redis cache
    let order;
    try {
      const client = await initRedisClient();
      const cachedOrder = await client.get(`order:${id}`);

      if (cachedOrder) {
        order = JSON.parse(cachedOrder);
        
        // Check if the order belongs to the user
        if (order.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
          return next(createError(403, 'Not authorized to access this order'));
        }

        return res.status(200).json({
          success: true,
          data: {
            order,
            source: 'cache',
          },
        });
      }
    } catch (cacheError) {
      logger.error(`Redis cache error: ${cacheError.message}`);
      // Continue to database lookup if cache fails
    }

    // If not in cache, get from database
    order = await Order.findOne({ orderId: id });
    if (!order) {
      return next(createError(404, 'Order not found'));
    }

    // Check if the order belongs to the user
    if (order.userId.toString() !== userId.toString() && req.user.role !== 'admin') {
      return next(createError(403, 'Not authorized to access this order'));
    }

    // Cache the order
    try {
      const client = await initRedisClient();
      await client.set(
        `order:${order.orderId}`, 
        JSON.stringify(order.toObject()), 
        { 
          EX: parseInt(process.env.REDIS_CACHE_EXPIRATION || 3600) 
        }
      );
    } catch (cacheError) {
      logger.error(`Failed to cache order: ${cacheError.message}`);
    }

    res.status(200).json({
      success: true,
      data: {
        order,
        source: 'database',
      },
    });
  } catch (error) {
    logger.error(`Get order error: ${error.message}`);
    next(error);
  }
};

// Get all orders for a user
const getUserOrders = async (req, res, next) => {
  try {
    initRedisClient()
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error(`Get user orders error: ${error.message}`);
    next(error);
  }
};

// Cleanup Redis connection
async function closeRedisConnection() {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection', error);
    }
  }
}

module.exports = {
  createOrder,
  getOrderById,
  getUserOrders,
  closeRedisConnection,
};