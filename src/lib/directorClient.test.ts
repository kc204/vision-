import assert from "node:assert/strict";
import test from "node:test";

const ORIGINAL_ENV = {
  GEMINI_API_URL: process.env.GEMINI_API_URL,
  VERTEX_VEO_API_URL: process.env.VERTEX_VEO_API_URL,
  VEO_API_KEY: process.env.VEO_API_KEY,
  VERTEX_VEO_API_KEY: process.env.VERTEX_VEO_API_KEY,
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

function buildVideoPlanPayload() {
  return {
    mode: "video_plan" as const,
    payload: {
      vision_seed_text: "Epic skyline",
      script_text: "The hero returns.",
      tone: "hype" as const,
      visual_style: "stylized" as const,
      aspect_ratio: "16:9" as const,
      mood_profile: null,
      cinematic_control_options: {},
    },
  };
}

async function importDirectorClient() {
  const modulePath = require.resolve("./directorClient");
  delete require.cache[modulePath];
  return import("./directorClient");
}

test("video plan requests fail without a Veo base URL", async (t) => {
  setEnv("GEMINI_API_URL", "https://generative.example/v1beta");
  setEnv("VERTEX_VEO_API_URL", undefined);
  setEnv("VEO_API_KEY", undefined);
  setEnv("VERTEX_VEO_API_KEY", undefined);
  setEnv("GEMINI_API_KEY", undefined);
  setEnv("GOOGLE_API_KEY", undefined);

  const fetchMock = t.mock.method(global, "fetch", () => {
    throw new Error("fetch should not be called");
  });

  const { callDirectorCore } = await importDirectorClient();
  const result = await callDirectorCore(buildVideoPlanPayload());

  assert.equal(result.success, false);
  assert.equal(result.provider, "veo");
  assert.equal(result.status, 500);
  assert.match(
    result.error,
    /Configure VERTEX_VEO_API_URL or VEO_API_URL for video generation/
  );
  assert.equal(fetchMock.mock.calls.length, 0);
});

test("video plan requests fail when only Gemini keys are provided", async (t) => {
  setEnv("GEMINI_API_URL", undefined);
  setEnv("VERTEX_VEO_API_URL", "https://vertex.example/v1beta");
  setEnv("VEO_API_KEY", undefined);
  setEnv("VERTEX_VEO_API_KEY", undefined);
  setEnv("GEMINI_API_KEY", "gemini-only-key");
  setEnv("GOOGLE_API_KEY", "gemini-fallback");

  const fetchMock = t.mock.method(global, "fetch", () => {
    throw new Error("fetch should not be called");
  });

  const { callDirectorCore } = await importDirectorClient();
  const result = await callDirectorCore(buildVideoPlanPayload());

  assert.equal(result.success, false);
  assert.equal(result.status, 401);
  assert.match(result.error, /requires a dedicated API key/);
  assert.equal(fetchMock.mock.calls.length, 0);
});

test("video plan requests use Veo endpoints and keys when configured", async (t) => {
  setEnv("GEMINI_API_URL", undefined);
  setEnv("VERTEX_VEO_API_URL", "https://vertex.example/v1beta");
  setEnv("VEO_API_KEY", "test-veo-key");
  setEnv("VERTEX_VEO_API_KEY", undefined);
  setEnv("GEMINI_API_KEY", undefined);
  setEnv("GOOGLE_API_KEY", undefined);

  const predictUrls: string[] = [];

  const fetchMock = t.mock.method(
    global,
    "fetch",
    async (url: RequestInfo | URL, init?: RequestInit) => {
      const normalizedUrl =
        typeof url === "string"
          ? url
          : url instanceof URL
            ? url.toString()
            : url.url;

      if (normalizedUrl.includes(":predictLongRunning")) {
        predictUrls.push(normalizedUrl);
        return new Response(JSON.stringify({ name: "operations/op123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          done: true,
          response: {
            generated_videos: [
              { url: "https://cdn.example/video.mp4", mime_type: "video/mp4" },
            ],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  );

  const { callDirectorCore } = await importDirectorClient();
  const result = await callDirectorCore(buildVideoPlanPayload());

  assert.equal(result.success, true);
  assert.equal(result.mode, "video_plan");
  assert.equal(result.provider, "veo-3.1-generate-preview");
  assert.ok(result.videos.length > 0);
  assert.equal(predictUrls.length, 1);
  assert.match(predictUrls[0], /\/video\/models\/veo-3\.1-generate-preview:predictLongRunning\?key=test-veo-key$/);
  assert.equal(fetchMock.mock.calls.length, 2);
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

  const { callDirectorCore } = await importDirectorClient();

  const result = await callDirectorCore(
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

test("callGeminiImageProvider returns prompt-only responses", async (t) => {
  setEnv("GEMINI_API_KEY", "server-gemini-key");
  setEnv("GOOGLE_API_KEY", undefined);
  setEnv("GEMINI_IMAGE_MODELS", "gemini-1.5-pro");
  setEnv("GEMINI_IMAGE_MODEL", undefined);

  const fetchMock = t.mock.method(
    globalThis,
    "fetch",
    async (input: RequestInfo, init?: RequestInit) => {
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
                content: { parts: [{ text: "Only prompt returned" }] },
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
    }
  );

  const { callDirectorCore } = await importDirectorClient();

  const result = await callDirectorCore(
    {
      mode: "image_prompt",
      payload: {
        vision_seed_text: "Prompt only",
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
  assert.equal(result.mode, "image_prompt");
  assert.equal(result.provider, "gemini");
  assert.equal(result.promptText, "Only prompt returned");
  assert.equal(result.images.length, 0);
  assert.equal(fetchMock.mock.calls.length, 1);
});
