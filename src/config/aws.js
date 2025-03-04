const AWS = require('aws-sdk');
const logger = require('./logger');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Initialize SQS
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

// Initialize SES
const ses = new AWS.SES({ apiVersion: '2010-12-01' });

// Send message to SQS queue
const sendToSQS = async (message) => {
  try {
    const params = {
      QueueUrl: process.env.AWS_SQS_QUEUE_URL,
      MessageBody: JSON.stringify(message),
    };

    const result = await sqs.sendMessage(params).promise();
    logger.info(`Message sent to SQS: ${result.MessageId}`);
    return result;
  } catch (error) {
    logger.error(`Error sending message to SQS: ${error.message}`);
    throw error;
  }
};

// Receive messages from SQS queue
const receiveFromSQS = async () => {
  try {
    const params = {
      QueueUrl: process.env.AWS_SQS_QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
    };

    const result = await sqs.receiveMessage(params).promise();
    return result.Messages || [];
  } catch (error) {
    logger.error(`Error receiving messages from SQS: ${error.message}`);
    throw error;
  }
};

// Delete message from SQS queue
const deleteFromSQS = async (receiptHandle) => {
  try {
    const params = {
      QueueUrl: process.env.AWS_SQS_QUEUE_URL,
      ReceiptHandle: receiptHandle,
    };

    await sqs.deleteMessage(params).promise();
    logger.info(`Message deleted from SQS: ${receiptHandle}`);
  } catch (error) {
    logger.error(`Error deleting message from SQS: ${error.message}`);
    throw error;
  }
};

// Send email using SES
const sendEmail = async (to, subject, body) => {
  try {
    const params = {
      Source: process.env.AWS_SES_SENDER_EMAIL,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
        },
        Body: {
          Html: {
            Data: body,
          },
        },
      },
    };

    const result = await ses.sendEmail(params).promise();
    logger.info(`Email sent: ${result.MessageId}`);
    return result;
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
    throw error;
  }
};

module.exports = {
  sqs,
  ses,
  sendToSQS,
  receiveFromSQS,
  deleteFromSQS,
  sendEmail,
};
