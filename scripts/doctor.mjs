import { existsSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { Pool } from "pg";
import {
  assertNode,
  assertPnpm,
  DEFAULT_API_URL,
  loadEnvironment,
  root,
} from "./lib.mjs";
import { databaseUrl, databaseError } from "./postgres.mjs";

let failures = 0;
async function check(label, fn) {
  try {
    await fn();
    console.log(`✓ ${label}`);
  } catch (error) {
    failures++;
    console.error(`✗ ${label}: ${error.message}`);
  }
}

function origin(name, fallback) {
  const url = new URL(process.env[name] || fallback);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error(`${name} must be an origin such as ${fallback}.`);
  return url;
}

await loadEnvironment();
await check("Node.js", assertNode);
await check("pnpm", assertPnpm);
await check("Auth secret", () => {
  if ((process.env.BETTER_AUTH_SECRET?.length ?? 0) < 32)
    throw new Error(
      "Run pnpm run setup or set BETTER_AUTH_SECRET to 32+ characters.",
    );
});
await check("API origin", () => origin("BETTER_AUTH_URL", DEFAULT_API_URL));
await check("Mobile app scheme", () => {
  // The API trusts `${scheme}://` as the app's origin; see starter.config.json.
  const { scheme } = JSON.parse(
    readFileSync(resolve(root, "starter.config.json"), "utf8"),
  );
  if (
    typeof scheme !== "string" ||
    !/^[a-z][a-z0-9+.-]*$/.test(scheme) ||
    ["http", "https", "exp", "file"].includes(scheme)
  )
    throw new Error(
      'Set "scheme" in starter.config.json to a lowercase name such as myapp.',
    );
});
await check("PostgreSQL connection and tables", async () => {
  const pool = new Pool({
    connectionString: databaseUrl(),
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  pool.on("error", () => {});
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])",
      [["user", "session", "account", "verification", "notes"]],
    );
    if (result.rowCount !== 5) throw new Error("MISSING_TABLES");
  } catch (error) {
    if (error.message === "MISSING_TABLES")
      throw new Error("Run pnpm db:migrate to create the tables.");
    throw new Error(databaseError(error));
  } finally {
    await pool.end();
  }
});
await check("Project instructions and skills", () => {
  for (const path of [
    "AGENTS.md",
    "agent.md",
    "compose.dev.yaml",
    ".agents/skills/dev-database/SKILL.md",
    ".agents/skills/build-feature/SKILL.md",
    ".agents/skills/create-variant/SKILL.md",
    ".agents/skills/starter-setup/SKILL.md",
  ]) {
    if (!existsSync(resolve(root, path))) throw new Error(`Missing ${path}`);
  }
});
await check("Context7 configuration files", () => {
  for (const path of [
    ".mcp.json",
    ".cursor/mcp.json",
    ".vscode/mcp.json",
    ".codex/config.toml",
  ]) {
    if (!existsSync(resolve(root, path))) throw new Error(`Missing ${path}`);
  }
});

// A reminder, not a failure: fresh copies must pass, but a finished app should
// not ship the starter's blank canvas. build-feature removes it with the app's
// first real screen.
function placeholders(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) found.push(...placeholders(path));
    else if (
      /\.(tsx|jsx)$/.test(entry.name) &&
      readFileSync(path, "utf8").includes('testID="starter-placeholder"')
    )
      found.push(relative(root, path));
  }
  return found;
}
const remaining = placeholders(resolve(root, "apps/mobile/src"));
if (remaining.length)
  console.warn(
    `! Starter placeholder still present: ${remaining.join(", ")}. Replace it with your app's first screen (build-feature skill), then delete apps/mobile/.maestro/starter.yaml.`,
  );
console.log(
  "\nContext7 is checked inside your AI editor; this command checks local configuration and PostgreSQL only.",
);
process.exitCode = failures ? 1 : 0;
