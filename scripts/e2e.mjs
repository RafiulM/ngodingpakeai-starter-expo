import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { Pool } from "pg";
import { pnpmCommand, root } from "./lib.mjs";

// Mobile end-to-end tests: the API and Metro on their own test ports, the app
// in Expo Go on a booted iOS simulator or Android emulator, and the Maestro
// flows in apps/mobile/.maestro. scripts/test.mjs supplies the disposable
// PostgreSQL server; the development database and servers are never used.

export const TEST_METRO_PORT = 8181;

function maestroCommand() {
  for (const command of [
    "maestro",
    resolve(homedir(), ".maestro/bin/maestro"),
  ]) {
    const result = spawnSync(command, ["--version"], {
      stdio: "ignore",
      timeout: 60000,
    });
    if (!result.error && result.status === 0) return command;
  }
  throw new Error(
    "Maestro is required: install it from https://docs.maestro.dev and make sure a Java 17+ runtime is available (JAVA_HOME).",
  );
}

function hasExpoGo(check) {
  return spawnSync(check[0], check.slice(1), { stdio: "ignore" }).status === 0;
}

// A booted iOS simulator (reaches this computer at 127.0.0.1) or a running
// Android emulator (reaches it at 10.0.2.2), with Expo Go installed.
function bootedDevice() {
  const ios = spawnSync(
    "xcrun",
    ["simctl", "list", "devices", "booted", "--json"],
    { encoding: "utf8" },
  );
  const simulator =
    ios.status === 0
      ? Object.values(JSON.parse(ios.stdout).devices).flat()[0]
      : undefined;
  if (simulator) {
    if (
      !hasExpoGo([
        "xcrun",
        "simctl",
        "get_app_container",
        simulator.udid,
        "host.exp.Exponent",
      ])
    )
      throw new Error(
        `Expo Go is not installed on ${simulator.name}. Run pnpm dev:mobile and press i once to install it, then retry.`,
      );
    return { id: simulator.udid, host: "127.0.0.1" };
  }

  const adb = spawnSync("adb", ["devices"], { encoding: "utf8" });
  const serial =
    adb.status === 0
      ? adb.stdout
          .split("\n")
          .slice(1)
          .map((line) => line.trim().split(/\s+/))
          .find(([, state]) => state === "device")?.[0]
      : undefined;
  if (serial) {
    if (
      !hasExpoGo([
        "adb",
        "-s",
        serial,
        "shell",
        "pm",
        "path",
        "host.exp.exponent",
      ])
    )
      throw new Error(
        "Expo Go is not installed on the Android emulator. Run pnpm dev:mobile and press a once to install it, then retry.",
      );
    return { id: serial, host: "10.0.2.2" };
  }

  throw new Error(
    "Boot an iOS simulator (Xcode) or an Android emulator (Android Studio) first.",
  );
}

// Checks everything that needs no server, so a missing tool fails fast.
export function prepareMobileE2e() {
  return { maestro: maestroCommand(), device: bootedDevice() };
}

function background(args, env) {
  // Its own process group, so stopping it also stops pnpm's children.
  return spawn(pnpmCommand(), args, {
    cwd: root,
    env,
    stdio: ["ignore", "inherit", "inherit"],
    detached: process.platform !== "win32",
    shell: process.platform === "win32",
  });
}

function stopAll(children) {
  for (const child of children) {
    if (child.exitCode !== null) continue;
    try {
      if (process.platform === "win32") child.kill();
      else process.kill(-child.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
  }
}

async function waitFor(url, label, accept = (response) => response.ok) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    try {
      if (await accept(await fetch(url))) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((done) => setTimeout(done, 1000));
  }
  throw new Error(`${label} did not start on ${new URL(url).origin}.`);
}

// An admin account and another account's note for .maestro/admin.yaml. Roles
// are granted out of band, the way pnpm role:set does it.
async function seedAdmin(apiUrl, databaseUrl) {
  const { scheme } = JSON.parse(
    readFileSync(resolve(root, "starter.config.json"), "utf8"),
  );
  const headers = {
    "content-type": "application/json",
    "expo-origin": `${scheme}://`,
  };
  const password = randomBytes(12).toString("hex");
  async function signUp(name) {
    const email = `e2e-${randomBytes(6).toString("hex")}@example.com`;
    const response = await fetch(`${apiUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name, email, password }),
    });
    if (!response.ok)
      throw new Error(`Seeding a test account failed (${response.status}).`);
    const cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    return { email, cookie };
  }

  const owner = await signUp("Note Owner");
  const note = await fetch(`${apiUrl}/api/notes`, {
    method: "POST",
    headers: { ...headers, cookie: owner.cookie },
    body: JSON.stringify({ title: "Owned by someone else" }),
  });
  if (!note.ok) throw new Error(`Seeding a test note failed (${note.status}).`);

  const admin = await signUp("Admin Tester");
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    await pool.query('UPDATE "user" SET role = $1 WHERE email = $2', [
      "admin",
      admin.email,
    ]);
  } finally {
    await pool.end();
  }
  return { ADMIN_EMAIL: admin.email, ADMIN_PASSWORD: password };
}

export async function runMobileE2e({ maestro, device }, testEnv, run) {
  const apiUrl = testEnv.BETTER_AUTH_URL;
  const children = [];
  try {
    // Development mode, so the API trusts Expo Go's exp:// origin.
    children.push(
      background(["--filter", "@starter/api", "exec", "tsx", "src/server.ts"], {
        ...testEnv,
        NODE_ENV: "development",
        LOG_LEVEL: testEnv.LOG_LEVEL ?? "warn",
      }),
    );
    await waitFor(`${apiUrl}/api/health`, "The test API");
    const admin = await seedAdmin(apiUrl, testEnv.DATABASE_URL);

    // EXPO_PUBLIC_E2E: see src/components/auth-form.tsx.
    children.push(
      background(
        [
          "--filter",
          "@starter/mobile",
          "exec",
          "expo",
          "start",
          "--port",
          String(TEST_METRO_PORT),
        ],
        { ...testEnv, CI: "1", EXPO_PUBLIC_E2E: "1" },
      ),
    );
    await waitFor(
      `http://localhost:${TEST_METRO_PORT}/status`,
      "Metro",
      async (response) =>
        (await response.text()).includes("packager-status:running"),
    );

    const flows = resolve(root, "apps/mobile/.maestro");
    if (!existsSync(flows)) throw new Error("apps/mobile/.maestro is missing.");
    await run(maestro, [
      "--device",
      device.id,
      "test",
      flows,
      "-e",
      `EXPO_URL=exp://${device.host}:${TEST_METRO_PORT}`,
      "-e",
      `ADMIN_EMAIL=${admin.ADMIN_EMAIL}`,
      "-e",
      `ADMIN_PASSWORD=${admin.ADMIN_PASSWORD}`,
    ]);
  } finally {
    stopAll(children);
  }
}
