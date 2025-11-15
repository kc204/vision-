import { NextResponse } from "next/server";

import { callDirectorCore } from "@/lib/directorClient";
import {
  AspectRatio,
  DirectorRequest,
  ImagePromptDirectorRequest,
  LoopSequenceDirectorRequest,
  SceneAnswer,
  SceneDraft,
  VideoPlanDirectorRequest,
} from "@/lib/directorTypes";

const MODEL_CHOICES = new Set(["sdxl", "flux", "illustrious"] as const);
const ASPECT_RATIOS = new Set<AspectRatio>(["16:9", "9:16"]);

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSceneDraftArray(value: unknown): value is SceneDraft[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        isString((item as SceneDraft).id) &&
        isString((item as SceneDraft).title) &&
        isString((item as SceneDraft).summary) &&
        isString((item as SceneDraft).question)
    )
  );
}

function isSceneAnswerArray(value: unknown): value is SceneAnswer[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        isString((item as SceneAnswer).sceneId) &&
        isString((item as SceneAnswer).answer)
    )
  );
}

function isImagePromptRequest(value: unknown): value is ImagePromptDirectorRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as ImagePromptDirectorRequest;
  if (request.type !== "image_prompt") return false;
  if (!isString(request.visionSeedText) || request.visionSeedText.trim().length === 0) {
    return false;
  }
  if (!MODEL_CHOICES.has(request.modelChoice)) {
    return false;
  }
  if (
    (request.cameraAngleId && !isString(request.cameraAngleId)) ||
    (request.shotSizeId && !isString(request.shotSizeId)) ||
    (request.compositionTechniqueId && !isString(request.compositionTechniqueId)) ||
    (request.lightingVocabularyId && !isString(request.lightingVocabularyId)) ||
    (request.colorPaletteId && !isString(request.colorPaletteId))
  ) {
    return false;
  }
  if (request.motionCueIds && !isStringArray(request.motionCueIds)) {
    return false;
  }
  if (request.stylePackIds && !isStringArray(request.stylePackIds)) {
    return false;
  }
  return true;
}

function isVideoPlanRequest(value: unknown): value is VideoPlanDirectorRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as VideoPlanDirectorRequest;
  if (request.type !== "video_plan") return false;
  const seed = request.visionSeed;
  if (!seed || typeof seed !== "object") {
    return false;
  }
  if (
    !isString(seed.scriptText) ||
    seed.scriptText.trim().length === 0 ||
    !isString(seed.tone) ||
    seed.tone.trim().length === 0 ||
    !isString(seed.palette) ||
    seed.palette.trim().length === 0 ||
    !ASPECT_RATIOS.has(seed.aspectRatio)
  ) {
    return false;
  }
  if (seed.references && !isStringArray(seed.references)) {
    return false;
  }
  if (request.segmentation && !isSceneDraftArray(request.segmentation)) {
    return false;
  }
  if (request.sceneAnswers && !isSceneAnswerArray(request.sceneAnswers)) {
    return false;
  }
  if (request.directRender !== undefined && typeof request.directRender !== "boolean") {
    return false;
  }
  return true;
}

function isLoopSequenceRequest(value: unknown): value is LoopSequenceDirectorRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as LoopSequenceDirectorRequest;
  if (request.type !== "loop_sequence") return false;
  if (!isString(request.loopSeedText) || request.loopSeedText.trim().length === 0) {
    return false;
  }
  if (
    request.durationSeconds !== undefined &&
    (typeof request.durationSeconds !== "number" || Number.isNaN(request.durationSeconds))
  ) {
    return false;
  }
  if (request.aspectRatio && !ASPECT_RATIOS.has(request.aspectRatio as AspectRatio) && request.aspectRatio !== "1:1") {
    return false;
  }
  if (request.vibe && !isString(request.vibe)) {
    return false;
  }
  if (request.references && !isStringArray(request.references)) {
    return false;
  }
  return true;
}

function parseDirectorRequest(value: unknown): DirectorRequest | null {
  if (isImagePromptRequest(value)) return value;
  if (isVideoPlanRequest(value)) return value;
  if (isLoopSequenceRequest(value)) return value;
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const directorRequest = parseDirectorRequest(body);

    if (!directorRequest) {
      return NextResponse.json({ error: "Invalid director request" }, { status: 400 });
    }

    const { text } = await callDirectorCore(directorRequest);
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Director route error", error);
    return NextResponse.json({ error: "Director core request failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
