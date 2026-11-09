import { expoClient } from "@better-auth/expo/client";
import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { ac, roles } from "@starter/shared/permissions";
import { siteConfig } from "@starter/shared/site";
import { API_URL } from "@/lib/api-url";

// Better Auth on the Express API. expoClient stores the session cookie in
// SecureStore and sends expo-origin (the app's scheme, or exp://… in Expo Go)
// on every auth request, because native requests carry no Origin header.
// cookiePrefix must equal the API's advanced.cookiePrefix (siteConfig.id), or
// the session cookie is never stored.
//
// adminClient shares the access control, so screens can hide what a role
// cannot use. It is a convenience only: the API checks every request.
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: siteConfig.scheme,
      storagePrefix: siteConfig.id,
      cookiePrefix: siteConfig.id,
      storage: SecureStore,
    }),
    adminClient({ ac, roles }),
  ],
});

export type Session = typeof authClient.$Infer.Session;

// Re-reads the session, e.g. after the API answers 401. The root layout's
// guards then send a signed-out user to sign-in.
export function refreshSession() {
  authClient.$store.notify("$sessionSignal");
}
