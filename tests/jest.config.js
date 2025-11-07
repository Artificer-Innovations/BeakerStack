module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
  ],
  moduleNameMapper: {
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
  },
  setupFilesAfterEnv: [],
  testTimeout: 30000, // 30 seconds for integration tests
  verbose: true,
};
