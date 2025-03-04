const { receiveFromSQS, deleteFromSQS, sendEmail } = require('../config/aws');
const Order = require('../models/order.model');
const Inventory = require('../models/inventory.model');
const User = require('../models/user.model');
const logger = require('../config/logger');
const { getRedisClient } = require('../config/redis');

// Process order
const processOrder = async (orderId) => {
  try {
    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      logger.error(`Order not found: ${orderId}`);
      return;
    }

    // Skip if order is already processed or failed
    if (order.status !== 'Pending') {
      logger.info(`Order ${orderId} is already ${order.status}`);
      return;
    }

    // Find user
    const user = await User.findById(order.userId);
    if (!user) {
      logger.error(`User not found for order: ${orderId}`);
      order.status = 'Failed';
      order.failureReason = 'User not found';
      await order.save();
      return;
    }

    // Process each item in the order
    let success = true;
    let failureReason = '';

    for (const item of order.items) {
      const inventoryItem = await Inventory.findOne({ productId: item.productId });
      
      if (!inventoryItem) {
        success = false;
        failureReason = `Product ${item.productId} not found in inventory`;
        break;
      }

      if (inventoryItem.quantity < item.quantity) {
        success = false;
        failureReason = `Insufficient stock for product ${inventoryItem.name}`;
        break;
      }

      // Update inventory
      inventoryItem.quantity -= item.quantity;
      inventoryItem.reserved -= item.quantity;
      await inventoryItem.save();
    }

    // Update order status
    order.status = success ? 'Processed' : 'Failed';
    if (!success) {
      order.failureReason = failureReason;
    }
    await order.save();

    // Update Redis cache
    const redisClient = await getRedisClient();
    await redisClient.set(
      `order:${order.orderId}`,
      JSON.stringify(order),
      'EX',
      process.env.REDIS_CACHE_EXPIRATION
    );

    // Send email notification
    await sendOrderConfirmationEmail(user.email, order);

    logger.info(`Order ${orderId} processed successfully. Status: ${order.status}`);
  } catch (error) {
    logger.error(`Error processing order ${orderId}: ${error.message}`);
  }
};

// Send order confirmation email
const sendOrderConfirmationEmail = async (email, order) => {
  try {
    const subject = `Order ${order.status}: ${order.orderId}`;
    
    // Create HTML email body
    let itemsList = '';
    order.items.forEach(item => {
      itemsList += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${item.price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `;
    });

    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Order ${order.status}</h2>
        <p>Order ID: <strong>${order.orderId}</strong></p>
        <p>Status: <strong>${order.status}</strong></p>
        ${order.failureReason ? `<p>Reason: <strong>${order.failureReason}</strong></p>` : ''}
        
        <h3>Order Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f2f2f2;">
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Product</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Quantity</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Price</th>
              <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsList}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Total Amount:</td>
              <td style="padding: 8px; font-weight: bold;">$${order.totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        
        <h3>Shipping Address</h3>
        <p>
          ${order.shippingAddress.street}<br>
          ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}<br>
          ${order.shippingAddress.country}
        </p>
        
        <p>Thank you for your order!</p>
      </div>
    `;

    await sendEmail(email, subject, body);
    logger.info(`Order confirmation email sent to ${email} for order ${order.orderId}`);
  } catch (error) {
    logger.error(`Error sending order confirmation email: ${error.message}`);
  }
};

// Start the worker
const startWorker = async () => {
  logger.info('Order processor worker started');
  
  // Poll SQS queue for messages
  setInterval(async () => {
    try {
      const messages = await receiveFromSQS();
      
      if (messages.length === 0) {
        return; }
      
      logger.info(`Received ${messages.length} messages from SQS`);
      
      // Process each message
      for (const message of messages) {
        try {
          const body = JSON.parse(message.Body);
          
          if (body.action === 'PROCESS_ORDER') {
            await processOrder(body.orderId);
          }
          
          // Delete message from queue
          await deleteFromSQS(message.ReceiptHandle);
        } catch (error) {
          logger.error(`Error processing message: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Error receiving messages from SQS: ${error.message}`);
    }
  }, 10000); // Poll every 10 seconds
};

// Start the worker if this file is run directly
if (require.main === module) {
  startWorker();
}

module.exports = {
  processOrder,
  startWorker,
};
