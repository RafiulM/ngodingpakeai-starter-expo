/// <reference types="node" />
// Expo evaluates this file in Node when it starts or builds the app.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import type { ExpoConfig } from "expo/config";
import starter from "../../starter.config.json";

// Store identifiers. Change the prefix to a reverse domain you own before the
// first store build; the scheme keeps each derivative's identifier unique.
const appId = `com.ngodingpakeai.${starter.scheme}`;

// The API's development port, from BETTER_AUTH_URL in the shell or the
// repository root's .env.local / .env (the same precedence as the API). Only
// this value is read: other settings in those files never reach the app.
function devApiPort() {
  let value = process.env.BETTER_AUTH_URL;
  for (const name of [".env.local", ".env"]) {
    if (value) break;
    try {
      value = parseEnv(
        readFileSync(resolve(__dirname, "../..", name), "utf8"),
      ).BETTER_AUTH_URL;
    } catch {
      // Missing file: nothing to read.
    }
  }
  return new URL(value || "http://localhost:4000").port || "4000";
}

export default (): ExpoConfig => ({
  name: starter.name,
  slug: starter.id,
  version: "1.0.0",
  // Native only. Adding web needs react-native-web and a browser origin in
  // the API's TRUSTED_ORIGINS.
  platforms: ["ios", "android"],
  // Deep links and the origin the API trusts (`${scheme}://`).
  scheme: starter.scheme,
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: appId,
    icon: "./assets/expo.icon",
  },
  android: {
    package: appId,
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#ffffff",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
        dark: { backgroundColor: "#0a0a0a" },
      },
    ],
  ],
  experiments: { reactCompiler: true },
  extra: { devApiPort: devApiPort() },
});
