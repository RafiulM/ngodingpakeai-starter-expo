import Constants from "expo-constants";

// Where the app reaches the Express API.
// - EXPO_PUBLIC_API_URL wins. Release builds must set it to the API's HTTPS
//   origin (eas.json). It is inlined into the bundle, so it is public.
// - In development the API runs on the computer that serves this bundle, so
//   reuse Metro's host (your LAN IP on a phone, localhost on the iOS
//   simulator) with the API's port from BETTER_AUTH_URL (see app.config.ts).
function resolveApiUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return new URL(configured).origin;
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  const port = Constants.expoConfig?.extra?.devApiPort;
  if (__DEV__ && host && port) return `http://${host}:${port}`;
  throw new Error(
    "Set EXPO_PUBLIC_API_URL to the API's origin, e.g. https://api.example.com.",
  );
}

export const API_URL = resolveApiUrl();
