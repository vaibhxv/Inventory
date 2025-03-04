const redis = require('redis');
const logger = require('./logger');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis Error: ${err}`);
    });

    await redisClient.connect();
    logger.info('Redis connected successfully');
    return redisClient;
  } catch (error) {
    logger.error(`Redis connection error: ${error.message}`);
    process.exit(1);
  }
};

const getRedisClient = async () => {
  if (!redisClient) {
    await connectRedis();
  }
  return redisClient;
};

module.exports = {
  connectRedis,
  getRedisClient,
};
