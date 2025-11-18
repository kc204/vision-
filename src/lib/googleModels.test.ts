import assert from "node:assert/strict";
import test from "node:test";

import {
  ensureImageCapableGeminiModels,
  IMAGE_CAPABLE_GEMINI_MODELS,
} from "./googleModels";

test("image capable models are preserved when provided", () => {
  const selection = ensureImageCapableGeminiModels(
    [IMAGE_CAPABLE_GEMINI_MODELS[0]],
    IMAGE_CAPABLE_GEMINI_MODELS
  );

  assert.equal(selection[0], IMAGE_CAPABLE_GEMINI_MODELS[0]);
});

test("fallback image model is prefixed when missing", () => {
  const fallbackModel = IMAGE_CAPABLE_GEMINI_MODELS[0];
  const selection = ensureImageCapableGeminiModels(["gemini-2.5-pro"], [fallbackModel]);

  assert.equal(selection[0], fallbackModel);
});
