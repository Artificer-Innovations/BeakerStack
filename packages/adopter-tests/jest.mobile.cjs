const path = require('path');

const root = path.resolve(__dirname, '../..');
const adopterMobilePath = path.join(root, 'adopter/mobile');
const sharedSrcPath = path.join(root, 'packages/shared/src');
const loggerSrcPath = path.join(root, 'packages/logger/src');

module.exports = {
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  testEnvironment: require.resolve('react-native/jest/react-native-env.js'),
  setupFiles: [require.resolve('react-native/jest/setup.js')],
  roots: [adopterMobilePath],
  rootDir: root,
  setupFilesAfterEnv: [
    path.join(__dirname, 'jest.setup.mobile.ts'),
    path.join(root, 'packages/shared-tests/setup.adopter.ts'),
  ],
  moduleNameMapper: {
    '^@beakerstack/shared/(.*)$': path.join(sharedSrcPath, '$1'),
    '^@beakerstack/logger$': path.join(loggerSrcPath, 'index.ts'),
    '^@beakerstack/test-utils/(.*)$': path.join(
      root,
      'packages/test-utils/src/$1'
    ),
    '^@adopter/(.*)$': path.join(root, 'adopter/$1'),
    '^@mobile/lib/(.*)$': path.join(root, 'apps/mobile/src/lib/$1'),
    '^react-native-svg$': path.join(
      root,
      'packages/shared-tests/__mocks__/react-native-svg.tsx'
    ),
    '^expo/virtual/env$': path.join(
      root,
      'apps/mobile/jest/expo-virtual-env-mock.cjs'
    ),
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      { configFile: path.join(__dirname, 'babel.config.cjs') },
    ],
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$':
      require.resolve('react-native/jest/assetFileTransformer.js'),
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)'],
  collectCoverageFrom: [
    '<rootDir>/adopter/mobile/**/*.{ts,tsx}',
    '!<rootDir>/adopter/mobile/**/*.d.ts',
    '!<rootDir>/adopter/mobile/**/__tests__/**',
    '!<rootDir>/adopter/mobile/**/types.ts',
    '!<rootDir>/adopter/mobile/**/index.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/', '/__mocks__/'],
  coverageDirectory: path.join(__dirname, 'coverage', 'mobile'),
  coverageReporters:
    process.env.COVERAGE_MERGE === '1'
      ? ['text', 'json']
      : ['text', 'lcov', 'html', 'json'],
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      statements: 98,
      branches: 93,
      functions: 96,
      lines: 99,
    },
  },
};
