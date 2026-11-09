import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/.expo/**",
    "**/.turbo/**",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Expo, Metro, Babel, and Tailwind load these CommonJS files themselves.
    files: ["apps/mobile/*.config.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    files: ["apps/mobile/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat.recommended,
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
]);
