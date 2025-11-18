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
    provider: "gemini",
    storyboard,
    text: JSON.stringify(storyboard),
    metadata: { rawText: JSON.stringify(storyboard) },
  };
}

function createLoopSuccess(): DirectorCoreSuccess {
  const loop: LoopSequenceResult = {
    cycles: [
      {
        segment_title: "Pulse",
        scene_description: "Neon rain over rooftops",
        main_subject: "Skater",
        camera_movement: "Orbit",
        visual_tone: "Electric",
        motion: "Slow spin",
        mood: "Hypnotic",
        narrative: "The city breathes",
        continuity_lock: {
          subject_identity: "Skater silhouette",
          lighting_and_palette: "Violet and cyan",
          camera_grammar: "35mm",
          environment_motif: "Billboards",
          emotional_trajectory: "Cycle resets",
        },
        acceptance_check: ["Return to start pose"],
      },
    ],
    loopLength: 4,
    frameRate: 12,
    metadata: { tag: "loop" },
  };

  return {
    success: true,
    mode: "loop_sequence",
    provider: "gemini",
    loop,
    text: JSON.stringify(loop),
    metadata: { rawText: JSON.stringify(loop) },
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

test("mapDirectorCoreSuccess preserves prompt-only Gemini payloads", () => {
  const response = mapDirectorCoreSuccess({
    success: true,
    mode: "image_prompt",
    provider: "gemini",
    images: [],
    promptText: "Describe the world",
    metadata: { caution: "text-only" },
  });

  assert.equal(response.success, true);
  assert.equal(response.mode, "image_prompt");
  assert.equal(response.text, "Describe the world");
  assert.equal(response.fallbackText, "Describe the world");
  assert.equal(response.media?.length, 0);
});

test("mapDirectorCoreSuccess stringifies video plans", () => {
  const response = mapDirectorCoreSuccess(createVideoSuccess());

  assert.equal(response.mode, "video_plan");
  assert.ok(response.text?.includes("thumbnailConcept"));
  assert.equal(response.media?.length, 0);
});

test("mapDirectorCoreSuccess returns plan-only video responses", () => {
  const storyboard: VideoPlanResponse = {
    thumbnailConcept: "Storm over the city",
    scenes: [
      {
        segment_title: "Prologue",
        scene_description: "Describe the stormy skyline.",
        main_subject: "City",
        camera_movement: "Dolly",
        visual_tone: "Moody",
        motion: "Slow",
        mood: "Ominous",
        narrative: "Set the scene",
        continuity_lock: {
          subject_identity: "Narrator",
          lighting_and_palette: "Cool",
          camera_grammar: "Wide",
          environment_motif: "Rain",
        },
        acceptance_check: ["Show skyline"],
      },
    ],
  };

  const response = mapDirectorCoreSuccess({
    success: true,
    mode: "video_plan",
    provider: "gemini",
    storyboard,
    text: JSON.stringify(storyboard),
  });

  assert.equal(response.success, true);
  assert.equal(response.mode, "video_plan");
  assert.ok(response.text?.includes("Storm over the city"));
  assert.equal(response.media?.length, 0);
  assert.equal(response.result, storyboard);
});

test("mapDirectorCoreSuccess returns loop plans", () => {
  const response = mapDirectorCoreSuccess(createLoopSuccess());

  assert.equal(response.mode, "loop_sequence");
  assert.equal(response.media?.length, 0);
  assert.ok(response.text?.includes("Neon rain"));
  const loopResult = response.result as LoopSequenceResult | null;
  assert.ok(loopResult);
  assert.equal(loopResult?.cycles.length, 1);
  assert.equal(loopResult?.loopLength, 4);
});
