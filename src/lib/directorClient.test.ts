import assert from "node:assert/strict";
import test from "node:test";

import {
  _buildVeoVideoRequestPayloadForTest as buildVeoVideoRequestPayload,
  _buildVeoPredictRequestForTest as buildVeoPredictRequest,
  _validateVeoResponseForTest as validateVeoResponse,
  _parseVeoVideoResponseForTest as parseVeoVideoResponse,
} from "./directorClient";
import { DIRECTOR_CORE_SYSTEM_PROMPT } from "./prompts/directorCore";

test("Veo predictLongRunning payloads wrap prompts in instances", () => {
  const promptResult = buildVeoVideoRequestPayload(
    {
      vision_seed_text: "  Epic skyline  ",
      script_text: "  opening scene  ",
      tone: "hype",
      visual_style: "stylized",
      aspect_ratio: "16:9",
      mood_profile: null,
    },
    ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="]
  );

  assert.equal(promptResult.ok, true);
  if (!promptResult.ok) return;

  const payload = buildVeoPredictRequest(promptResult.value);
  assert.equal(payload.instances.length, 1);

  const prompt = payload.instances[0]?.prompt;
  assert.equal(prompt.prompt, "Epic skyline");
  assert.equal(prompt.script.input, "opening scene");
  assert.equal(prompt.system_prompt, DIRECTOR_CORE_SYSTEM_PROMPT);
  assert.equal(prompt.media?.length, 1);
  assert.equal(prompt.media?.[0]?.type, "IMAGE");
});

test("Veo responses nested in predictions are validated and parsed", () => {
  const veoResponse = {
    metadata: { jobId: "operation-123" },
    predictions: [
      {
        candidates: [
          {
            storyboard: { thumbnailConcept: "Neon city", scenes: [] },
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    url: "https://cdn.example/video.mp4",
                    mimeType: "video/mp4",
                    durationSeconds: 12,
                    frameRate: 24,
                    frames: ["https://cdn.example/frame.png"],
                  }),
                },
              ],
            },
          },
        ],
        generated_videos: [
          {
            url: "https://cdn.example/video.mp4",
            mime_type: "video/mp4",
            poster_image: "https://cdn.example/poster.png",
          },
        ],
      },
    ],
  } satisfies Record<string, unknown>;

  const validation = validateVeoResponse(veoResponse, "veo-model", 200);
  assert.equal(validation.ok, true);
  if (!validation.ok) return;

  const parsed = parseVeoVideoResponse(validation.payload);
  assert.ok(parsed.storyboard);
  assert.equal(parsed.metadata?.jobId, "operation-123");
  assert.ok(parsed.videos.some((video) => video.url === "https://cdn.example/video.mp4"));
  const structured = parsed.videos.find((video) => video.frames?.length);
  assert.equal(structured?.frames?.[0], "https://cdn.example/frame.png");
});
