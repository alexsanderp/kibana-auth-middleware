import fetch from 'node-fetch';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import { logFetch } from '../utils/logger.js';
import config from '../config/index.js';

const generatePassword = () => {
  return crypto.randomBytes(16).toString('hex');
};

const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = config.elastic.timeout;
  const id = setTimeout(controller.abort.bind(controller), timeout);
  const username = options.username;
  const method = options.method;
  const start = Date.now();

  try {
    logFetch(username, method, url);

    const response = await fetch(url, { ...options, signal: controller.signal });

    const durationMs = Date.now() - start;
    logFetch(username, method, url, durationMs, response);
    
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      logger.error(`Request to ${method} ${url} timed out after ${timeout}ms`);
      throw Error(`Request timed out after ${timeout}ms`);
    }
    logger.error(`Error during fetch to ${method} ${url}: ${error.message}`);
    throw error;
  }
};

const checkUserExists = async (username) => {
  try {
    logger.info(`Checking if user exists: ${username}`);
    const url = `${config.elastic.target}/_security/user/${username}`;
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.elastic.auth.username}:${config.elastic.auth.password}`).toString('base64')}`,
      },
      username
    });

    const responseText = await response.text();

    if (response.status === 200) {
      logger.debug(`User exists: ${username}`);
      return true;
    } else if (response.status === 404) {
      logger.debug(`User not found: ${username}`);
      return false;
    } else {
      logger.error(`Failed to check user ${username}: ${response.status} ${responseText}`);
      throw new Error(`Failed to check user: ${responseText}`);
    }
  } catch (error) {
    logger.error(`Error checking user ${username}: ${error.message}`);
    throw error;
  }
};

const createUser = async (username, email, password) => {
  try {
    logger.info(`Creating user: ${username}`);
    const userData = {
      password,
      email,
      roles: ['viewer'],
      full_name: username
    };

    const url = `${config.elastic.target}/_security/user/${username}`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.elastic.auth.username}:${config.elastic.auth.password}`).toString('base64')}`,
      },
      body: JSON.stringify(userData),
      username
    });

    const responseText = await response.text();

    if (!response.ok) {
      logger.error(`Failed to create user ${username}: ${response.status} ${responseText}`);
      throw new Error(`Failed to create user: ${responseText}`);
    }

    logger.info(`User created: ${username}`);
    return true;
  } catch (error) {
    logger.error(`Error creating user ${username}: ${error.message}`);
    throw error;
  }
};

const updateUserPassword = async (username, email, password) => {
  try {
    logger.info(`Updating password for user: ${username}`);
    const userData = {
      password
    };

    const url = `${config.elastic.target}/_security/user/${username}/_password`;
    const response = await fetchWithTimeout(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${config.elastic.auth.username}:${config.elastic.auth.password}`).toString('base64')}`,
      },
      body: JSON.stringify(userData),
      username
    });

    const responseText = await response.text();

    if (!response.ok) {
      logger.error(`Failed to update password for user ${username}: ${response.status} ${responseText}`);
      throw new Error(`Failed to update password: ${responseText}`);
    }

    logger.info(`Password updated for user: ${username}`);
    return true;
  } catch (error) {
    logger.error(`Error updating password for user ${username}: ${error.message}`);
    throw error;
  }
};

const loginToKibana = async (username, password) => {
  try {
    logger.info(`Logging in to Kibana as user: ${username}`);
    const url = `${config.kibana.target}/internal/security/login`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'Kibana',
      },
      body: JSON.stringify({ providerType: 'basic', providerName: 'basic', currentURL: '/', params: { username, password } }),
      username
    });

    const responseText = await response.text();

    if (!response.ok) {
      logger.error(`Failed to login to Kibana as user ${username}: ${response.status} ${responseText}`);
      throw new Error(`Failed to login to Kibana: ${responseText}`);
    }

    logger.info(`Logged in to Kibana as user: ${username}`);
    return response;
  } catch (error) {
    logger.error(`Error logging in to Kibana as user ${username}: ${error.message}`);
    throw error;
  }
};

export {
  generatePassword,
  fetchWithTimeout,
  checkUserExists,
  createUser,
  updateUserPassword,
  loginToKibana
};
