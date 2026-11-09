---
name: build-feature
description: Build or change a feature in this Express + Expo monorepo, including authenticated Express routes, services, shared validators, PostgreSQL data, and the mobile app's screens and data hooks, while reusing the existing authentication.
---

Read `AGENTS.md`, `docs/architecture.md`, `docs/backend.md`, `docs/mobile.md`, and the relevant feature files. On a fresh project, follow the starter-setup skill first, then continue the feature without requiring a separate setup prompt. Infer routine implementation details; clarify product ambiguity only when it changes the outcome. Deliver a usable slice with real behavior and readable beginner-facing explanations.

Consult Context7 as described in `AGENTS.md` before relying on library APIs; for Expo, use the SDK 58 docs. Inspect installed versions instead of adding a second framework, ORM, auth library, data-fetching library, navigation library, styling system, or component kit. Add native libraries with `npx expo install` from `apps/mobile`, and prefer ones Expo Go bundles: anything else needs a development build, which the user must agree to.

Work in this order, mirroring Notes:

1. **Schema** — `apps/api/src/db/schema/<table>.ts`, exported from `index.ts`, importing foreign-key tables from sibling files. Keep Better Auth's core tables intact. `pnpm db:generate`, inspect the SQL, `pnpm db:migrate`.
2. **Contract** — strict zod input schemas in `packages/shared/src/validators/<resource>.ts` (reject unknown and owner fields; PATCH requires an editable field) and response DTOs in `packages/shared/src/types/api.ts`. Add the subpath export in `packages/shared/package.json`.
3. **Service** — `apps/api/src/services/<resource>.service.ts` holds every query and rule. Take the verified user ID as a separate argument; filter owned reads/updates/deletes in SQL; assign ownership from that argument on create. Services never read requests, cookies, or build responses.
4. **Routes** — `apps/api/src/routes/<resource>.routes.ts`: `router.use(requireAuth, requireTrustedOrigin)`, `jsonBody` on POST/PATCH, parse params/query/body with the shared schemas, call one service, choose the status (201 + Location, 204 for deletes, identical 404 for absent and unowned rows). Cross-account endpoints add `requirePermission(...)` after declaring the actions in `packages/shared/src/permissions.ts`. Register the router in `routes/index.ts`.
5. **App data** — `apps/mobile/src/features/<resource>/api.ts` (typed `apiFetch` calls), `queries.ts` (hierarchical keys + `queryOptions` / `infiniteQueryOptions`), `hooks.ts` (`useX`, mutations that update/invalidate the cache; optimistic updates where it helps).
6. **Screen** — in `apps/mobile/src/app/`, registered in the root `_layout.tsx` inside the signed-in `Stack.Protected` group (and a `roleHasPermission` guard for cross-account screens). Screens use the hooks only and show loading, error, and empty states (`components/list-state.tsx`). Read `docs/mobile.md` first.

Security details that recur in new features:

- Encode values placed in API paths: `` `/api/<resource>/${encodeURIComponent(id)}` ``.
- A new setting is validated in `apps/api/src/config/env.ts` (messages name the field, never the value) and listed in `.env.example`. Everything bundled into the mobile app is public, including `EXPO_PUBLIC_*` values; never put a secret there.
- Endpoints that create rows in bulk, send messages, or call paid or external services need a per-user limit or quota.
- Server code that fetches a URL derived from input must allow-list its hosts and never forward the user's cookie to it.

Definition of done for the first feature: the signed-in home screen no longer carries the starter's blank canvas. Replace the `testID="starter-placeholder"` section in `apps/mobile/src/app/index.tsx` (and `CopyPrompt` if nothing else needs it), delete `apps/mobile/.maestro/starter.yaml`, and confirm `pnpm run doctor` prints no placeholder reminder. Keep or remove the Notes example deliberately; do not silently delete saved records.

Reuse `apps/mobile/src/components/ui`, `cn()`, and the theme tokens in `src/global.css`. Label inputs (`Label nativeID` + `aria-labelledby`), give icon-only buttons an `aria-label`, keep touch targets comfortable, and handle the keyboard. Check screens in light and dark mode and on a small phone.

Validate actual behavior: add API tests in `apps/api/src/test/` like `notes.test.ts` (anonymous 401, CRUD persistence, invalid input, cross-account isolation, origin checks with `expo-origin`), app unit tests in `apps/mobile/src/test/` where logic deserves them, and a Maestro flow in `apps/mobile/.maestro/` for the main path. `pnpm test` runs the API and app suites against disposable PostgreSQL; `pnpm test:e2e` runs the Maestro flows on a booted simulator or emulator. Run the applicable checks in `AGENTS.md`, update relevant docs, and explain what the user can now do. Do not describe simulated interactions as working functionality.
