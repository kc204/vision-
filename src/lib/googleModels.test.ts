import assert from "node:assert/strict";
import test from "node:test";

import {
  ensureImageCapableGeminiModels,
  IMAGE_CAPABLE_GEMINI_MODELS,
  resolveGoogleModel,
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

test("resolveGoogleModel honors available models with API key", async (t) => {
  const apiUrl = "https://generativelanguage.googleapis.com/v1beta";
  const apiKey = "entitled-api-key";
  const models = ["imagen-3.0-generate-001", "gemini-1.5-pro"];

  const fetchMock = t.mock.method(globalThis, "fetch", async (input: RequestInfo) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    assert.equal(url, `${apiUrl}/models?key=${apiKey}`);

    return new Response(
      JSON.stringify({
        models: [
          { name: "models/gemini-1.5-pro" },
          { name: "models/imagen-3.0-generate-001" },
        ],
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  });

  const resolved = await resolveGoogleModel({ apiKey }, models, apiUrl);

  assert.equal(resolved, "imagen-3.0-generate-001");
  assert.equal(fetchMock.mock.calls.length, 1);
});

test("resolveGoogleModel returns image-capable v1beta model when entitled", async (t) => {
  const apiUrl = "https://generativelanguage.googleapis.com/v1beta";
  const apiKey = "entitled-api-key-v1beta";
  const models = ["gemini-2.5-flash-image", "imagen-3.0-generate-001"];

  const fetchMock = t.mock.method(globalThis, "fetch", async (input: RequestInfo) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    assert.equal(url, `${apiUrl}/models?key=${apiKey}`);

    return new Response(
      JSON.stringify({ models: [{ name: "models/gemini-2.5-flash-image" }] }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  });

  const resolved = await resolveGoogleModel({ apiKey }, models, apiUrl);

  assert.equal(resolved, "gemini-2.5-flash-image");
  assert.equal(fetchMock.mock.calls.length, 1);
});
