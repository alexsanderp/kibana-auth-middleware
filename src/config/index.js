import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

const requiredEnvVars = [
  'KIBANA_TARGET',
  'ELASTIC_TARGET',
  'ELASTIC_USER',
  'ELASTIC_PASS',
  'ALLOWED_EMAIL_DOMAINS'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

const allowedEmailDomains = process.env.ALLOWED_EMAIL_DOMAINS
  .split(',')
  .map(domain => domain.trim())
  .filter(domain => domain);

logger.info('Environment variables loaded successfully');
logger.info(`KIBANA_TARGET: ${process.env.KIBANA_TARGET}`);
logger.info(`ELASTIC_TARGET: ${process.env.ELASTIC_TARGET}`);
logger.info(`ELASTIC_USER: ${process.env.ELASTIC_USER}`);
logger.info(`ALLOWED_EMAIL_DOMAINS: ${allowedEmailDomains.join(', ')}`);

const config = {
  port: process.env.PORT || 3000,
  kibana: {
    target: process.env.KIBANA_TARGET
  },
  elastic: {
    target: process.env.ELASTIC_TARGET,
    timeout: parseInt(process.env.ELASTIC_TIMEOUT_MS || '10000', 10),
    auth: {
      username: process.env.ELASTIC_USER,
      password: process.env.ELASTIC_PASS
    }
  },
  auth: {
    allowedEmailDomains,
  }
};

export default config;