import { spawn } from "node:child_process";
import { pnpmCommand, runPnpm } from "./lib.mjs";

// pnpm dev: prepares the database, then runs the API (through Turborepo, with
// prefixed logs) next to the Expo dev server. Expo keeps this terminal, so its
// QR code and keyboard shortcuts (i: iOS simulator, a: Android emulator) work.
// Stopping either one stops both.
try {
  runPnpm(["run", "dev:prepare"]);
} catch {
  process.exit(1);
}

const shell = process.platform === "win32";
const children = [
  spawn(
    pnpmCommand(),
    ["exec", "turbo", "run", "dev", "--filter=@starter/api"],
    { stdio: ["ignore", "inherit", "inherit"], shell },
  ),
  spawn(pnpmCommand(), ["--filter", "@starter/mobile", "dev"], {
    stdio: "inherit",
    shell,
  }),
];

let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const child of children)
    if (child.exitCode === null) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) child.once("exit", (code) => stop(code ?? 0));
process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));
