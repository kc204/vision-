import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "@/app/api/director/route";
import * as directorClient from "@/lib/directorClient";
import type {
  DirectorCoreError,
  DirectorCoreSuccess,
  DirectorRequest,
  DirectorResponse,
  ImagePromptPayload,
} from "@/lib/directorTypes";

const ORIGINAL_ENV = {
  DIRECTOR_CORE_REQUIRE_API_KEY: process.env.DIRECTOR_CORE_REQUIRE_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
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
      glossary: buildGlossary(),
    },
  };
}

function buildGlossary(): ImagePromptPayload["glossary"] {
  const emptyOption = {
    id: "option",
    label: "Option",
    tooltip: "Tooltip",
    promptSnippet: "Snippet",
  };

  return {
    cameraAngles: [emptyOption],
    shotSizes: [emptyOption],
    composition: [emptyOption],
    cameraMovement: [emptyOption],
    lightingStyles: [emptyOption],
    colorPalettes: [emptyOption],
    atmosphere: [emptyOption],
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

async function exerciseBuilderSubmissionFlow(
  response: Response,
  expectedMode: DirectorRequest["mode"]
): Promise<DirectorResponse> {
  const responseClone = response.clone();
  let rawBodyText: string | null = null;
  const rawResponseJson = (await response
    .json()
    .catch(async () => {
      rawBodyText = await responseClone.text().catch(() => null);
      return null;
    })) as DirectorResponse | { error?: string } | null;

  if (!response.ok) {
    rawBodyText ??= await responseClone.text().catch(() => null);
    const message =
      (rawResponseJson as { error?: string } | null)?.error ??
      (rawBodyText
        ? `HTTP ${response.status}: ${rawBodyText}`
        : `HTTP ${response.status} error`);
    throw new Error(message);
  }

  if (
    !rawResponseJson ||
    typeof rawResponseJson !== "object" ||
    !("success" in rawResponseJson)
  ) {
    const bodySummary =
      rawBodyText ??
      (rawResponseJson ? JSON.stringify(rawResponseJson) : null) ??
      "No response body returned";
    throw new Error(
      `Invalid response format (HTTP ${response.status}). Raw response: ${bodySummary}`
    );
  }

  const responseJson: DirectorResponse = rawResponseJson;

  if (responseJson.success !== true) {
    throw new Error(
      (responseJson as { error?: string }).error ??
        "Director Core returned an unexpected payload"
    );
  }

  if (responseJson.mode !== expectedMode) {
    throw new Error("Director Core returned a response for a different mode");
  }

  return responseJson;
}

test("image prompts proceed when server Gemini key exists", async (t) => {
  setEnv("DIRECTOR_CORE_REQUIRE_API_KEY", undefined);
  setEnv("GEMINI_API_KEY", "server-gemini-key");
  setEnv("GOOGLE_API_KEY", undefined);

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

test("video plans use server Gemini credentials when headers are missing", async (t) => {
  setEnv("DIRECTOR_CORE_REQUIRE_API_KEY", undefined);
  setEnv("GEMINI_API_KEY", "server-gemini-key");
  setEnv("GOOGLE_API_KEY", undefined);

  const success: DirectorCoreSuccess = {
    success: true,
    mode: "video_plan",
    provider: "gemini",
    storyboard: {
      thumbnailConcept: "Epic skyline",
      scenes: [],
    },
    storyboardText: JSON.stringify({
      thumbnailConcept: "Epic skyline",
      scenes: [],
    }),
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

test("provider failures return a structured error response", async (t) => {
  setEnv("DIRECTOR_CORE_REQUIRE_API_KEY", undefined);
  setEnv("GEMINI_API_KEY", "server-gemini-key");
  setEnv("GOOGLE_API_KEY", undefined);

  const directorError: DirectorCoreError = {
    success: false,
    provider: "gemini",
    error: "Gemini request failed",
    status: 429,
    details: { reason: "quota" },
  };

  const callDirectorMock = t.mock.method(
    directorClient,
    "callDirectorCore",
    async () => directorError
  );

  const response = await POST(createRequest(buildImagePayload()));

  assert.equal(response.status, directorError.status);
  const payload = await response.json();
  assert.equal(payload.success, false);
  assert.equal(payload.mode, "image_prompt");
  assert.equal(payload.error, directorError.error);
  assert.equal(payload.status, directorError.status);
  assert.equal(callDirectorMock.mock.calls.length, 1);
});
