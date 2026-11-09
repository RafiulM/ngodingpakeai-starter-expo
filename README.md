# Express Expo Postgres — ngodingpakeai starters

A monorepo starter with an **Express 5 API** and an **Expo (React Native) mobile app**, sharing one TypeScript contract:

- **API** (`apps/api`): Express 5 + TypeScript, Better Auth (with the Expo plugin), Drizzle ORM, PostgreSQL, simple role-based access, routes → services, structured pino logging, hot restart.
- **Mobile** (`apps/mobile`): Expo SDK 58 in Expo Go, Expo Router, Better Auth's Expo client (session in SecureStore), TanStack Query custom hooks, NativeWind + React Native Reusables, Lucide icons.
- **Shared** (`packages/shared`): zod validators, permissions, API types, app identity and deep-link scheme.

It includes working accounts, a blank signed-in home screen, a Notes feature that shows the full path from Express route to React Native screen, an admin screen guarded by roles, project skills, and Context7 configuration.

## Start here

Install **Node.js 22.12 or newer** and **Docker Desktop**, then start Docker Desktop. Run `corepack enable` once if you don't have pnpm. To open the app you need one of: **Expo Go** on your phone (App Store / Play Store, same Wi-Fi as your computer), Xcode's iOS simulator, or an Android Studio emulator.

Open this project folder in your AI editor and prompt:

> Build a personal reading list with accounts. Set up this project, run it, and let each person manage their own books.

The agent instructions make local setup part of the first app-building prompt, then continue your feature. See [the first-run workflow](docs/local-development.md).

Or run inside this folder:

```sh
pnpm run setup
pnpm dev
```

Type `pnpm run setup` and `pnpm run doctor` in full: `pnpm setup` and `pnpm doctor` are pnpm's own built-in commands and do something else.

`pnpm dev` starts the API on [localhost:4000](http://localhost:4000/api/health) and the Expo dev server in the same terminal. Scan its QR code with your phone's camera (iOS) or Expo Go (Android), or press `i` / `a` for a simulator or emulator. The app opens on sign-in, where you create your own account. On a phone, the app finds the API through the same address it loaded from, so there is nothing to configure.

Setup installs pinned dependencies, generates a private auth secret, the API origin, and a database password, starts PostgreSQL 17 through `compose.dev.yaml` in Docker, waits for it to be healthy, applies migrations, and checks everything. Values live in the ignored root `.env.local`; repeated setup preserves existing values and database records.

The database is published only on loopback, on a free high port recorded in `.env.local`, with data in a named Docker volume. `pnpm db:down` stops it while keeping data; `pnpm db:up` starts it again.

## Already have PostgreSQL?

Set a connection string in `.env.local` **before** running setup:

```dotenv
DATABASE_URL=postgresql://user:password@host:5432/database
```

A supplied connection bypasses Docker and migrations target that database. Use a database dedicated to this app and follow your provider's TLS requirements. With separate pooled and direct connections, use the pooled URL for `DATABASE_URL` and the direct URL for `MIGRATION_DATABASE_URL`.

## How the pieces fit

```text
Expo app ──Cookie (from SecureStore) + expo-origin: <scheme>://──▶ Express API :4000 ── routes → services → Drizzle → PostgreSQL
```

- The app signs in through Better Auth's Expo client, which stores the session cookie in SecureStore. Native requests carry no `Origin`, so the app sends `expo-origin` with its scheme from `starter.config.json`; the API's `expo()` plugin and `requireTrustedOrigin` check it.
- The API trusts the app's scheme, Expo Go (`exp://…`) in development only, and any browser origins you list in `TRUSTED_ORIGINS`.
- Screens use **custom hooks** (`useNotes`, `useCreateNote`, …) over TanStack Query; `Stack.Protected` guards keep signed-out users on sign-in and non-admins off the admin screen.

Read [architecture](docs/architecture.md), the [backend standard](docs/backend.md), and the [mobile standard](docs/mobile.md).

## Build with a prompt

Enable Context7 once in your editor; see [AI editor setup](docs/ai-workflow.md). Then try:

> Read AGENTS.md and use build-feature. Create a personal reading list. Let me add books, mark them finished, and delete them. Each account should only see its own books. Follow the Notes example from Express route to React Native screen, and use Context7 for current documentation. Build the smallest working version and test it.

More in [prompts](docs/prompts.md). No model API key is required by the app.

## What is included

| Area           | Included                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Monorepo       | pnpm workspaces + catalog, Turborepo, shared TypeScript contract package                        |
| API            | Express 5, routes → services, zod validation, JSON error envelope, helmet, CORS                 |
| Data           | Drizzle ORM, node-postgres pool, committed PostgreSQL migrations                                |
| Accounts       | Better Auth email/password with the Expo plugin; session in SecureStore; origin checks          |
| Roles          | Better Auth access control shared by both apps; permission-guarded routes and admin screen      |
| App            | Expo SDK 58 (Expo Go), Expo Router guards, NativeWind, React Native Reusables, dark mode        |
| App data       | `apiFetch`, query options, custom TanStack Query hooks, infinite lists, pull to refresh         |
| Logging        | pino, request IDs, AsyncLocalStorage context, redaction                                         |
| Dev loop       | One `pnpm dev`: API restarts on change, Metro fast refresh, QR code for your phone              |
| Local database | PostgreSQL 17 in Docker, persistent volume, random credentials, healthcheck                     |
| AI workflow    | AGENTS.md + agent.md, four project skills, Context7 configs for four editors                    |
| Quality        | Lint, types, API integration tests, app unit tests, Maestro flows, on disposable PostgreSQL; CI |
| Deployment     | API Dockerfile (turbo prune), self-contained API bundle, migrator image; EAS build profiles     |

## Commands

| Command                        | What it does                                                              |
| ------------------------------ | ------------------------------------------------------------------------- |
| `pnpm run setup`               | Install, configure, start local PostgreSQL if needed, migrate, check      |
| `pnpm dev`                     | Prepare the database, start the API and the Expo dev server               |
| `pnpm dev:api` / `dev:mobile`  | Start one side alone                                                      |
| `pnpm db:up` / `db:down`       | Start / stop this copy's local PostgreSQL (data kept)                     |
| `pnpm db:status` / `db:logs`   | Inspect the database container                                            |
| `pnpm db:generate`             | Generate migration SQL after a schema edit                                |
| `pnpm db:migrate`              | Apply committed migrations                                                |
| `pnpm db:studio`               | Inspect the database with Drizzle Studio                                  |
| `pnpm role:set <email> <role>` | Grant a role, e.g. `pnpm role:set you@example.com admin`                  |
| `pnpm run doctor`              | Check settings, API origin, app scheme, database, tables, and AI files    |
| `pnpm check`                   | Lint, typecheck, and tests against disposable PostgreSQL                  |
| `pnpm test`                    | API integration tests, app unit tests, setup, copier, and migration tests |
| `pnpm test:e2e`                | Maestro flows in Expo Go on a booted simulator or emulator                |
| `pnpm test:setup`              | Verify fresh setup, retries, and data persistence in a disposable copy    |
| `pnpm build`                   | Build the API and bundle the app's JavaScript for iOS and Android         |
| `pnpm start`                   | Serve the production API                                                  |
| `pnpm format`                  | Format source and docs                                                    |

Tests require Docker even if your app uses a hosted database: they launch a unique disposable PostgreSQL server and remove it afterward. `pnpm test:e2e` also needs [Maestro](https://docs.maestro.dev), a Java 17+ runtime, and Expo Go on a booted simulator or emulator; it runs its own API (port 4101) and Metro (port 8181).

## Customize and extend

- Identity and deep-link scheme: `starter.config.json` (shared through `@starter/shared/site`; the app reads it in `apps/mobile/app.config.ts`). Keep `scheme` stable once the app is on devices.
- Store identifiers: change the `com.ngodingpakeai` prefix in `apps/mobile/app.config.ts` to a reverse domain you own before the first store build.
- Your first feature: replace the placeholder in `apps/mobile/src/app/index.tsx`. `pnpm run doctor` reminds you until it is gone.
- Tables: `apps/api/src/db/schema/` (export from `index.ts`).
- Roles: `packages/shared/src/permissions.ts`.
- UI tokens: `apps/mobile/src/global.css` (and `src/lib/theme.ts` for navigation). Add components from `apps/mobile`: `npx @react-native-reusables/cli@latest add dialog`.
- Derivative: `pnpm create:variant dashboard ../my-dashboard` ([derivatives](docs/derivatives.md)).

## Hosting

Run the API as a Node.js service with a persistent PostgreSQL service, behind HTTPS. Apply migrations once per release. Build the app with EAS after setting `EXPO_PUBLIC_API_URL` in `apps/mobile/eas.json`. See [deployment](docs/deployment.md) for environment variables, proxies, Docker images, app builds, and the pre-launch security checklist:

```sh
docker build -f apps/api/Dockerfile -t my-api .
docker build -f apps/api/Dockerfile --target migrator -t my-api-migrate .
```

Email verification, password recovery email, social login, push notifications, billing, and AI provider calls are not configured. Add only the services your product needs.

## Troubleshooting

- **Docker not found / cannot connect:** install and start Docker Desktop, then run setup again.
- **Phone cannot load the app or reach the API:** keep the phone and computer on the same Wi-Fi, allow Node.js through the firewall, and use the `exp://` address Expo prints (not `localhost`). On networks that block devices from each other, see [local development](docs/local-development.md#reaching-the-api-from-a-phone).
- **Sign-in seems to work but you stay signed out:** the app's `cookiePrefix` must equal the API's (`starter.config.json` `id`); restart Metro after changing `starter.config.json`.
- **403 `FORBIDDEN_ORIGIN`:** send `expo-origin` with the scheme from `starter.config.json` (the app does this), or list a browser origin in `TRUSTED_ORIGINS`. Expo Go is trusted only when `NODE_ENV` is `development`.
- **"Unable to resolve module" in Metro:** add the package to `apps/mobile` with `npx expo install` (pnpm keeps each package's dependencies private), then restart with `pnpm dev:mobile -- --clear`.
- **Port in use:** change `BETTER_AUTH_URL` in `.env.local` (the API and the app follow it), or start Metro elsewhere with `pnpm dev:mobile -- --port 8082`.
- **Your saved database port is occupied:** update both `POSTGRES_PORT` and the port inside `DATABASE_URL`, then `pnpm db:up`.
- **Database password rejected:** changing `POSTGRES_PASSWORD` does not change the password inside an existing volume. Restore the original value; do not delete the volume.
- **Missing tables:** run `pnpm db:migrate`.
- **Something failed:** find the request's `reqId` in the API logs (or the `X-Request-Id` response header).

MIT. See [LICENSE](LICENSE) and [third-party notices](THIRD_PARTY_NOTICES.md).
