import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

/**
 * Flat ESLint config for the Atomic Design frontend. Enforces:
 *  - full typing (strict, type-aware typescript-eslint; no `any`),
 *  - Atomic Design layer boundaries (atoms < molecules < organisms < templates < pages),
 *  - barrel imports only (cross-layer imports must go through each layer's index.ts).
 * Prettier owns formatting (config disables conflicting stylistic rules, last).
 */
export default tseslint.config(
  { ignores: ["dist", "coverage", "node_modules", "eslint.config.js"] },

  // Base + full type-aware TypeScript.
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // React + accessibility presets (flat).
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs["recommended-latest"],
  jsxA11y.flatConfigs.recommended,

  // Type-aware parsing for source + tests.
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    settings: { react: { version: "detect" } },
  },

  // Project rules: full typing + atomic boundaries + barrels.
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { import: importPlugin, boundaries },
    settings: {
      "import/resolver": {
        typescript: { alwaysTryTypes: true, project: "./tsconfig.app.json" },
      },
      "boundaries/elements": [
        { type: "atoms", pattern: "src/components/atoms", mode: "folder" },
        { type: "molecules", pattern: "src/components/molecules", mode: "folder" },
        { type: "organisms", pattern: "src/components/organisms", mode: "folder" },
        { type: "templates", pattern: "src/components/templates", mode: "folder" },
        { type: "pages", pattern: "src/pages", mode: "folder" },
        { type: "api", pattern: "src/api", mode: "folder" },
        { type: "hooks", pattern: "src/hooks", mode: "folder" },
        { type: "contexts", pattern: "src/contexts", mode: "folder" },
        { type: "types", pattern: "src/types", mode: "folder" },
      ],
      "boundaries/ignore": [
        "src/main.tsx",
        "src/App.tsx",
        "src/vite-env.d.ts",
        "src/test/**",
        "**/*.test.{ts,tsx}",
      ],
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        },
      ],
      // Atomic Design: each layer may import only equal/lower layers (+ shared types).
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: ["types"], allow: ["types"] },
            { from: ["atoms"], allow: ["atoms", "types"] },
            { from: ["molecules"], allow: ["atoms", "molecules", "types"] },
            { from: ["organisms"], allow: ["atoms", "molecules", "organisms", "types"] },
            {
              from: ["templates"],
              allow: ["atoms", "molecules", "organisms", "templates", "types"],
            },
            {
              from: ["pages"],
              allow: [
                "atoms",
                "molecules",
                "organisms",
                "templates",
                "api",
                "hooks",
                "contexts",
                "types",
              ],
            },
            { from: ["hooks", "contexts"], allow: ["api", "hooks", "contexts", "types"] },
            { from: ["api"], allow: ["api", "types"] },
          ],
        },
      ],
      // Barrels: a layer may only be imported through its index.ts entry point.
      "boundaries/entry-point": [
        "error",
        { default: "disallow", rules: [{ target: ["*"], allow: "index.{ts,tsx}" }] },
      ],
      "boundaries/external": "off",
      "boundaries/no-unknown": "off",
      "boundaries/no-unknown-files": "off",
    },
  },

  // Tests: relax assertions that are noise in test code.
  {
    files: ["**/*.test.{ts,tsx}", "src/test/**"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
    },
  },

  // Prettier last: turn off formatting-related lint rules.
  prettier,
);
