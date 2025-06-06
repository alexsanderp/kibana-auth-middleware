import express from 'express';
import cookie from 'cookie';
import logger, { logProxy } from './utils/logger.js';
import { createProxyMiddleware } from 'http-proxy-middleware';
import config from './config/index.js';
import * as authService from './services/auth.service.js';
import http from 'http';
import https from 'https';

const app = express();

const agent = config.kibana.target.startsWith('https://') 
  ? new https.Agent({ keepAlive: true })
  : new http.Agent({ keepAlive: true });

app.use((req, res, next) => {
  req.startTimeMs = Date.now();
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/expire-cookies-and-redirect', (req, res) => {
  res.setHeader('Set-Cookie', [
    'sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly',
    '_oauth2_proxy=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly'
  ]);
  res.redirect(302, '/oauth2/sign_in');
});

app.use(async (req, res, next) => {
  const cookies = cookie.parse(req.headers.cookie || '');
  const oauth2ProxyCookie = cookies._oauth2_proxy;
  const sidCookie = cookies.sid;
  const email = req.headers['x-forwarded-email'];

  if (!email) {
    logger.error('Authentication header "x-forwarded-email" is missing');
    return res.status(401).send('Authentication header is missing');
  }

  const username = email.split('@')[0];
  const emailDomain = email.split('@')[1];
  req.username = username

  if (!emailDomain) {
    logger.error(`Authentication header "x-forwarded-email" does not contain a valid email address: ${email}`);
    return res.status(401).send('Authentication header is invalid');
  }

  if (!config.auth.allowedEmailDomains.includes(emailDomain)) {
    logger.error(`Authentication header "x-forwarded-email" contains a domain that is not allowed: ${email}`);
    return res.status(401).send(`Authentication header not allowed`);
  }

  if (!oauth2ProxyCookie) {
    logger.error('Missing _oauth2_proxy cookie');
    return res.status(401).send('Authentication cookie is missing');
  }

  if (sidCookie) {
    return next();
  }

  logger.info(`Authenticating user: ${username} (${email})`);

  try {
    const userExists = await authService.checkUserExists(username);
    const password = authService.generatePassword();

    if (!userExists) {
      await authService.createUser(username, email, password);
    } else {
      await authService.updateUserPassword(username, email, password);
    }

    const loginRes = await authService.loginToKibana(username, password);
    const setCookieHeaders = loginRes.headers.raw()['set-cookie'];

    if (!setCookieHeaders || !setCookieHeaders.some(c => c.includes('sid='))) {
      logger.error(`No sid cookie returned for user: ${username}`);
      return res.status(401).send('Failed to retrieve sid cookie');
    }

    res.setHeader('Set-Cookie', setCookieHeaders);
    return res.redirect(req.originalUrl);
  } catch (err) {
    logger.error(`Error authenticating user ${username}: ${err.message}`);
    return res.status(500).send('Internal authentication error');
  }
});

app.use(
  '/api/security/logout',
  createProxyMiddleware({
    target: config.kibana.target,
    changeOrigin: true,
    selfHandleResponse: false,
    agent: agent,
    pathRewrite: (path) => {
      return '/api/security/logout'
    },
    on: {
      proxyReq: (proxyReq, req, res) => {
          logProxy(req);
      },
      proxyRes: (proxyRes, req, res) => {
        proxyRes.headers['location'] = '/expire-cookies-and-redirect';
          logProxy(req, proxyRes);
      },
      error: (err, req, res) => {
        logger.error(`Proxy error: ${err.message}`);
        res.status(502).send('Failed to reach Kibana');
      },
    },
  })
);

app.use(
  createProxyMiddleware({
    target: config.kibana.target,
    changeOrigin: true,
    selfHandleResponse: false,
    agent: agent,
    on: {
      proxyReq: (proxyReq, req, res) => {
          logProxy(req);
      },
      proxyRes: (proxyRes, req, res) => {
          logProxy(req, proxyRes);
      },
      error: (err, req, res) => {
        logger.error(`Proxy error: ${err.message}`);
        res.status(502).send('Failed to reach Kibana');
      },
    },
  })
);

/* istanbul ignore next */
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    logger.info(`Running at http://localhost:${config.port}`);
  });
}

export default app;