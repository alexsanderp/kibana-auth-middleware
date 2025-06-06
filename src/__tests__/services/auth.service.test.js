import { jest } from '@jest/globals';
import fetch from 'node-fetch';
import crypto from 'crypto';

jest.mock('node-fetch');
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from('a'.repeat(16))),
}));
jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  logFetch: jest.fn()
}));

describe('Auth Service', () => {
  let authService;
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = require('../../services/auth.service.js');
    logger = require('../../utils/logger.js');
  });

  describe('generatePassword', () => {
    it('should generate a random password', () => {
      const password = authService.generatePassword();
      expect(password).toBeDefined();
      expect(typeof password).toBe('string');
      expect(password.length).toBe(32);
      expect(crypto.randomBytes).toHaveBeenCalledWith(16);
      expect(password).toBe('61616161616161616161616161616161');
    });
  });

  describe('fetchWithTimeout', () => {
    it('should make a successful request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: () => Promise.resolve('success')
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const response = await authService.fetchWithTimeout('http://test.com', {
        method: 'GET',
        username: 'testuser'
      });

      expect(response).toBe(mockResponse);
      expect(fetch).toHaveBeenCalledWith('http://test.com', expect.any(Object));
    });

    it('should handle timeout error', async () => {
      const error = new Error('AbortError');
      error.name = 'AbortError';
      fetch.mockRejectedValueOnce(error);

      await expect(authService.fetchWithTimeout('http://test.com', {
        method: 'GET',
        username: 'testuser'
      })).rejects.toThrow('Request timed out after');
    });

    it('should handle other errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(authService.fetchWithTimeout('http://test.com', {
        method: 'GET',
        username: 'testuser'
      })).rejects.toThrow('Network error');
    });
  });

  describe('checkUserExists', () => {
    it('should return true when user exists', async () => {
      const mockResponse = {
        status: 200,
        text: () => Promise.resolve('user exists')
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const exists = await authService.checkUserExists('testuser');
      expect(exists).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/_security/user/testuser'),
        expect.any(Object)
      );
    });

    it('should return false when user does not exist', async () => {
      const mockResponse = {
        status: 404,
        text: () => Promise.resolve('user not found')
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const exists = await authService.checkUserExists('testuser');
      expect(exists).toBe(false);
    });

    it('should throw error on server error', async () => {
      const mockResponse = {
        status: 500,
        text: () => Promise.resolve('server error')
      };
      fetch.mockResolvedValueOnce(mockResponse);

      await expect(authService.checkUserExists('testuser')).rejects.toThrow('Failed to check user');
    });

    it('should throw error on fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(authService.checkUserExists('testuser')).rejects.toThrow('Network error');
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('user created')
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await authService.createUser('testuser', 'test@example.com', 'password');
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/_security/user/testuser'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"password":"password"')
        })
      );
    });

    it('should throw error on failure', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: () => Promise.resolve('invalid request')
      };
      fetch.mockResolvedValueOnce(mockResponse);

      await expect(authService.createUser('testuser', 'test@example.com', 'password'))
        .rejects.toThrow('Failed to create user');
    });

    it('should throw error on fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(authService.createUser('testuser', 'test@example.com', 'password'))
        .rejects.toThrow('Network error');
    });
  });

  describe('updateUserPassword', () => {
    it('should update password successfully', async () => {
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('password updated')
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await authService.updateUserPassword('testuser', 'test@example.com', 'newpassword');
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/_security/user/testuser'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"password":"newpassword"')
        })
      );
    });

    it('should throw error on failure', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: () => Promise.resolve('invalid request')
      };
      fetch.mockResolvedValueOnce(mockResponse);

      await expect(authService.updateUserPassword('testuser', 'test@example.com', 'newpassword'))
        .rejects.toThrow('Failed to update password');
    });

    it('should throw error on fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(authService.updateUserPassword('testuser', 'test@example.com', 'newpassword'))
        .rejects.toThrow('Network error');
    });
  });

  describe('loginToKibana', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        ok: true,
        text: () => Promise.resolve('login successful')
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const response = await authService.loginToKibana('testuser', 'password');
      expect(response).toBe(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/internal/security/login'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"username":"testuser"')
        })
      );
    });

    it('should throw error on login failure', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: () => Promise.resolve('invalid credentials')
      };
      fetch.mockResolvedValueOnce(mockResponse);

      await expect(authService.loginToKibana('testuser', 'wrongpassword'))
        .rejects.toThrow('Failed to login to Kibana');
    });

    it('should throw error on fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(authService.loginToKibana('testuser', 'password'))
        .rejects.toThrow('Network error');
    });
  });
}); 