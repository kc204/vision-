"use strict";

const baseConfig = require("./index.js");

module.exports = {
  ...baseConfig,
  rules: {
    ...baseConfig.rules,
    "@next/next/no-img-element": "error"
  }
};
