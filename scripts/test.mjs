import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { prepareMobileE2e, runMobileE2e } from "./e2e.mjs";
import { pnpmCommand, root } from "./lib.mjs";

// Runs tests against a disposable PostgreSQL server that exists only for this
// run. The development database is never touched.
//   pnpm test      → API integration tests (vitest), mobile unit tests (jest),
//                    and the root node:test suites
//   pnpm test:e2e  → Maestro flows in Expo Go against a test API (scripts/e2e.mjs)
const mode = process.argv[2] ?? "unit";
if (!["unit", "e2e"].includes(mode))
  throw new Error("Use pnpm test or pnpm test:e2e.");
// Needs no server: fail before Docker starts if a device or tool is missing.
const e2e = mode === "e2e" ? prepareMobileE2e() : undefined;

// Fixed local origins for the test run, distinct from development. The browser
// origin exercises TRUSTED_ORIGINS (CORS) next to the app's own scheme.
export const TEST_API_URL = "http://localhost:4101";
export const TEST_BROWSER_URL = "http://localhost:3101";

const project = `starter-pg-test-${randomBytes(8).toString("hex")}`;
const password = randomBytes(24).toString("hex");
const dockerArgs = ["compose", "-p", project, "-f", "compose.test.yaml"];
const env = { ...process.env, STARTER_TEST_PASSWORD: password };
// Settings for real deployments must not leak into a test run.
delete env.TRUSTED_ORIGINS;
let active;
let interrupted = false;
function interrupt() {
  interrupted = true;
  active?.kill("SIGTERM");
}
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);

async function run(command, args, childEnv = env, capture = false) {
  if (interrupted) throw new Error("Tests interrupted.");
  return new Promise((accept, reject) => {
    let output = "";
    active = spawn(command, args, {
      cwd: root,
      env: childEnv,
      stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit",
      shell: process.platform === "win32" && command === pnpmCommand(),
    });
    if (capture)
      active.stdout.on("data", (chunk) => {
        output += chunk;
      });
    active.once("error", reject);
    active.once("close", (code) => {
      active = undefined;
      if (code === 0 && !interrupted) accept(output);
      else
        reject(
          new Error(`${command} exited with status ${code ?? "interrupted"}.`),
        );
    });
  });
}

try {
  console.log(
    "Starting an isolated PostgreSQL test server. The app database is not used.",
  );
  await run("docker", [
    ...dockerArgs,
    "up",
    "-d",
    "--wait",
    "--wait-timeout",
    "60",
    "postgres",
  ]);
  const address = await run(
    "docker",
    [...dockerArgs, "port", "postgres", "5432"],
    env,
    true,
  );
  const port = address.trim().match(/^127\.0\.0\.1:(\d+)$/)?.[1];
  if (!port)
    throw new Error("Could not determine the isolated PostgreSQL port.");
  const url = `postgresql://starter_test:${password}@127.0.0.1:${port}/starter_test`;
  const testEnv = {
    ...env,
    DATABASE_URL: url,
    MIGRATION_DATABASE_URL: url,
    STARTER_TEST_DATABASE_URL: url,
    STARTER_TEST_RUN: project,
    BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
    BETTER_AUTH_URL: TEST_API_URL,
    TRUSTED_ORIGINS: TEST_BROWSER_URL,
  };
  await run(pnpmCommand(), ["run", "db:migrate"], testEnv);
  if (e2e) {
    await runMobileE2e(e2e, testEnv, (command, args) =>
      run(command, args, testEnv),
    );
  } else {
    await run(
      pnpmCommand(),
      ["--filter", "@starter/api", "run", "test"],
      testEnv,
    );
    await run(
      pnpmCommand(),
      ["--filter", "@starter/mobile", "run", "test"],
      testEnv,
    );
    const files = readdirSync(resolve(root, "tests"))
      .filter((file) => file.endsWith(".test.mjs"))
      .map((file) => `tests/${file}`);
    await run(process.execPath, ["--test", ...files], testEnv);
  }
} catch (error) {
  console.error(
    `Tests stopped: ${error.message} Start Docker Desktop if needed.`,
  );
  process.exitCode = interrupted ? 130 : 1;
} finally {
  // This generated project owns only this run's disposable test server.
  const result = spawnSync(
    "docker",
    [...dockerArgs, "down", "--volumes", "--remove-orphans"],
    { cwd: root, env, stdio: "inherit" },
  );
  if (result.error || result.status !== 0) {
    console.error(
      `Test cleanup failed. Remove the disposable Docker Compose project ${project} after checking Docker.`,
    );
    process.exitCode = 1;
  }
}
