require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost',
  meta: {
    graphApiVersion: process.env.META_GRAPH_API_VERSION || 'v25.0',
    accessToken: process.env.META_ACCESS_TOKEN || '',
    phoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
    businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN || ''
  }
};
