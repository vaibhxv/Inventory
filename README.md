# Order Processing System

A scalable, event-driven Order Processing System built with Node.js, Express, MongoDB, Redis, and AWS.

**API Documentation**: [Swagger UI Docs](https://inventory-2pya.onrender.com/api-docs)

## Features

- User Authentication with JWT and Refresh Tokens
- Order Management
- Inventory Check
- Asynchronous Processing with AWS SQS
- Caching with Redis
- Email Notifications with AWS SES

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Redis
- AWS Account with SQS and SES configured

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/order-processing

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_CACHE_EXPIRATION=600

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/your-account-id/order-queue
AWS_SES_SENDER_EMAIL=your-verified-email@example.com
```

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

For development:

```bash
npm run dev
```

## API Endpoints

### Authentication

- **Register User**: `POST /api/auth/register`
  - Body: `{ "email": "user@example.com", "password": "password", "name": "User Name" }`

- **Login User**: `POST /api/auth/login`
  - Body: `{ "email": "user@example.com", "password": "password" }`

- **Refresh Token**: `POST /api/auth/refresh`
  - Body: `{ "refreshToken": "your-refresh-token" }`

- **Logout User**: `POST /api/auth/logout`
  - Headers: `Authorization: Bearer your-access-token`

### Orders

- **Create Order**: `POST /api/orders`
  - Headers: `Authorization: Bearer your-access-token`
  - Body:
    ```json
    {
      "items": [
        {
          "productId": "product-id",
          "quantity": 1
        }
      ],
      "shippingAddress": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "USA"
      },
      "paymentMethod": "Credit Card"
    }
    ```

- **Get Order Details**: `GET /api/orders/:id`
  - Headers: `Authorization: Bearer your-access-token`

- **Get User Orders**: `GET /api/orders`
  - Headers: `Authorization: Bearer your-access-token`
  - Query Parameters: `page`, `limit`

## Architecture

The system follows a microservices-inspired architecture with the following components:

1. **API Server**: Handles HTTP requests and responses
2. **Authentication Service**: Manages user authentication and authorization
3. **Order Service**: Processes order creation and retrieval
4. **Inventory Service**: Manages product inventory
5. **Order Processor Worker**: Processes orders asynchronously from SQS queue
6. **Notification Service**: Sends email notifications using AWS SES

## Data Flow

1. User authenticates and receives JWT tokens
2. User creates an order through the API
3. System validates inventory availability
4. If inventory is available, order is created and sent to SQS queue
5. Order processor worker picks up the order from the queue
6. Worker processes the order and updates its status
7. Email notification is sent to the user
8. Order details are cached in Redis for quick retrieval

## Seed Data

To populate the database with sample data:

```bash
node src/scripts/seed.js
```

This will create:
- Admin user: admin@example.com / admin123
- Regular user: user@example.com / user123
- Sample products and inventory
- Sample orders

## License

MIT
