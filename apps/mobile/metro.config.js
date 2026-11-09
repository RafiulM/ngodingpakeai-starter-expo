// Expo's Metro config already supports pnpm workspaces (packages/shared).
// Keep package exports enabled: Better Auth relies on them.
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// inlineRem: 16 matches the rem size React Native Reusables components expect.
module.exports = withNativeWind(config, {
  input: "./src/global.css",
  inlineRem: 16,
});
