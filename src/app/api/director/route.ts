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

class DirectorValidationError extends Error {}

type UnknownRecord = Record<string, unknown>;

const VALID_IMAGE_MODELS = new Set([
  "sdxl",
  "flux",
  "illustrious",
]);

const VALID_ASPECT_RATIOS: ReadonlySet<AspectRatio | "1:1"> = new Set([
  "16:9",
  "9:16",
  "1:1",
]);

const VALID_VIDEO_PLAN_ASPECT_RATIOS: ReadonlySet<AspectRatio> = new Set([
  "16:9",
  "9:16",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const directorRequest = parseDirectorRequest(body);

    const text = await callDirectorCore(directorRequest);

    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof DirectorValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Unhandled director error", error);
    return NextResponse.json(
      { error: "Failed to call Director Core" },
      { status: 500 }
    );
  }
}

function parseDirectorRequest(body: unknown): DirectorRequest {
  if (!isRecord(body)) {
    throw new DirectorValidationError("Request body must be a JSON object");
  }

  const { mode, payload } = body;

  if (typeof mode !== "string") {
    throw new DirectorValidationError("mode is required");
  }

  if (!isRecord(payload)) {
    throw new DirectorValidationError("payload must be an object");
  }

  switch (mode) {
    case "image_prompt":
      return {
        mode,
        payload: parseImagePromptPayload(payload),
      } satisfies ImagePromptDirectorRequest;
    case "loop_sequence":
      return {
        mode,
        payload: parseLoopSequencePayload(payload),
      } satisfies LoopSequenceDirectorRequest;
    case "video_plan":
      return {
        mode,
        payload: parseVideoPlanPayload(payload),
      } satisfies VideoPlanDirectorRequest;
    default:
      throw new DirectorValidationError(`Unsupported director mode: ${mode}`);
  }
}

function parseImagePromptPayload(payload: UnknownRecord): ImagePromptDirectorRequest["payload"] {
  const { visionSeedText, modelChoice } = payload;

  if (!isNonEmptyString(visionSeedText)) {
    throw new DirectorValidationError("visionSeedText is required");
  }

  if (typeof modelChoice !== "string" || !VALID_IMAGE_MODELS.has(modelChoice)) {
    throw new DirectorValidationError(
      "modelChoice must be one of: sdxl, flux, illustrious"
    );
  }

  const result: ImagePromptDirectorRequest["payload"] = {
    visionSeedText: visionSeedText.trim(),
    modelChoice,
  };

  if (payload.cameraAngleId !== undefined) {
    result.cameraAngleId = parseOptionalString(payload.cameraAngleId, "cameraAngleId");
  }

  if (payload.shotSizeId !== undefined) {
    result.shotSizeId = parseOptionalString(payload.shotSizeId, "shotSizeId");
  }

  if (payload.compositionTechniqueId !== undefined) {
    result.compositionTechniqueId = parseOptionalString(
      payload.compositionTechniqueId,
      "compositionTechniqueId"
    );
  }

  if (payload.lightingVocabularyId !== undefined) {
    result.lightingVocabularyId = parseOptionalString(
      payload.lightingVocabularyId,
      "lightingVocabularyId"
    );
  }

  if (payload.colorPaletteId !== undefined) {
    result.colorPaletteId = parseOptionalString(
      payload.colorPaletteId,
      "colorPaletteId"
    );
  }

  if (payload.motionCueIds !== undefined) {
    result.motionCueIds = parseStringArray(payload.motionCueIds, "motionCueIds");
  }

  if (payload.stylePackIds !== undefined) {
    result.stylePackIds = parseStringArray(payload.stylePackIds, "stylePackIds");
  }

  return result;
}

function parseLoopSequencePayload(payload: UnknownRecord): LoopSequenceDirectorRequest["payload"] {
  const { loopSeedText } = payload;

  if (!isNonEmptyString(loopSeedText)) {
    throw new DirectorValidationError("loopSeedText is required");
  }

  const result: LoopSequenceDirectorRequest["payload"] = {
    loopSeedText: loopSeedText.trim(),
  };

  if (payload.durationSeconds !== undefined) {
    if (!isFiniteNumber(payload.durationSeconds)) {
      throw new DirectorValidationError("durationSeconds must be a number");
    }
    result.durationSeconds = Number(payload.durationSeconds);
  }

  if (payload.aspectRatio !== undefined) {
    if (
      typeof payload.aspectRatio !== "string" ||
      !VALID_ASPECT_RATIOS.has(payload.aspectRatio as AspectRatio | "1:1")
    ) {
      throw new DirectorValidationError("aspectRatio is invalid");
    }
    result.aspectRatio = payload.aspectRatio as LoopSequenceDirectorRequest["payload"]["aspectRatio"];
  }

  if (payload.vibe !== undefined) {
    result.vibe = parseOptionalString(payload.vibe, "vibe");
  }

  if (payload.references !== undefined) {
    result.references = parseStringArray(payload.references, "references");
  }

  return result;
}

function parseVideoPlanPayload(payload: UnknownRecord): VideoPlanDirectorRequest["payload"] {
  const { visionSeed } = payload;

  if (!isRecord(visionSeed)) {
    throw new DirectorValidationError("visionSeed is required");
  }

  const { scriptText, tone, palette, references, aspectRatio } = visionSeed;

  if (!isNonEmptyString(scriptText)) {
    throw new DirectorValidationError("visionSeed.scriptText is required");
  }
  if (!isNonEmptyString(tone)) {
    throw new DirectorValidationError("visionSeed.tone is required");
  }
  if (!isNonEmptyString(palette)) {
    throw new DirectorValidationError("visionSeed.palette is required");
  }
  if (!Array.isArray(references) || !references.every(isString)) {
    throw new DirectorValidationError("visionSeed.references must be an array of strings");
  }
  if (
    typeof aspectRatio !== "string" ||
    !VALID_VIDEO_PLAN_ASPECT_RATIOS.has(aspectRatio as AspectRatio)
  ) {
    throw new DirectorValidationError("visionSeed.aspectRatio is invalid");
  }

  const result: VideoPlanDirectorRequest["payload"] = {
    visionSeed: {
      scriptText: scriptText.trim(),
      tone: tone.trim(),
      palette: palette.trim(),
      references: references.map((reference) => reference.trim()),
      aspectRatio: aspectRatio as AspectRatio,
    },
  };

  if (payload.segmentation !== undefined) {
    result.segmentation = parseSceneDraftArray(payload.segmentation);
  }

  if (payload.sceneAnswers !== undefined) {
    result.sceneAnswers = parseSceneAnswerArray(payload.sceneAnswers);
  }

  if (payload.directRender !== undefined) {
    if (typeof payload.directRender !== "boolean") {
      throw new DirectorValidationError("directRender must be a boolean");
    }
    result.directRender = payload.directRender;
  }

  if (payload.finalPlanOverride !== undefined) {
    result.finalPlanOverride = payload.finalPlanOverride;
  }

  return result;
}

function parseSceneDraftArray(value: unknown): SceneDraft[] {
  if (!Array.isArray(value)) {
    throw new DirectorValidationError("segmentation must be an array");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new DirectorValidationError(
        `segmentation[${index}] must be an object`
      );
    }

    const { id, title, summary, question } = item;

    if (!isNonEmptyString(id)) {
      throw new DirectorValidationError(
        `segmentation[${index}].id is required`
      );
    }
    if (!isNonEmptyString(title)) {
      throw new DirectorValidationError(
        `segmentation[${index}].title is required`
      );
    }
    if (!isNonEmptyString(summary)) {
      throw new DirectorValidationError(
        `segmentation[${index}].summary is required`
      );
    }
    if (!isNonEmptyString(question)) {
      throw new DirectorValidationError(
        `segmentation[${index}].question is required`
      );
    }

    return {
      id: id.trim(),
      title: title.trim(),
      summary: summary.trim(),
      question: question.trim(),
    } satisfies SceneDraft;
  });
}

function parseSceneAnswerArray(value: unknown): SceneAnswer[] {
  if (!Array.isArray(value)) {
    throw new DirectorValidationError("sceneAnswers must be an array");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new DirectorValidationError(
        `sceneAnswers[${index}] must be an object`
      );
    }

    const { sceneId, answer } = item;

    if (!isNonEmptyString(sceneId)) {
      throw new DirectorValidationError(
        `sceneAnswers[${index}].sceneId is required`
      );
    }

    if (!isNonEmptyString(answer)) {
      throw new DirectorValidationError(
        `sceneAnswers[${index}].answer is required`
      );
    }

    return {
      sceneId: sceneId.trim(),
      answer: answer.trim(),
    } satisfies SceneAnswer;
  });
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

function parseOptionalString(value: unknown, field: string): string {
  if (!isString(value)) {
    throw new DirectorValidationError(`${field} must be a string`);
  }

  return value.trim();
}

function parseStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every(isString)) {
    throw new DirectorValidationError(`${field} must be an array of strings`);
  }

  return value.map((entry) => entry.trim());
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
