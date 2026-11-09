# Hosting the API

Deploy the API as one Node.js service connected to a persistent PostgreSQL service. It keeps no data on its filesystem. The mobile app is built and distributed separately (app stores or internal builds) and calls the API's public HTTPS origin.

See [Building the app](#building-the-app) for the mobile side.

## Origins

Release builds of the app send `expo-origin: <scheme>://`, using the `scheme` in `starter.config.json`. The API trusts that scheme in every environment and `exp://` (Expo Go) only when `NODE_ENV=development`. Keep the scheme stable once the app is installed on devices: changing it breaks sign-in for older builds.

`TRUSTED_ORIGINS` is only for browser clients (an Expo web build, an admin site). Leave it unset for a native-only app. A browser origin must be on the same site as the API (e.g. `app.example.com` and `api.example.com`): cross-site requests are refused.

## Production environment

Private values go through your host:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://user:password@database-host:5432/app
BETTER_AUTH_SECRET=your-random-secret-at-least-32-characters
BETTER_AUTH_URL=https://api.example.com
# Behind a load balancer or reverse proxy (hop count, or a subnet list; never true):
TRUST_PROXY=1
# Optional: browser origins allowed to call the API with cookies.
# TRUSTED_ORIGINS=https://app.example.com
# Optional direct connection when DATABASE_URL uses a pooler:
# MIGRATION_DATABASE_URL=postgresql://user:password@direct-host:5432/app
```

`NODE_ENV=production` switches the API to JSON logs and removes the Expo Go origin. The Docker image sets it; set it yourself everywhere else. Use HTTPS for `BETTER_AUTH_URL`: release builds of iOS and Android refuse plain HTTP by default, and Better Auth marks cookies `Secure` on HTTPS.

`TRUST_PROXY` matters: the API resolves the client IP from it and hands that IP to Better Auth for per-IP rate limits on sign-in/sign-up. Set the number of proxies in front of the API (usually `1`) or their subnets. The API refuses `true`, which would trust any `X-Forwarded-For` a client sends and let it choose the IP its attempts are counted under. Without a proxy, leave it unset (the socket address is used and client-supplied `X-Forwarded-For` is ignored).

Keep provider-required TLS settings. Do not disable certificate verification. The example credentials are placeholders, not defaults.

## Release steps without Docker

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm build
NODE_ENV=production node apps/api/dist/server.js
```

Apply migrations once per release. The API honors `PORT` and `HOST`. Its bundle (`apps/api/dist`) includes its dependencies; it needs only `dist/` (and `drizzle/` for migrations).

## Docker images

Build from the repository root. The Dockerfile prunes the workspace with `turbo prune`, installs from the pruned lockfile, builds, and ships only the output:

```sh
docker build -f apps/api/Dockerfile -t my-api .
docker build -f apps/api/Dockerfile --target migrator -t my-api-migrate .
```

```sh
docker run --rm -e DATABASE_URL="$DATABASE_URL" my-api-migrate

docker run -d -p 4000:4000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  -e BETTER_AUTH_URL=https://api.example.com \
  -e TRUST_PROXY=1 \
  my-api
```

The build needs no secrets. Pass real values to running containers; never put secrets in `--build-arg`, `ENV`, or the image.

The image runs as the unprivileged `node` user. Its `HEALTHCHECK` reports liveness only (`/api/health`), so a database outage does not restart a healthy process. `GET /api/health/ready` additionally checks PostgreSQL for platforms that want a readiness probe. The API shuts down gracefully on SIGTERM.

## Logs in production

The API writes one JSON object per line to stdout with `level`, `time`, `service` (`api`), `env`, `msg`, and `reqId` (plus `userId` on authenticated requests). Ship stdout to your log platform. Forward an `X-Request-Id` from your load balancer and the API reuses it. `LOG_LEVEL` adjusts verbosity; `LOG_SQL=true` is for debugging only.

## Connection pooling and scaling

The API uses one node-postgres pool with at most ten connections per process. Multiple instances multiply the connection count: use your provider's pooler and tune limits. Better Auth's rate-limit storage is in memory per instance; for several API instances configure shared rate-limit storage (see Better Auth's rate-limit docs).

## Security checklist

Built in: authenticated and origin-checked API routes, ownership filtered in SQL, sign-in/sign-up rate limits, 100 kB request bodies (including Better Auth's), `httpOnly` `SameSite=Lax` session cookies stored by the app in SecureStore, and helmet. Before launch, confirm:

- [ ] `BETTER_AUTH_URL` is HTTPS and `NODE_ENV=production` is set (no Expo Go origin in production).
- [ ] `TRUST_PROXY` matches your proxy hops, so rate limits see real client IPs.
- [ ] `TRUSTED_ORIGINS` lists only browser origins you control, or is unset.
- [ ] Several API instances share rate-limit storage (see [scaling](#connection-pooling-and-scaling)).
- [ ] Your proxy or load balancer also caps request bodies and slow uploads.
- [ ] `admin` is granted only to people trusted with every account: it can impersonate users, set their passwords and emails, delete them, and grant roles. Give moderators a narrower role ([roles](backend.md#role-based-access)).
- [ ] Features that create many rows or call paid services have per-user limits.
- [ ] You decided on email verification and password recovery; neither is configured.

## Building the app

Store and internal builds use [EAS](https://docs.expo.dev/build/introduction/) and need an Expo account; nothing here creates one or submits anything for you.

1. Deploy the API first and note its HTTPS origin.
2. Set `EXPO_PUBLIC_API_URL` to that origin in `apps/mobile/eas.json` (both profiles), or as an EAS environment variable. It is inlined into the bundle and public. A release build without it fails at launch (the error is in the device logs).
3. Set store identifiers: change the `com.ngodingpakeai` prefix in `apps/mobile/app.config.ts` to a reverse domain you own. Keep `scheme` (in `starter.config.json`) stable from the first release on.
4. From `apps/mobile`: `npx eas-cli@latest init` once, then `npx eas-cli@latest build --profile preview` for an installable internal build, or `--profile production` for the stores; `npx eas-cli@latest submit` uploads a production build.

Release builds trust only `<scheme>://` on the API (no Expo Go). Adding a library that Expo Go does not bundle means using development builds (`expo-dev-client`) from then on; see [mobile](mobile.md).

## Local Docker versus hosted data

`compose.dev.yaml` is a local convenience. It publishes PostgreSQL on loopback only and stores data in a named volume. Use PostgreSQL backups or your provider's backup service and test restoration; Docker volumes are persistence, not backups.

Account emails are not verified by the base. Add an email provider for verification and password recovery when needed.

References: [Better Auth Express integration](https://better-auth.com/docs/integrations/express), [Better Auth Expo integration](https://better-auth.com/docs/integrations/expo), [Turborepo Docker guide](https://turborepo.com/docs/guides/tools/docker), [node-postgres pooling](https://node-postgres.com/features/pooling).
