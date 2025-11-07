const path = require("path");
const root = path.resolve(__dirname, "../..");
const sharedSrcPath = path.join(root, "packages/shared/src");

module.exports = {
  testEnvironment: "jsdom",
  roots: [
    path.join(__dirname, "__tests__"),
    sharedSrcPath
  ],
  rootDir: root,
  setupFilesAfterEnv: [path.join(__dirname, "jest.setup.web.ts")],
  moduleNameMapper: {
    "^@shared/src/(.*)$": path.join(sharedSrcPath, "$1"),
    "^react-native$": "react-native-web",
    "^react-router-dom$": path.join(__dirname, "__mocks__/react-router-dom.tsx")
  },
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": [
      "babel-jest",
      { configFile: path.join(__dirname, "babel.config.cjs") }
    ]
  },
  transformIgnorePatterns: [
    "node_modules/(?!^$)" // default; adjust to transpile specific libs if needed
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  collectCoverageFrom: [
    "<rootDir>/packages/shared/src/**/*.{ts,tsx}",
    "!<rootDir>/packages/shared/src/**/*.d.ts",
    "!<rootDir>/packages/shared/src/**/__tests__/**",
    "!<rootDir>/packages/shared/src/**/__mocks__/**",
    "!<rootDir>/packages/shared/src/index.ts"
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/",
    "/__mocks__/"
  ],
  coverageDirectory: path.join(__dirname, "coverage"),
  coverageReporters: ["text", "lcov", "html", "json"],
  testMatch: [
    "**/__tests__/**/*.test.{ts,tsx}"
  ],
  coverageProvider: "v8"
};

