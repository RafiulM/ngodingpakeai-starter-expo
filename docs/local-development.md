# Local development

Open this folder in your AI editor and describe the app you want:

> Build a personal reading list with accounts. Set up this project, run it, and let each person manage their own books.

`AGENTS.md` tells the agent to handle setup before continuing your feature. `agent.md` points to the same instructions. The project skills provide setup, database troubleshooting, feature-building, and derivative workflows.

## What runs where

`compose.dev.yaml` runs PostgreSQL 17. The Express API and Metro (the Expo dev server) run on your computer; the app runs in **Expo Go** on your phone, an iOS simulator, or an Android emulator. You need Node.js 22.12+, pnpm (`corepack enable` provides the pinned version), Docker with Compose v2 (Docker Desktop includes both), and one of:

- a phone with **Expo Go** (App Store / Play Store) on the same Wi-Fi as your computer;
- Xcode with an iOS simulator (macOS);
- Android Studio with an emulator.

```sh
pnpm run setup
pnpm dev
```

Setup checks Node.js and pnpm, installs the lockfile, generates missing private settings in the ignored root `.env.local`, chooses a free database port, creates a unique Compose project and persistent volume, waits for PostgreSQL health, applies committed Drizzle migrations, and checks the result. It can be repeated without changing credentials or deleting records.

`pnpm dev` prepares the database again (cheap when already running), starts the API, and starts Expo in the same terminal:

| What  | Where (default)            | Reloads                                                       |
| ----- | -------------------------- | ------------------------------------------------------------- |
| API   | `http://localhost:4000`    | restarts on changes to `apps/api`, `packages/shared`, `.env*` |
| Metro | `exp://<your-LAN-IP>:8081` | fast refresh, including `packages/shared`                     |

Scan the QR code with your phone's camera (iOS) or Expo Go (Android), or press `i` / `a` for a simulator or emulator; the first time, Expo installs Expo Go there. `pnpm dev:api` and `pnpm dev:mobile` start one side alone.

## Reaching the API from a phone

The API listens on every network interface. In development the app calls it on the same host it loaded Metro from, with the API's port from `BETTER_AUTH_URL` — no address to configure. Allow incoming connections for Node.js if your firewall asks, and keep the phone on the same Wi-Fi. If your network blocks device-to-device traffic, run `pnpm dev:mobile -- --tunnel` and set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env.local` to an address the phone can reach.

## Settings

| Setting           | Meaning                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------- |
| `BETTER_AUTH_URL` | The API's origin. The API dev server listens on its port.                               |
| `TRUSTED_ORIGINS` | Optional browser origins (e.g. an Expo web build) allowed to call the API with cookies. |
| `scheme`          | In `starter.config.json`: the app's deep-link scheme, trusted as the app's origin.      |

In development the API also trusts Expo Go (`exp://…`). To move the API to port 4500, set `BETTER_AUTH_URL=http://localhost:4500` and restart `pnpm dev`. A one-off override from the shell also works, because shell values win over `.env.local`:

```sh
BETTER_AUTH_URL=http://localhost:4500 pnpm dev
```

## Database commands

| Command           | Result                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| `pnpm db:up`      | Generate missing local settings and start PostgreSQL; wait until healthy |
| `pnpm db:status`  | Show this copy's running or stopped database container                   |
| `pnpm db:logs`    | Show the last 80 database log lines without following indefinitely       |
| `pnpm db:down`    | Remove this copy's container and network, keeping its data volume        |
| `pnpm db:migrate` | Apply committed migrations (`apps/api/drizzle`)                          |
| `pnpm db:studio`  | Browse the database with Drizzle Studio                                  |
| `pnpm run doctor` | Verify settings, scheme, connection, tables, and project tooling files   |

Use these commands instead of bare `docker compose up`: the wrappers load `.env.local` and `.env` with the same precedence as the API and apply the saved project name. The database listens only on `127.0.0.1`, using a generated high port recorded in `.env.local`. Each fresh derivative has its own project, password, port, and volume.

Preserve `.env.local` across restarts. Do not delete the volume to fix a password or migration error. If a saved port becomes occupied, update both `POSTGRES_PORT` and the port in the managed `DATABASE_URL`, then run `db:up` again. Changing the environment password does not change an existing database role's password.

## Logs

The API prints colorized single-line logs prefixed by Turborepo (`@starter/api:dev`); Metro prints the app's `console` output and errors. Each request shows its method, path, status, duration, and `reqId`, plus `userId` once signed in. Set `LOG_SQL=true` to see SQL, or `LOG_LEVEL=info` to quiet health checks and debug lines.

## Existing PostgreSQL connections

If you set `DATABASE_URL` before setup, the script keeps it and skips Docker. Use a database dedicated to your app. `MIGRATION_DATABASE_URL` is optional for a separate direct connection. The local container status/log/stop commands do not operate on external databases; use `pnpm run doctor` to check their connection.

## Verify a fresh start

```sh
pnpm test:setup
```

This integration check creates a temporary source copy with no dependencies or environment file, runs setup, stores a marker, repeats setup, recreates the database container, and confirms the marker survived. It removes only its own temporary copy and generated Docker volume. Docker and package registry access are required. The main project's environment and database are never used.
