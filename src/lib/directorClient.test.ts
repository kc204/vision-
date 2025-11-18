import assert from "node:assert/strict";
import test from "node:test";

const ORIGINAL_ENV = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  GEMINI_IMAGE_MODELS: process.env.GEMINI_IMAGE_MODELS,
  GEMINI_IMAGE_MODEL: process.env.GEMINI_IMAGE_MODEL,
};

function setEnv(key: keyof typeof ORIGINAL_ENV, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

test.after(() => {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    setEnv(key as keyof typeof ORIGINAL_ENV, value ?? undefined);
  }
});

test("callDirectorCore resolves an entitled image-capable Gemini model", async (t) => {
  setEnv("GEMINI_API_KEY", "server-gemini-key");
  setEnv("GOOGLE_API_KEY", undefined);
  setEnv("GEMINI_IMAGE_MODELS", "imagen-3.0-generate-001,gemini-1.5-pro");
  setEnv("GEMINI_IMAGE_MODEL", undefined);

  const fetchMock = t.mock.method(globalThis, "fetch", async (input: RequestInfo, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.includes(":generateContent")) {
      assert.equal(init?.method, "POST");
      assert.ok(url.includes("gemini-1.5-pro"));
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ inlineData: { mimeType: "image/png", data: "iVBORw0KGgoAAAANSUhEUg==" } }],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    if (url.includes("/models")) {
      return new Response(
        JSON.stringify({ models: [{ name: "models/gemini-1.5-pro" }] }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      );
    }

    throw new Error(`Unexpected fetch: ${url}`);
  });

  const modulePath = require.resolve("./directorClient");
  delete require.cache[modulePath];
  const directorClient = await import("./directorClient");

  const result = await directorClient.callDirectorCore(
    {
      mode: "image_prompt",
      payload: {
        vision_seed_text: "Hero landing pose",
        model: "sdxl",
        selectedOptions: {
          cameraAngles: [],
          shotSizes: [],
          composition: [],
          cameraMovement: [],
          lightingStyles: [],
          colorPalettes: [],
          atmosphere: [],
        },
        mood_profile: null,
        constraints: null,
      },
      images: [],
    },
    { gemini: { apiKey: "server-gemini-key" } }
  );

  assert.equal(result.success, true);
  assert.equal(fetchMock.mock.calls.length, 2);
});
