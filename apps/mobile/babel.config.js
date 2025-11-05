module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    /*
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@shared': '../../packages/shared/src',
          },
          extensions: ['.native.tsx', '.native.ts', '.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json']
        }
      ]
    ]
    */
  };
};
