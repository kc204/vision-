"use strict";

const tsParser = require.resolve("./parser");

module.exports = {
  extends: ["eslint:recommended"],
  plugins: ["@next/next"],
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  overrides: [
    {
      files: ["**/*.{ts,tsx}", "**/*.{cts,mts}", "**/*.{d.ts,d.tsx}"],
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      }
    }
  ],
  settings: {
    react: {
      version: "detect"
    }
  },
  rules: {
    "@next/next/no-html-link-for-pages": "warn",
    "@next/next/no-img-element": "warn",
    "no-unused-vars": "off",
    "no-undef": "off"
  }
};
