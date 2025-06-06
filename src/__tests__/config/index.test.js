import { jest } from '@jest/globals';
import dotenv from 'dotenv';

jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: () => {},
    error: () => {},
    debug: () => {}
  }
}));
jest.mock('dotenv', () => ({ config: () => {} }));

describe('Configuration', () => {
  beforeEach(() => {
    process.env.KIBANA_TARGET = 'http://kibana:5601';
    process.env.ELASTIC_TARGET = 'http://elastic:9200';
    process.env.ALLOWED_EMAIL_DOMAINS = 'example.com, test.com';
    process.env.ELASTIC_USER = 'elastic';
    process.env.ELASTIC_PASS = 'password';
  });

  afterEach(() => {
    delete process.env.KIBANA_TARGET;
    delete process.env.ELASTIC_TARGET;
    delete process.env.ALLOWED_EMAIL_DOMAINS;
    delete process.env.ELASTIC_USER;
    delete process.env.ELASTIC_PASS;
  });

  it('should load configuration successfully with all required environment variables', () => {
    const config = require('../../config/index.js').default;
    expect(config.kibana.target).toBe('http://kibana:5601');
    expect(config.elastic.target).toBe('http://elastic:9200');
    expect(config.auth.allowedEmailDomains).toEqual(['example.com', 'test.com']);
    expect(config.elastic.auth.username).toBe('elastic');
    expect(config.elastic.auth.password).toBe('password');
  });

   it('should throw error when required environment variables are missing', () => {
     delete process.env.KIBANA_TARGET;
     jest.resetModules();
     delete require.cache[require.resolve('../../config/index.js')];
     expect(() => require('../../config/index.js')).toThrow('Missing required environment variables: KIBANA_TARGET');
   });
});