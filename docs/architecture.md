# Architecture

An Express API, an Expo mobile app, and one shared package in a pnpm + Turborepo workspace, backed by one PostgreSQL database.

```text
packages/shared/src/
  validators/notes.ts         strict zod input schemas (API parses, app types forms)
  permissions.ts              RBAC statement, roles, roleHasPermission()
  types/api.ts                response DTOs as the app receives them (ISO dates)
  site.ts                     identity and deep-link scheme from starter.config.json

apps/api/src/                 Express 5 + TypeScript, run with tsx (dev) / tsup bundle (prod)
  server.ts                   listen, startup log, graceful shutdown, crash logging
  app.ts                      createApp(): middleware order (see below)
  load-env.ts                 reads the repository root's .env.local / .env
  migrate.ts, set-role.ts     CLI entrypoints (pnpm db:migrate, pnpm role:set)
  config/env.ts               validated environment, trusted origins, log level
  db/schema/*.ts              one Drizzle table per file; index.ts exports all
  db/index.ts                 shared node-postgres pool + Drizzle
  lib/auth.ts                 Better Auth server (expo + admin plugins, trusted origins)
  lib/logger.ts               pino: JSON in production, pretty in development
  lib/request-context.ts      AsyncLocalStorage { reqId, userId } for every log line
  middleware/                 requireAuth, requirePermission, requireTrustedOrigin,
                              jsonBody, noStore, notFound + errorHandler
  routes/                     index.ts mounts health, notes, admin routers
  services/notes.service.ts   application rules and every Notes query
  test/                       vitest + supertest against disposable PostgreSQL
apps/api/drizzle/             committed SQL migrations + metadata

apps/mobile/                  Expo SDK 58 app (Expo Go, iOS + Android)
  app.config.ts               identity + scheme from starter.config.json, dev API port
  src/app/_layout.tsx         providers, splash, Stack.Protected session and role guards
  src/app/*.tsx               screens: index (starter placeholder), notes, admin, sign-in/up
  src/lib/api-url.ts          EXPO_PUBLIC_API_URL, or Metro's host + the API port in dev
  src/lib/auth-client.ts      Better Auth client: expoClient (SecureStore) + adminClient
  src/lib/api/client.ts       apiFetch + ApiError: stored cookie, expo-origin, error envelope
  src/lib/query-client.ts     QueryClient, AppState focus, expo-network online, 401 handling
  src/features/notes/         api.ts → queries.ts → hooks.ts → components/
  src/features/admin/         cross-account notes hooks
  src/components/ui/          React Native Reusables source (NativeWind), owned here
  src/test/                   jest-expo + React Native Testing Library
  .maestro/                   Maestro flows for pnpm test:e2e
```

## Request flow

```text
Expo app ──(Cookie from SecureStore, expo-origin: <scheme>://)──▶ Express API (BETTER_AUTH_URL)
                                                                   │ requireAuth → requireTrustedOrigin
                                                                   │ → validator → service → Drizzle → PostgreSQL
```

**Sign in.** The app's Better Auth client (`expoClient`) calls `/api/auth/*` on the API with an `expo-origin` header, because native requests carry no `Origin`. The server's `expo()` plugin promotes it to `Origin`; Better Auth checks it against `trustedOrigins` (the app's scheme, plus `exp://` for Expo Go in development), validates the credentials, and returns the session cookie. The client stores that cookie in SecureStore. Its name starts with `cookiePrefix` (`starter.config.json` `id`); the client must be configured with the same prefix.

**App start.** The root layout keeps the splash screen up until `useSession()` has read the stored session, then `Stack.Protected` guards show either the signed-in screens or sign-in. The query cache is cleared whenever the signed-in user changes.

**API calls.** The app reads the stored cookie (`authClient.getCookie()`) and sends it in a `Cookie` header with `credentials: "omit"`, plus `expo-origin` on every request. Mutations pass `requireTrustedOrigin`, which uses Better Auth's own `isTrustedOrigin`, so both checks always agree.

**Authorization.** The API is the authority: `requireAuth` reads the session from the database on every request (no cookie cache), so signing out or revoking a session takes effect immediately; `requirePermission` reads the stored role. `roleHasPermission` in the app only decides what to show.

**Browsers.** Native requests are not subject to CORS. Browser origins (an Expo web build, an admin site) are opt-in through `TRUSTED_ORIGINS`: they get CORS headers with credentials, and their real `Origin` always wins over any `expo-origin` they add.

## API middleware order (`app.ts`)

1. `helmet` (CORP `same-site`), `trust proxy` from `TRUST_PROXY`
2. request context (reqId from a safe `X-Request-Id` or a new UUID) + `pino-http` access log
3. `cors` for `TRUSTED_ORIGINS` browsers with credentials, exposing `X-Request-Id` and `Location`
4. client IP header for Better Auth's per-IP rate limits (from `req.ip`, never client-supplied)
5. Better Auth at `/api/auth/*splat` — before any body parser, because it reads the raw stream; `limitAuthBody` first refuses bodies over 100 kB (413) or streamed without `Content-Length` (411)
6. `/api` routers: `noStore`, then per router `requireAuth` → `requireTrustedOrigin` → (`requirePermission`) → `jsonBody` on POST/PATCH → handler
7. `notFound`, `errorHandler` (HttpError, Zod 422, JSON 400/413, generic 500)

Express 5 forwards rejected promises from async handlers and middleware to the error handler, so handlers simply `throw`.

## Logging

The API logs with pino: one JSON object per line in production (ready for Docker logs, Loki, Datadog, …) and colorized single lines in development.

- Every request gets one access line (`GET /api/notes 200 8ms`) at `info`, `warn` for 4xx, `error` for 5xx; health checks log at `debug`.
- An AsyncLocalStorage context adds `reqId` and, once authenticated, `userId` to every line — including anything a service logs with `import { logger }`. A well-formed incoming `X-Request-Id` is reused, so a load balancer or the app can trace one request end to end.
- Unexpected errors are logged once, with their stack, on the access line (`res.err`); the client gets a generic 500.
- Better Auth's own logs go through the same logger (`module: "better-auth"`); `LOG_SQL=true` adds Drizzle query lines (`module: "db"`, parameters omitted).
- Cookie, authorization, and `set-cookie` headers are redacted, as are `password`, `newPassword`, `currentPassword`, `token`, and `secret` fields one level inside a logged object (e.g. `{ user: { password } }`); query parameters that look like credentials are blanked in URLs. Redaction is a safety net: never log request bodies or credentials in the first place.
- `LOG_LEVEL` overrides the defaults (`debug` in development, `info` in production, `silent` in API tests).

## Development loop

`pnpm dev` (`scripts/dev.mjs`) runs `pnpm dev:prepare` (settings, database, migrations), then the API through Turborepo next to the Expo dev server, which keeps the terminal for its QR code and shortcuts. Stopping either stops both. The API (`tsx watch`) restarts on any change to `apps/api/src`, `packages/shared/src`, or the root `.env.local`/`.env`. `server.ts` closes the HTTP server and the pg pool on SIGTERM, so restarts take well under a second without `EADDRINUSE` or leaked connections.

The API takes its port from `BETTER_AUTH_URL` and listens on every interface (`HOST=0.0.0.0`), so a phone on the same Wi-Fi reaches it at `http://<your-computer's-LAN-IP>:4000`. Metro serves the app with fast refresh, including edits in `packages/shared`; the app derives the API's address from Metro's host (see [mobile](mobile.md)).

## Data and configuration

One ignored root `.env.local` serves the API and scripts (process environment wins, then `.env.local`, then `.env`). `pnpm run setup` appends only missing values. `DATABASE_URL` configures runtime PostgreSQL; `MIGRATION_DATABASE_URL` optionally supplies a direct migration connection. The API pool allows ten connections per process with timeouts and an idle-error handler. Tests always provision their own disposable PostgreSQL server.

Schema updates use `pnpm db:generate` then `pnpm db:migrate`. Startup never pushes schema, erases tables, or seeds accounts.

## Dependency notes

TypeScript 6.0 (what Expo SDK 58 expects; it defaults `types` to `[]`, so Node and test types are referenced where they are used) and ESLint 9 are pinned with `typescript-eslint` and `eslint-plugin-react-hooks`. Shared versions (better-auth, `@better-auth/expo`, drizzle-orm, pg, pino, zod, TypeScript, `@types/react`) come from the pnpm catalog in `pnpm-workspace.yaml`; Expo-managed versions in `apps/mobile` follow `npx expo install`. pnpm keeps isolated `node_modules`: packages the app's compiled code imports (e.g. `react-native-css-interop`, injected by NativeWind) are listed as direct dependencies. pnpm blocks dependency install scripts unless listed under `allowBuilds`. The `@esbuild-kit/core-utils` override updates Drizzle Kit's legacy nested esbuild to the patched 0.25.12. Turborepo runs in `envMode: "loose"` so your shell environment reaches the apps, matching the precedence above.
