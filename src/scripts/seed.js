const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Import models
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Inventory = require('../models/inventory.model');
const Order = require('../models/order.model');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Seed data
const seedData = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Inventory.deleteMany({});
    await Order.deleteMany({});

    console.log('Existing data cleared');

    // Create users
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    const admin = await User.create({
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin',
    });

    const user = await User.create({
      email: 'user@example.com',
      password: userPassword,
      name: 'Regular User',
      role: 'user',
    });

    console.log('Users created');

    // Create products
    const products = await Product.insertMany([
      {
        name: 'Smartphone',
        description: 'Latest smartphone with advanced features',
        price: 83999.99,
        category: 'Electronics',
        imageUrl: 'https://example.com/smartphone.jpg',
      },
      {
        name: 'Laptop',
        description: 'High-performance laptop for professionals',
        price: 129999.99,
        category: 'Electronics',
        imageUrl: 'https://example.com/laptop.jpg',
      },
      {
        name: 'Headphones',
        description: 'Noise-cancelling wireless headphones',
        price: 7399.99,
        category: 'Electronics',
        imageUrl: 'https://example.com/headphones.jpg',
      },
      {
        name: 'Smartwatch',
        description: 'Fitness tracking smartwatch',
        price: 29949.99,
        category: 'Electronics',
        imageUrl: 'https://example.com/smartwatch.jpg',
      },
      {
        name: 'Tablet',
        description: '10-inch tablet with high-resolution display',
        price: 349.99,
        category: 'Electronics',
        imageUrl: 'https://example.com/tablet.jpg',
      },
    ]);

    console.log('Products created');

    // Create inventory
    const inventoryItems = [];
    for (const product of products) {
      inventoryItems.push({
        productId: product._id,
        name: product.name,
        quantity: Math.floor(Math.random() * 100) + 10, // Random quantity between 10 and 109
        price: product.price,
        reserved: 0,
      });
    }

    await Inventory.insertMany(inventoryItems);
    console.log('Inventory created');

    // Create sample orders
    const orders = [
      {
        orderId: uuidv4(),
        userId: user._id,
        items: [
          {
            productId: products[0]._id,
            name: products[0].name,
            quantity: 1,
            price: products[0].price,
          },
          {
            productId: products[2]._id,
            name: products[2].name,
            quantity: 1,
            price: products[2].price,
          },
        ],
        totalAmount: products[0].price + products[2].price,
        status: 'Processed',
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
        },
        paymentMethod: 'Credit Card',
      },
      {
        orderId: uuidv4(),
        userId: user._id,
        items: [
          {
            productId: products[1]._id,
            name: products[1].name,
            quantity: 1,
            price: products[1].price,
          },
        ],
        totalAmount: products[1].price,
        status: 'Pending',
        shippingAddress: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA',
        },
        paymentMethod: 'PayPal',
      },
    ];

    await Order.insertMany(orders);
    console.log('Sample orders created');

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seed function
seedData();
