const path = require("path");
const root = path.resolve(__dirname, "../..");

module.exports = {
  testEnvironment: "jsdom",
  roots: [path.join(__dirname, "__tests__")],
  setupFilesAfterEnv: [path.join(__dirname, "jest.setup.web.ts")],
  moduleNameMapper: {
    "^@shared/src/(.*)$": path.join(root, "packages/shared/src/$1"),
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
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"]
};

