import { jest } from '@jest/globals';
import logger, { logProxy, logFetch } from '../../utils/logger.js';
import winston from 'winston';

describe('Logger', () => {
  let mockTransport;
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    process.env.LOG_LEVEL = 'debug';
    logger.level = 'debug';
    mockTransport = new winston.transports.Console();
    mockTransport.log = jest.fn();
    logger.add(mockTransport);
  });

  afterEach(() => {
    process.env.LOG_LEVEL = originalLogLevel;
    logger.remove(mockTransport);
  });

  describe('logProxy', () => {
    it('should not log when LOG_LEVEL is not debug', () => {
      process.env.LOG_LEVEL = 'info';
      const mockReq = {
        username: 'testuser',
        method: 'GET',
        url: '/test'
      };

      logProxy(mockReq);
      expect(mockTransport.log).not.toHaveBeenCalled();
    });

    it('should not log when LOG_LEVEL is not set', async () => {
      const originalLogLevel = process.env.LOG_LEVEL;
      delete process.env.LOG_LEVEL;

      jest.resetModules();
      const { logProxy: newLogProxy } = await import('../../utils/logger.js');

      const mockReq = {
        username: 'testuser',
        method: 'GET',
        url: '/test'
      };

      newLogProxy(mockReq);
      expect(mockTransport.log).not.toHaveBeenCalled();

      process.env.LOG_LEVEL = originalLogLevel;
    });

    it('should log proxy request with all fields', () => {
      const mockReq = {
        username: 'testuser',
        method: 'GET',
        url: '/test',
        headers: {
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'test-agent',
          'referer': 'http://test.com'
        },
        socket: {
          remoteAddress: '127.0.0.1'
        }
      };

      logProxy(mockReq);
      expect(mockTransport.log).toHaveBeenCalled();
      const logCall = mockTransport.log.mock.calls[0][0];
      expect(logCall[Symbol.for('level')]).toBe('debug');
      expect(logCall.message).toContain('"user":"testuser"');
      expect(logCall.message).toContain('"method":"GET"');
      expect(logCall.message).toContain('"path":"/test"');
      expect(logCall.message).toContain('"ip":"127.0.0.1"');
      expect(logCall.message).toContain('"user_agent":"test-agent"');
      expect(logCall.message).toContain('"referer":"http://test.com"');
    });

    it('should use socket.remoteAddress when x-forwarded-for is not present', () => {
      const mockReq = {
        username: 'testuser',
        method: 'GET',
        url: '/test',
        headers: {},
        socket: {
          remoteAddress: '192.168.1.100'
        }
      };

      logProxy(mockReq);
      expect(mockTransport.log).toHaveBeenCalled();
      const logCall = mockTransport.log.mock.calls[0][0];
      expect(logCall.message).toContain('"ip":"192.168.1.100"');
    });

    it('should log proxy response with all fields', () => {
      const mockReq = {
        username: 'testuser',
        method: 'GET',
        url: '/test',
        _startAt: Date.now() - 100,
        headers: {
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'test-agent',
          'referer': 'http://test.com'
        },
        socket: {
          remoteAddress: '127.0.0.1'
        }
      };

      const mockProxyRes = {
        statusCode: 200,
        statusMessage: 'OK',
        headers: {
          'content-length': '100',
          'content-type': 'application/json'
        }
      };

      logProxy(mockReq, mockProxyRes);
      expect(mockTransport.log).toHaveBeenCalled();
      const logCall = mockTransport.log.mock.calls[0][0];
      expect(logCall[Symbol.for('level')]).toBe('debug');
      expect(logCall.message).toContain('"user":"testuser"');
      expect(logCall.message).toContain('"method":"GET"');
      expect(logCall.message).toContain('"path":"/test"');
      expect(logCall.message).toContain('"ip":"127.0.0.1"');
      expect(logCall.message).toContain('"user_agent":"test-agent"');
      expect(logCall.message).toContain('"referer":"http://test.com"');
      expect(logCall.message).toContain('"status":200');
      expect(logCall.message).toContain('"status_message":"OK"');
      expect(logCall.message).toContain('"response_size":"100"');
      expect(logCall.message).toContain('"content_type":"application/json"');
      expect(logCall.message).toContain('"duration_ms":');
    });
  });

  describe('logFetch', () => {
    it('should log fetch request with all fields', () => {
      logFetch('testuser', 'GET', 'http://test.com');
      expect(mockTransport.log).toHaveBeenCalled();
      const logCall = mockTransport.log.mock.calls[0][0];
      expect(logCall[Symbol.for('level')]).toBe('debug');
      expect(logCall.message).toContain('"user":"testuser"');
      expect(logCall.message).toContain('"method":"GET"');
      expect(logCall.message).toContain('"url":"http://test.com"');
    });

    it('should log fetch response with all fields', () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        headers: {
          get: (header) => {
            if (header === 'content-length') return '100';
            if (header === 'content-type') return 'application/json';
            return null;
          }
        }
      };

      logFetch('testuser', 'GET', 'http://test.com', 100, mockResponse);
      expect(mockTransport.log).toHaveBeenCalled();
      const logCall = mockTransport.log.mock.calls[0][0];
      expect(logCall[Symbol.for('level')]).toBe('debug');
      expect(logCall.message).toContain('"user":"testuser"');
      expect(logCall.message).toContain('"method":"GET"');
      expect(logCall.message).toContain('"url":"http://test.com"');
      expect(logCall.message).toContain('"status":200');
      expect(logCall.message).toContain('"content_type":"application/json"');
      expect(logCall.message).toContain('"response_size":"100"');
      expect(logCall.message).toContain('"duration_ms":');
    });
  });

  describe('Logger Configuration', () => {
    it('should use default level when LOG_LEVEL is not set', () => {
      const originalEnv = process.env.LOG_LEVEL;
      delete process.env.LOG_LEVEL;
      
      const newLogger = winston.createLogger({
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

      expect(newLogger.level).toBe('info');
      
      if (originalEnv) {
        process.env.LOG_LEVEL = originalEnv;
      }
    });

    it('should use LOG_LEVEL from environment', () => {
      const originalEnv = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'debug';
      
      const newLogger = winston.createLogger({
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

      expect(newLogger.level).toBe('debug');
      
      if (originalEnv) {
        process.env.LOG_LEVEL = originalEnv;
      }
    });
  });
}); 