import starter from "../../../starter.config.json" with { type: "json" };

// App identity, read from starter.config.json at the repository root. Change
// the name and description there; the API and the mobile app pick them up.
export const siteConfig = {
  id: starter.id,
  name: starter.name,
  description: starter.description,
  // The mobile app's deep-link scheme. The API trusts `${scheme}://` as the
  // app's origin, so keep it stable once the app is installed on devices.
  scheme: starter.scheme,
} as const;
