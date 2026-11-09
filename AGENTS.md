# Build on this starter

This is the **Express + Expo + PostgreSQL monorepo** of the ngodingpakeai starter family. An Express 5 API (Better Auth, Drizzle, RBAC) and an Expo (React Native) mobile app live side by side and share one TypeScript contract package. Help beginners turn a plain-language idea into a working app. Keep explanations short, explain decisions in familiar words, and implement the smallest useful feature end to end. Ask only about product decisions that materially change the work.

## First prompt: set up, then build

A request to build or run an app includes preparing its local development environment. Do this on the first feature prompt even if the user never asks about a database. For read-only questions or reviews, do not start services unnecessarily.

1. Read `README.md`, `package.json`, and `.agents/skills/starter-setup/SKILL.md`.
2. If dependencies are missing, run `pnpm run setup`. If installed, run `pnpm dev:prepare` and `pnpm run doctor`. These commands preserve existing settings and data, prepare missing secrets, start managed PostgreSQL, wait for health, and apply committed migrations. Fix a reported setup problem before relying on database behavior.
3. Use the local Docker database by default when no `DATABASE_URL` is supplied. Do not ask beginners to choose a database provider, generate passwords, copy environment files, or create tables. If an existing Docker installation is stopped, start it when permitted. If a prerequisite needs user action, explain the exact action and continue work that does not depend on it.
4. Start `pnpm dev` in a persistent terminal unless it is already running. It starts the API on `BETTER_AUTH_URL` (default `http://localhost:4000`, every network interface) and Metro on port 8081. Verify `/api/health` and `http://localhost:8081/status` respond, then tell the user how to open the app: Expo Go on a phone on the same Wi-Fi (QR code in that terminal, or `exp://<LAN IP>:8081`), or `i` / `a` for a simulator or emulator. Avoid duplicate servers.
5. Continue the user's requested feature. Setup alone does not complete a request to build an app.

Always write `pnpm run setup` and `pnpm run doctor`: `pnpm setup` and `pnpm doctor` are pnpm built-ins that ignore this project's scripts. Other scripts (`pnpm dev`, `pnpm test`, `pnpm db:migrate`, …) can be called directly.

Use the relevant skill below. Clients without skill discovery should open its file directly. `agent.md` is an alternate entrypoint to these canonical instructions.

| Task                                                   | Project skill                            |
| ------------------------------------------------------ | ---------------------------------------- |
| First app prompt or setup problem                      | `.agents/skills/starter-setup/SKILL.md`  |
| Start, inspect, stop, or troubleshoot the dev database | `.agents/skills/dev-database/SKILL.md`   |
| Build a feature, change the UI, or add data            | `.agents/skills/build-feature/SKILL.md`  |
| Create a dashboard/chatbot/other derivative            | `.agents/skills/create-variant/SKILL.md` |

## Development database

`compose.dev.yaml` runs PostgreSQL only; the API and Metro run on the host. Use `pnpm db:up`, `db:status`, `db:logs`, and `db:down` so private environment settings and the saved Compose project name are loaded. Fresh setup chooses a free database port, generates credentials, and stores data in a persistent named volume. `db:down` keeps that volume. Preserve `.env.local` and never run volume deletion or destructive resets to repair setup. Supplied external connections bypass Docker. See `docs/local-development.md`.

## Current documentation with Context7

For library, framework, SDK, API, CLI, or cloud-service syntax, configuration, setup, migrations, or library-specific debugging, use Context7 even when the API seems familiar. Do not use it for pure business logic, general programming, or code review without an API question.

1. Call `resolve-library-id` with the library's official name and the actual question, unless the user supplied an exact Context7 library ID.
2. Select the official project or authoritative docs by relevance, reputation, coverage, and installed version. Refine a mismatched search.
3. Call `query-docs` with the resolved ID and a focused question. Use separate queries for unrelated concepts and observe the tool's call limits.
4. Check the examples against the installed version. If Context7 is unavailable, say so, use official documentation, and continue work that does not depend on the missing answer. Do not claim a connection was tested just because its config exists.

Expo changes between SDK releases: check `apps/mobile/package.json` for the SDK (58) and use its versioned docs (`https://docs.expo.dev/versions/v58.0.0/`, index at `https://docs.expo.dev/llms.txt`) rather than memory.

Project-scoped MCP files for Codex, Claude Code, Cursor, and VS Code are included. See `docs/ai-workflow.md`. Never put credentials into prompts or committed MCP files.

## Code map and boundaries

```text
apps/api        Express 5 API: Better Auth (+ Expo plugin), Drizzle/PostgreSQL, routes → services
apps/mobile     Expo SDK 58 app (Expo Go): Expo Router, NativeWind + Reusables, TanStack Query hooks
packages/shared validators (zod), permissions (RBAC), API DTO types, site identity + app scheme
```

**API (`apps/api/src`)**

- `app.ts` builds the Express app (middleware order matters — read the comments); `server.ts` listens and shuts down gracefully. `pnpm dev` restarts the API on every change (`tsx watch`, including `packages/shared` and `.env.local`).
- `routes/*.routes.ts`: thin HTTP handlers. Mount `requireAuth` then `requireTrustedOrigin` on each router; add `requirePermission(...)` for cross-account endpoints; use `jsonBody` on POST/PATCH. Register routers in `routes/index.ts`.
- `services/*.service.ts`: all application logic and Drizzle queries. Receive the verified user ID as an argument; filter ownership in SQL. Name cross-account functions with an `Any` suffix and call them only behind `requirePermission`.
- `db/schema/<table>.ts` (export from `db/schema/index.ts`), `drizzle/` (committed migrations), `db/index.ts` (shared pool).
- `lib/auth.ts` (Better Auth server with the `expo()` and admin plugins), `lib/logger.ts` (pino), `lib/request-context.ts` (AsyncLocalStorage reqId/userId), `middleware/` (auth, origin, body, errors).
- Express 5 forwards rejected promises to the error handler: throw `HttpError` or let Zod throw; never `res.status(500)` by hand.

**Mobile (`apps/mobile`)** — see `docs/mobile.md`

- `src/app/`: Expo Router screens. `_layout.tsx` holds the providers and the `Stack.Protected` guards: signed-in screens, a nested role guard for `admin`, and sign-in/up for signed-out users. Register every new screen there. Keep non-screen code outside `src/app/`.
- `src/lib/auth-client.ts`: Better Auth client with `expoClient` (SecureStore, `expo-origin`) and `adminClient`. `src/lib/api/client.ts`: `apiFetch` + `ApiError`, sending the stored cookie and `expo-origin` with `credentials: "omit"`. `src/lib/api-url.ts`: `EXPO_PUBLIC_API_URL`, or Metro's host + the API port in development.
- `src/features/<feature>/api.ts` (one function per endpoint) → `queries.ts` (query keys + options) → `hooks.ts` (`useX`, `useCreateX`, …). Screens and components use hooks only.
- `src/components/ui`: owned React Native Reusables primitives (`npx @react-native-reusables/cli@latest add <component>` from `apps/mobile`), styled with NativeWind `className`; theme tokens in `src/global.css`, mirrored for navigation in `src/lib/theme.ts`.
- Install native libraries with `npx expo install <package>` from `apps/mobile`. The app runs in Expo Go, so prefer libraries Expo Go bundles; anything else needs a development build, which is the user's decision. Never commit generated `ios/` or `android/` folders.
- Under pnpm's isolated installs, a package the app's compiled code imports must be a direct dependency of `apps/mobile` (e.g. `react-native-css-interop` for NativeWind).

**Shared (`packages/shared/src`)**: `validators/` (strict zod input schemas, used by API handlers and typed by app forms), `permissions.ts` (statement, roles, `roleHasPermission`), `types/api.ts` (response DTOs with ISO-string dates), `site.ts` (identity and the app's deep-link `scheme` from `starter.config.json`). Keep it free of Node-only or platform-specific code: both Node and React Native load it.

## Security rules

Authenticate at every API boundary: `requireAuth` answers JSON 401. A screen guard in the app is presentation, not authorization. Filter every user-owned read/update/delete by the verified session's user ID; never trust a submitted owner ID. Validate bodies, IDs, and pagination with strict shared schemas before services run.

The app stores the Better Auth session cookie in SecureStore and sends it in a `Cookie` header itself. Native requests carry no `Origin`, so the app sends `expo-origin: <scheme>://`. The API trusts exactly `env.trustedOrigins`: the app's scheme, `exp://` (Expo Go) in development only, and the optional browser `TRUSTED_ORIGINS`. Every cookie-authenticated mutation, including DELETE, must pass `requireTrustedOrigin`, which uses Better Auth's `isTrustedOrigin` so both checks match. A browser's real `Origin` always wins over an `expo-origin` it adds. Keep the `scheme` stable once the app is installed on devices. The session cookie's prefix is `starter.config.json` `id`; the app's `expoClient` must use the same `cookiePrefix`.

Authorize separately from authentication when a feature reaches past the caller's own rows. Declare the resource and actions in `packages/shared/src/permissions.ts`, guard the API route with `requirePermission`, and hide the screen with `roleHasPermission(session.user.role, …)`. Roles come from `user.role`, which signup cannot set; use `pnpm role:set <email> <role>`. Hiding UI is never the access check.

Keep secrets server-side; anything bundled into the app is public, including `EXPO_PUBLIC_*` values. Validate new API settings in `apps/api/src/config/env.ts`. Never log cookies, passwords, tokens, or connection strings — the pino logger redacts the common fields; do not log request bodies. Encode IDs placed in API paths with `encodeURIComponent`.

Request bodies are capped at 100 kB, including Better Auth's (`limitAuthBody`). Better Auth rate limits are on outside the API tests; `TRUST_PROXY=true` is refused. Before production, walk through the security checklist in `docs/deployment.md`.

## Adding a resource end to end

Follow the Notes example (`docs/backend.md`):

1. Table: `apps/api/src/db/schema/<table>.ts`, export from `index.ts`, `pnpm db:generate`, inspect the SQL, `pnpm db:migrate`. Commit SQL and `drizzle/meta` together. Never rewrite applied migrations or reset to fix errors.
2. Contract: strict zod schemas in `packages/shared/src/validators/<resource>.ts` and DTO types in `packages/shared/src/types/api.ts`; add the subpath to `packages/shared/package.json` `exports`.
3. API: `services/<resource>.service.ts`, `routes/<resource>.routes.ts`, register in `routes/index.ts`; tests in `apps/api/src/test/`.
4. Mobile: `features/<resource>/{api,queries,hooks}.ts`, components, and a screen in `src/app/` registered in `_layout.tsx` (`docs/mobile.md`); a Maestro flow in `apps/mobile/.maestro/` for the main path.

Use PostgreSQL `pgTable`/boolean/timestamp-with-time-zone columns and asynchronous queries. Never substitute SQLite syntax or disable TLS verification.

## Verify and hand off

Run `pnpm check` (lint, typecheck, API + app + root tests on disposable PostgreSQL) and `pnpm build` (API bundle and the app's iOS/Android JavaScript bundles) for substantive changes. For auth, session, navigation, or origin changes also run `pnpm test:e2e` (Maestro flows in Expo Go on a booted simulator or emulator; needs Maestro and Java 17+). For setup or Compose changes run `pnpm test:setup`. Add tests for real behavior and data isolation. Check screens on a device or simulator in light and dark mode. Once the app has a real first screen, the starter placeholder (`testID="starter-placeholder"` in `apps/mobile/src/app/index.tsx`) and `apps/mobile/.maestro/starter.yaml` must be gone; `pnpm run doctor` reminds you while they remain.

Report the result, how to use it, checks run, and any remaining limitation. Keep dashboard-specific, chatbot-specific, billing, and provider-specific features in derivatives unless the user asks to add them to this base. Do not deploy, submit to app stores, create EAS projects, purchase services, or choose an AI provider just because this is an AI-friendly starter.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
