module.exports = function(api) {
  api.cache(true);
  
  // Use babel-preset-expo for native (it handles Flow types in @react-native packages)
  // For web, we'll use the explicit config in jest.web.cjs
  if (process.env.NATIVE_TESTS === 'true' || process.env.JEST_WORKER_ID) {
    return {
      presets: ['babel-preset-expo'],
      // Jest cannot evaluate native dynamic import(); compile to require().
      plugins: ['babel-plugin-dynamic-import-node'],
    };
  }
  
  // Default for web tests
  return {
    presets: [
      ["@babel/preset-env", { targets: { node: "current" } }],
      ["@babel/preset-react", { runtime: "automatic" }],
      ["@babel/preset-typescript"]
    ]
  };
};
  