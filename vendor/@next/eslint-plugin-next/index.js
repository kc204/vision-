"use strict";

const createNoopRule = (meta) => ({
  meta: {
    docs: {
      description: meta.description,
      recommended: meta.recommended ?? false,
      url: "https://nextjs.org/docs/app/building-your-application/optimizing/eslint"
    },
    schema: [],
    type: "problem"
  },
  create() {
    return {};
  }
});

const noopRules = {
  "no-html-link-for-pages": createNoopRule({
    description: "Disallow linking to pages with raw <a> elements.",
    recommended: true
  }),
  "no-img-element": createNoopRule({
    description: "Encourage usage of next/image.",
    recommended: true
  }),
  "no-script-in-document": createNoopRule({
    description: "Disallow next/script inside _document.",
    recommended: true
  }),
  "no-title-in-document-head": createNoopRule({
    description: "Disallow <title> in _document.",
    recommended: true
  }),
  "no-typos": createNoopRule({
    description: "Ensure Next.js components are spelled correctly.",
    recommended: false
  })
};

const recommendedRules = Object.keys(noopRules).reduce((acc, ruleName) => {
  acc[`@next/next/${ruleName}`] = "warn";
  return acc;
}, {});

module.exports = {
  meta: {
    name: "@next/eslint-plugin-next",
    version: "14.1.0-local"
  },
  rules: noopRules,
  configs: {
    recommended: {
      plugins: ["@next/next"],
      rules: recommendedRules
    },
    "core-web-vitals": {
      plugins: ["@next/next"],
      rules: {
        ...recommendedRules,
        "@next/next/no-img-element": "error"
      }
    }
  }
};
