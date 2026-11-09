# Express + Expo + PostgreSQL monorepo base

Derived from the Express + TanStack Start + PostgreSQL monorepo base version 0.1.0.

This starter keeps the API unchanged in shape: Express 5 with routes → services, Drizzle with node-postgres, Better Auth with roles (admin plugin and the same access-control statement), the Notes API contract, pino logging with request IDs, the Docker development database, the setup scripts, Context7, and the project skills. The TanStack Start web app is replaced by an Expo (React Native) mobile app.

Changes:

- `apps/web` was removed, with its Playwright suite. `apps/mobile` takes its place: Expo SDK 58 in Expo Go, Expo Router with `Stack.Protected` session and role guards, Better Auth's Expo client (session cookie in SecureStore), the same `apiFetch` → query options → custom hooks layering on TanStack Query (no SSR; infinite lists, pull to refresh, focus and online managers), NativeWind with React Native Reusables instead of Tailwind v4 + shadcn/ui, and Lucide icons. The Notes and admin screens, the starter placeholder, and its doctor reminder carry over.
- Tests: jest-expo + React Native Testing Library unit tests join `pnpm test`; `pnpm test:e2e` runs Maestro flows in Expo Go against a test API and Metro on disposable PostgreSQL. Test runs set `EXPO_PUBLIC_E2E=1`, which makes the password field a plain field so iOS password sheets cannot block Maestro.
- `pnpm dev` runs the API through Turborepo next to an interactive Expo dev server (QR code, simulator shortcuts). `pnpm build` also bundles the app's JavaScript for iOS and Android. `apps/mobile/eas.json` holds EAS build profiles.
- TypeScript moved to 6.0, the version Expo SDK 58 expects.
- Better Auth gained the `@better-auth/expo` server plugin. Native requests carry no `Origin`; the plugin promotes the Expo client's `expo-origin` header so Better Auth's origin checks apply.
- `env.trustedOrigins` is now the app's scheme (`starter.config.json` `scheme`), `exp://` for Expo Go in development only, and the optional browser `TRUSTED_ORIGINS`. `WEB_URL`, `VITE_API_URL`, `API_INTERNAL_URL`, and `COOKIE_DOMAIN` are gone.
- `requireTrustedOrigin` accepts `Origin` or, when absent, `expo-origin`, and matches with Better Auth's own `isTrustedOrigin`, so both checks agree on patterns. A browser's real `Origin` always wins.
- CORS covers only `TRUSTED_ORIGINS` browsers; native requests are not subject to CORS.
- The `/get-session` rate-limit exemption was removed: it existed for SSR lookups from one web server, which no longer happen.
- `pnpm run doctor` checks the API origin and the app scheme instead of web origins and cookie domains; setup no longer writes web settings.
- `create:variant` copies `apps/mobile`, skips `.expo`, and gives each copy its own scheme.
