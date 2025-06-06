import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `[${timestamp}] ${level} ${message}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

function logProxy(req, proxyRes = null) {
  if (process.env.LOG_LEVEL === 'debug') {
    const base = {
      user: req.username,
      method: req.method,
      path: req.url,
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      user_agent: req.headers['user-agent'],
      referer: req.headers['referer'],
    };

    if (proxyRes) {
      const duration_ms = Date.now() - req.startTimeMs;

      base.status = proxyRes.statusCode;
      base.status_message = proxyRes.statusMessage;
      base.response_size = proxyRes.headers['content-length'];
      base.content_type = proxyRes.headers['content-type'];
      base.duration_ms = duration_ms

      logger.debug(`Proxy response: ${JSON.stringify(base)}`);
    } else {
      logger.debug(`Proxy request: ${JSON.stringify(base)}`);
    }
  }
};

function logFetch(username, method, url, durationMs = null, response = null) {
  const base = {
    user: username,
    method,
    url,
  };

  if (response) {
    base.status = response.status;
    base.status_message = response.statusText;
    base.response_size = response.headers.get('content-length');
    base.content_type = response.headers.get('content-type');
    base.duration_ms = durationMs;
    logger.debug(`Fetch response: ${JSON.stringify(base)}`);
  } else {
    logger.debug(`Fetch request: ${JSON.stringify(base)}`);
  }
};

export default logger;
export { logProxy, logFetch };