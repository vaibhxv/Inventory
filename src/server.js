const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth.routes');
const orderRoutes = require('./routes/order.routes');

// Import middleware
const { errorHandler } = require('./middleware/error.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', authMiddleware, orderRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start the order processor worker
require('./workers/orderProcessor');
