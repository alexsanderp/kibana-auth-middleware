import { jest } from '@jest/globals';
import request from 'supertest';
import app, { startServer } from '../index.js';
import * as authService from '../services/auth.service.js';
import nock from 'nock';
import fs from 'fs';

jest.mock('../services/auth.service.js');
jest.mock('../config/index.js', () => ({
  auth: {
    allowedEmailDomains: ['example.com'],
    cookieSecret: 'test-oauth2-proxy-cookie-secret'
  },
  kibana: {
    target: 'http://kibana:5601'
  },
  port: 3000
}));

afterAll(() => {
  nock.cleanAll();
  nock.restore();
});

describe('Server Setup', () => {
  describe('GET /health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /expire-cookies-and-redirect', () => {
    it('should set expired cookies and redirect', async () => {
      const response = await request(app).get('/expire-cookies-and-redirect');
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/oauth2/sign_in');
      expect(response.headers['set-cookie']).toContain('sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');
      expect(response.headers['set-cookie']).toContain('_oauth2_proxy=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly');
    });
  });

  describe('Authentication Middleware', () => {
    it('should return 401 when _oauth2_proxy cookie is missing', async () => {
      const response = await request(app)
        .get('/')
        .set('x-forwarded-email', 'user@example.com');
      expect(response.status).toBe(401);
      expect(response.text).toBe('Authentication cookie is missing');
    });

    it('should return 401 when x-forwarded-email header is missing', async () => {
      const response = await request(app)
        .get('/')
        .set('Cookie', '_oauth2_proxy=test-oauth2-proxy-cookie-secret');
      expect(response.status).toBe(401);
      expect(response.text).toBe('Authentication header is missing');
    });

    it('should return 401 when email domain is not allowed', async () => {
      const response = await request(app)
        .get('/')
        .set('Cookie', '_oauth2_proxy=test-oauth2-proxy-cookie-secret')
        .set('x-forwarded-email', 'user@invalid.com');
      expect(response.status).toBe(401);
      expect(response.text).toBe('Authentication header not allowed');
    });

    it('should return 401 when email format is invalid', async () => {
      const response = await request(app)
        .get('/')
        .set('Cookie', '_oauth2_proxy=test-oauth2-proxy-cookie-secret')
        .set('x-forwarded-email', 'invalid-email');
      expect(response.status).toBe(401);
      expect(response.text).toBe('Authentication header is invalid');
    });

    it('should authenticate new user successfully', async () => {
      authService.checkUserExists.mockResolvedValue(false);
      authService.generatePassword.mockReturnValue('test-password');
      authService.createUser.mockResolvedValue(true);
      authService.loginToKibana.mockResolvedValue({
        headers: {
          raw: () => ({
            'set-cookie': ['sid=test-sid; Path=/; HttpOnly']
          })
        }
      });

      const response = await request(app)
        .get('/')
        .set('Cookie', '_oauth2_proxy=test-oauth2-proxy-cookie-secret')
        .set('x-forwarded-email', 'user@example.com');

      expect(response.status).toBe(302);
      expect(response.headers['set-cookie']).toContain('sid=test-sid; Path=/; HttpOnly');
    });

    it('should authenticate existing user successfully', async () => {
      authService.checkUserExists.mockResolvedValue(true);
      authService.generatePassword.mockReturnValue('test-password');
      authService.updateUserPassword.mockResolvedValue(true);
      authService.loginToKibana.mockResolvedValue({
        headers: {
          raw: () => ({
            'set-cookie': ['sid=test-sid; Path=/; HttpOnly']
          })
        }
      });

      const response = await request(app)
        .get('/')
        .set('Cookie', '_oauth2_proxy=test-oauth2-proxy-cookie-secret')
        .set('x-forwarded-email', 'user@example.com');

      expect(response.status).toBe(302);
      expect(response.headers['set-cookie']).toContain('sid=test-sid; Path=/; HttpOnly');
    });

    it('should handle authentication error', async () => {
      authService.checkUserExists.mockResolvedValue(true);
      authService.generatePassword.mockReturnValue('test-password');
      authService.updateUserPassword.mockResolvedValue(true);
      authService.loginToKibana.mockRejectedValue(new Error('Auth error'));

      const response = await request(app)
        .get('/')
        .set('Cookie', '_oauth2_proxy=test-oauth2-proxy-cookie-secret')
        .set('x-forwarded-email', 'user@example.com');

      expect(response.status).toBe(500);
      expect(response.text).toBe('Internal authentication error');
    });

    it('should handle missing sid cookie in login response', async () => {
      authService.checkUserExists.mockResolvedValue(false);
      authService.generatePassword.mockReturnValue('test-password');
      authService.createUser.mockResolvedValue(true);
      authService.loginToKibana.mockResolvedValue({
        headers: {
          raw: () => ({
            'set-cookie': ['other-cookie=value; Path=/; HttpOnly']
          })
        }
      });

      const response = await request(app)
        .get('/')
        .set('Cookie', '_oauth2_proxy=test-oauth2-proxy-cookie-secret')
        .set('x-forwarded-email', 'user@example.com');

      expect(response.status).toBe(401);
      expect(response.text).toBe('Failed to retrieve sid cookie');
    });
  });

  describe('Proxy Middleware', () => {
    it('should handle logout endpoint', async () => {
      nock.cleanAll();
      nock('http://kibana:5601')
        .get('/api/security/logout')
        .reply(302);

      const response = await request(app)
        .get('/api/security/logout')
        .set('Cookie', '_oauth2_proxy=test-oauth2-proxy-cookie-secret; sid=existing-sid')
        .set('x-forwarded-email', 'user@example.com');

      expect(response.status).toBe(302);
    });

    it('should handle proxy error for logout endpoint', async () => {
      nock.cleanAll();
      nock('http://kibana:5601')
        .get('/api/security/logout')
        .replyWithError('Proxy error');

      const response = await request(app)
        .get('/api/security/logout')
        .set('Cookie', '_oauth2_proxy=test-oauth2-proxy-cookie-secret; sid=existing-sid')
        .set('x-forwarded-email', 'user@example.com');

      expect(response.status).toBe(502);
      expect(response.text).toBe('Failed to reach Kibana');
    });

    it('should handle generic proxy error', async () => {
      nock.cleanAll();
      nock('http://kibana:5601')
        .get(/.*/)
        .replyWithError('Proxy error');

      const response = await request(app)
        .get('/any-path')
        .set('Cookie', '_oauth2_proxy=test-oauth2-proxy-cookie-secret; sid=existing-sid')
        .set('x-forwarded-email', 'user@example.com');

      expect(response.status).toBe(502);
      expect(response.text).toBe('Failed to reach Kibana');
    });

    it('should create https.Agent when kibana.target is https', async () => {
      jest.resetModules();
      jest.doMock('../config/index.js', () => ({
        auth: {
          allowedEmailDomains: ['example.com'],
          cookieSecret: 'test-oauth2-proxy-cookie-secret'
        },
        kibana: {
          target: 'https://kibana:5601'
        },
        port: 3000
      }));
      
      nock.cleanAll();
      nock('https://kibana:5601')
        .get(/.*/)
        .reply(200);
      
      const app = (await import('../index.js')).default;
      const response = await request(app)
        .get('/any-path')
        .set('Cookie', '_oauth2_proxy=test-oauth2-proxy-cookie-secret; sid=existing-sid')
        .set('x-forwarded-email', 'user@example.com');
  
      expect(response.status).toBe(200);
    });
  });
});