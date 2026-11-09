# Mobile standard (Expo app)

The app has no database or auth server of its own. It renders screens, talks to the Express API, and keeps API data in TanStack Query. The Notes screen is the reference.

```text
screen / component
  → custom hook            features/notes/hooks.ts      useNotes, useCreateNote, …
  → query options / keys   features/notes/queries.ts    notesKeys, notesListQuery
  → endpoint function      features/notes/api.ts        listNotes, createNote, …
  → apiFetch               lib/api/client.ts            API URL, stored cookie, expo-origin, ApiError
  → Express API
```

## Stack

Expo SDK 58 (React Native 0.88, React 19, React Compiler on), Expo Router with screens in `src/app/`, NativeWind 4 (Tailwind CSS 3) with React Native Reusables components in `src/components/ui/`, Lucide icons through `Icon`, TanStack Query 5, and Better Auth's Expo client. The app runs in **Expo Go**: no Xcode or Android Studio project is committed (`ios/` and `android/` are generated when needed and ignored). It targets iOS and Android only.

Install native libraries with `npx expo install <package>` from `apps/mobile`, which picks the version that matches the SDK. A library with native code that Expo Go does not bundle needs a development build (`npx expo install expo-dev-client`, then `npx expo run:ios` or an EAS development build). Check Expo's versioned docs for SDK 58 before using an API: Expo changes between SDK releases.

## Where the app finds the API

`src/lib/api-url.ts` resolves `API_URL`:

- `EXPO_PUBLIC_API_URL` wins. Release builds must set it to the API's HTTPS origin (`eas.json`). It is inlined into the bundle, so it is public.
- In development, the API runs on the computer that serves the bundle, so the app reuses the host it loaded Metro from (your LAN IP on a phone, `localhost`/`127.0.0.1` on the iOS simulator, the LAN IP or `10.0.2.2` on the Android emulator) with the API's port. `app.config.ts` reads that port from `BETTER_AUTH_URL` (shell, then the root `.env.local` / `.env`) and exposes only the port.

## Authentication

- **Client** — `lib/auth-client.ts` creates the Better Auth client with `expoClient` and `adminClient`. `expoClient` stores the session cookie in SecureStore (`storagePrefix`) and sends `expo-origin` on auth requests. Its `cookiePrefix` must equal the API's `advanced.cookiePrefix` — both are `starter.config.json` `id` — or the session is never stored.
- **Guards** — `src/app/_layout.tsx` reads `authClient.useSession()` and wraps screens in `Stack.Protected`: signed-in screens redirect to `/sign-in`, sign-in/up redirect to `/` once signed in, and `admin` sits in a nested guard on `roleHasPermission`. The splash screen stays up until the stored session has been read.
- **Forms** — `components/auth-form.tsx` calls `authClient.signIn.email` / `signUp.email`. On success the session updates and the guards move the user; the form does not navigate.
- **Account changes** — the root layout clears the query cache whenever the signed-in user changes, including sign-out, so one account never sees another's cached data. A 401 from the API re-reads the session (`refreshSession`), which sends a signed-out user to sign-in.
- **Roles in the UI** — `roleHasPermission(session.user.role, { notes: ["read-any"] })` from `@starter/shared/permissions` hides buttons and guards screens. The API re-checks every request; never treat a UI check as authorization.

## Calling the API

`apiFetch<T>(path, { method, query, body, signal })`:

- reads the stored cookie with `authClient.getCookie()` and sends it in a `Cookie` header with `credentials: "omit"`, so the native cookie jar never adds a second, stale copy;
- sends `expo-origin` (`<scheme>://`, or `exp://…` inside Expo Go) — the API's `requireTrustedOrigin` checks it on every mutation, because native requests carry no `Origin`;
- throws `ApiError(status, code, message, details)` built from the API's error envelope, or `ApiError(0, "NETWORK_ERROR", …)` when the server is unreachable; 204 resolves to `undefined`. `errorMessage()` turns either into readable text.

## Query options, keys, and hooks

```ts
export const notesKeys = {
  all: ["notes"] as const,
  lists: () => [...notesKeys.all, "list"] as const,
  details: () => [...notesKeys.all, "detail"] as const,
  detail: (id: string) => [...notesKeys.details(), id] as const,
};

export function notesListQuery() {
  return infiniteQueryOptions({
    queryKey: notesKeys.lists(),
    queryFn: ({ pageParam, signal }) =>
      listNotes({ limit: NOTES_PAGE_SIZE, offset: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: ({ meta }) =>
      meta.hasMore ? meta.offset + meta.limit : undefined,
  });
}
```

Components never call `apiFetch` or `useQuery` directly; they use the feature's hooks, which own cache updates. Lists load a page at a time as the user scrolls (`useInfiniteQuery` + `FlatList` `onEndReached`) and refresh on pull. `useDeleteNote` is optimistic: the note disappears from every cached page immediately and comes back if the API refuses.

`lib/query-client.ts` wires TanStack Query to React Native: stale queries refetch when the app returns to the foreground (`AppState`) and pause while offline (`expo-network`). Queries are fresh for 30 seconds; 4xx `ApiError`s are not retried. Screens show loading, error (with retry), and empty states through `components/list-state.tsx`.

## Screens and UI

- Screens live in `src/app/` (Expo Router). Register a new screen in the root `_layout.tsx` inside the right `Stack.Protected` group. Keep components, hooks, and helpers outside `src/app/`.
- Style with `className` (NativeWind). Theme tokens are CSS variables in `src/global.css`; `src/lib/theme.ts` mirrors them for navigation chrome — keep both in sync. Dark mode follows the system.
- Add components from `apps/mobile` with `npx @react-native-reusables/cli@latest add <component>`; they are copied into `src/components/ui/` and owned by this project. `Button` children are `Text`; icons use `<Icon as={Lucide} />`.
- Give inputs a `Label` with `nativeID` and `aria-labelledby`, and give icon-only buttons an `aria-label`. Add a `testID` where a Maestro flow needs to find an element.
- Respect the keyboard: forms use `KeyboardAvoidingView` or a list with `automaticallyAdjustKeyboardInsets` and `keyboardShouldPersistTaps="handled"`.

## Add a feature's screen

1. `features/<resource>/api.ts`: one typed function per endpoint using `@starter/shared` types. Encode values placed in a path (`` `/api/notes/${encodeURIComponent(id)}` ``).
2. `features/<resource>/queries.ts`: keys and `queryOptions` / `infiniteQueryOptions`.
3. `features/<resource>/hooks.ts`: `useX`, mutations with cache updates.
4. Components under `features/<resource>/components/`, reusing `components/ui`.
5. A screen in `src/app/`, registered in `_layout.tsx` under the signed-in guard (and a role guard for cross-account screens).
6. Unit tests in `src/test/` for logic worth pinning, and a Maestro flow in `.maestro/` for the main path.

## Tests

- `pnpm test` runs the app's jest suite (jest-expo + React Native Testing Library) with the API tests. Tests live in `apps/mobile/src/test/` and import `describe`/`expect`/`jest` from `@jest/globals`. RNTL 14's `render` is async: `await render(...)`.
- `pnpm test:e2e` runs the Maestro flows in `apps/mobile/.maestro/` in Expo Go on a booted iOS simulator or Android emulator. It creates a disposable PostgreSQL server, starts a test API on port 4101 (development mode, so Expo Go's origin is trusted) and Metro on port 8181, seeds an admin account, and stops everything afterwards. It needs [Maestro](https://docs.maestro.dev), a Java 17+ runtime (`JAVA_HOME`), and Expo Go on the device (run `pnpm dev:mobile` and press `i` or `a` once to install it).
- Test runs set `EXPO_PUBLIC_E2E=1`: the password field becomes a plain field there, because iOS answers secure fields with strong-password and save-password sheets that Maestro cannot dismiss. Every other build keeps the secure field and its autofill hints.
- To run one flow by hand against `pnpm dev`: `maestro test apps/mobile/.maestro/notes.yaml -e EXPO_URL=exp://127.0.0.1:8081` (use your LAN IP for a phone, `10.0.2.2` for the Android emulator). `admin.yaml` also needs `-e ADMIN_EMAIL=… -e ADMIN_PASSWORD=…` for an account with the admin role.
- `pnpm build` bundles the JavaScript for iOS and Android (`expo export`) to catch bundling errors. Store builds use EAS (see [deployment](deployment.md)).
