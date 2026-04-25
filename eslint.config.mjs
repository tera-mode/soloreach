import js from "@eslint/js";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  js.configs.recommended,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".test-artifacts/**",
      "out/**",
    ],
  },
];

export default config;
