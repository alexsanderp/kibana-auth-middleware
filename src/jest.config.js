export default {
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './.babelrc' }],
  },
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!jest.config.js',
    '!**/coverage/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  verbose: true,
  transformIgnorePatterns: [
    "/node_modules/(?!node-fetch)/"
  ],
  coverageThreshold: {
    global: {
        lines: 95
    }
  }
};