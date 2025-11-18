import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "@/app/api/director/route";
import * as directorClient from "@/lib/directorClient";
import type { DirectorCoreSuccess } from "@/lib/directorTypes";

const ORIGINAL_ENV = {
  DIRECTOR_CORE_REQUIRE_API_KEY: process.env.DIRECTOR_CORE_REQUIRE_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  VEO_API_KEY: process.env.VEO_API_KEY,
  VERTEX_VEO_API_KEY: process.env.VERTEX_VEO_API_KEY,
  VERTEX_VEO_API_URL: process.env.VERTEX_VEO_API_URL,
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

function buildImagePayload() {
  return {
    mode: "image_prompt" as const,
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
    },
  };
}

function buildVideoPlanPayload() {
  return {
    mode: "video_plan" as const,
    payload: {
      vision_seed_text: "Epic skyline",
      script_text: "The hero returns.",
      tone: "hype",
      visual_style: "realistic",
      aspect_ratio: "16:9",
      cinematic_control_options: {
        cameraAngles: ["wide"],
        shotSizes: ["medium"],
        composition: ["rule of thirds"],
        cameraMovement: ["push"],
        lightingStyles: ["neon"],
        colorPalettes: ["cool"],
        atmosphere: ["rain"],
      },
    },
  };
}

function createRequest(body: unknown) {
  return new Request("http://localhost/api/director", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("image prompts proceed when server Gemini key exists", async (t) => {
  setEnv("DIRECTOR_CORE_REQUIRE_API_KEY", undefined);
  setEnv("GEMINI_API_KEY", "server-gemini-key");
  setEnv("GOOGLE_API_KEY", undefined);
  setEnv("VEO_API_KEY", undefined);
  setEnv("VERTEX_VEO_API_KEY", undefined);
  setEnv("VERTEX_VEO_API_URL", undefined);

  const success: DirectorCoreSuccess = {
    success: true,
    mode: "image_prompt",
    provider: "gemini",
    images: [
      { mimeType: "image/png", data: "iVBORw0KGgoAAAANSUhEUg==", altText: "Hero" },
    ],
    promptText: "Hero landing pose",
    metadata: { seed: 123 },
  };

  const callDirectorMock = t.mock.method(
    directorClient,
    "callDirectorCore",
    async () => success
  );

  const response = await POST(createRequest(buildImagePayload()));

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.success, true);
  assert.equal(callDirectorMock.mock.calls.length, 1);
});

test("video plans use server Veo credentials when headers are missing", async (t) => {
  setEnv("DIRECTOR_CORE_REQUIRE_API_KEY", undefined);
  setEnv("GEMINI_API_KEY", undefined);
  setEnv("GOOGLE_API_KEY", undefined);
  setEnv("VEO_API_KEY", "server-veo-key");
  setEnv("VERTEX_VEO_API_KEY", undefined);
  setEnv("VERTEX_VEO_API_URL", "https://vertex.example/v1beta");

  const success: DirectorCoreSuccess = {
    success: true,
    mode: "video_plan",
    provider: "veo-3.1",
    videos: [
      {
        url: "https://cdn.example/video.mp4",
        mimeType: "video/mp4",
        posterImage: "https://cdn.example/poster.png",
        frames: ["https://cdn.example/frame.png"],
        durationSeconds: 30,
        frameRate: 24,
      },
    ],
    storyboard: {
      thumbnailConcept: "Epic skyline",
      scenes: [],
    },
  };

  const callDirectorMock = t.mock.method(
    directorClient,
    "callDirectorCore",
    async () => success
  );

  const response = await POST(createRequest(buildVideoPlanPayload()));

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.success, true);
  assert.equal(callDirectorMock.mock.calls.length, 1);
});
