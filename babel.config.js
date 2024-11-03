module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      'nativewind/babel', // NativeWind plugin added as a preset
    ],
    plugins: [
      'react-native-reanimated/plugin' // Add Reanimated plugin here
    ],
  };
};
