import assert from "node:assert/strict";
import test from "node:test";

import { mapDirectorCoreSuccess } from "./directorClient";
import type {
  DirectorCoreSuccess,
  LoopSequenceResult,
  VideoPlanResponse,
} from "./directorTypes";

function createImageSuccess(): DirectorCoreSuccess {
  return {
    success: true,
    mode: "image_prompt",
    provider: "gemini",
    images: [
      { mimeType: "image/png", data: "iVBORw0KGgoAAAANSUhEUg==", altText: "Hero" },
    ],
    promptText: "Hero prompt",
    metadata: { seed: 123 },
  };
}

function createVideoSuccess(): DirectorCoreSuccess {
  const storyboard: VideoPlanResponse = {
    thumbnailConcept: "Bold neon skyline",
    scenes: [
      {
        segment_title: "Opening",
        scene_description: "Sweep across the city",
        main_subject: "City",
        camera_movement: "Push",
        visual_tone: "Neon",
        motion: "Glide",
        mood: "Hopeful",
        narrative: "Introduce the hero",
        continuity_lock: {
          subject_identity: "Hero",
          lighting_and_palette: "Cool",
          camera_grammar: "Wide",
          environment_motif: "Rain",
        },
        acceptance_check: ["Show skyline"],
      },
    ],
  };

  return {
    success: true,
    mode: "video_plan",
    provider: "veo-3.1",
    videos: [
      {
        url: "https://cdn.example/video.mp4",
        mimeType: "video/mp4",
        posterImage: "data:image/png;base64,iVBOR",
        frames: ["https://cdn.example/frame.png"],
        durationSeconds: 30,
        frameRate: 24,
      },
    ],
    storyboard,
  };
}

function createLoopSuccess(): DirectorCoreSuccess {
  const loop: LoopSequenceResult = {
    frames: [
      { mimeType: "image/png", data: "iVBORw0KGgoAAAANSUhEUg==", altText: "First" },
      { mimeType: "image/png", data: "https://cdn.example/frame.png", altText: "Second" },
    ],
    loopLength: 4,
    frameRate: 12,
    metadata: { tag: "loop" },
  };

  return {
    success: true,
    mode: "loop_sequence",
    provider: "nano-banana",
    loop,
  };
}

test("mapDirectorCoreSuccess normalizes image prompt payloads", () => {
  const response = mapDirectorCoreSuccess(createImageSuccess());

  assert.equal(response.success, true);
  assert.equal(response.mode, "image_prompt");
  assert.equal(response.text, "Hero prompt");
  assert.equal(response.result, "Hero prompt");
  assert.equal(response.media?.length, 1);
  assert.equal(response.media?.[0]?.base64, "iVBORw0KGgoAAAANSUhEUg==");
  assert.equal(response.media?.[0]?.caption, "Hero");
});

test("mapDirectorCoreSuccess stringifies video plans and media", () => {
  const response = mapDirectorCoreSuccess(createVideoSuccess());

  assert.equal(response.mode, "video_plan");
  assert.ok(response.text?.includes("thumbnailConcept"));
  assert.equal(response.media?.length, 1);
  assert.equal(response.media?.[0]?.url, "https://cdn.example/video.mp4");
  assert.equal(response.media?.[0]?.posterUrl, "data:image/png;base64,iVBOR");
  assert.equal(response.media?.[0]?.frames?.[0]?.url, "https://cdn.example/frame.png");
});

test("mapDirectorCoreSuccess attaches loop frames", () => {
  const response = mapDirectorCoreSuccess(createLoopSuccess());

  assert.equal(response.mode, "loop_sequence");
  assert.equal(response.media?.length, 1);
  assert.equal(response.media?.[0]?.frames?.length, 2);
  assert.equal(response.media?.[0]?.frameRate, 12);
  assert.equal(response.media?.[0]?.durationSeconds, 4);
  assert.equal(response.media?.[0]?.frames?.[1]?.url, "https://cdn.example/frame.png");
  const loopResult = response.result as LoopSequenceResult | null;
  assert.ok(loopResult);
  assert.equal(loopResult?.frames.length, 2);
  assert.equal(loopResult?.loopLength, 4);
});
