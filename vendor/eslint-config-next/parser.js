"use strict";

const path = require("path");
const ts = require("typescript");
const eslintPkgRoot = path.dirname(require.resolve("eslint/package.json"));
const espree = require(require.resolve("espree", { paths: [eslintPkgRoot] }));

function transpile(code) {
  return ts.transpileModule(code, {
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
      preserveValueImports: false
    }
  }).outputText;
}

function parseWithEspree(code, options = {}) {
  const transpiled = transpile(code);
  const baseOptions = {
    ecmaVersion: 2022,
    sourceType: "module",
    range: true,
    loc: true,
    tokens: true,
    comment: true,
    ...options
  };
  baseOptions.ecmaFeatures = {
    ...(options.ecmaFeatures ?? {}),
    jsx: true
  };
  return espree.parse(transpiled, baseOptions);
}

module.exports = {
  parse(code, options) {
    return parseWithEspree(code, options);
  },
  parseForESLint(code, options) {
    const ast = parseWithEspree(code, options);
    return { ast };
  }
};
