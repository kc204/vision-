import { NextResponse } from "next/server";

import { callDirectorCore, DirectorCoreError } from "@/lib/directorClient";
import type {
  DirectorRequest,
  ImagePromptPayload,
  VideoPlanPayload,
  LoopSequencePayload,
  DirectorCoreResult,
} from "@/lib/directorTypes";

type UnknownRecord = Record<string, unknown>;

type ValidationResult =
  | { ok: true; value: DirectorRequest }
  | { ok: false; error: string };

const DIRECTOR_API_KEY_HEADER = "x-director-api-key";
const REQUIRE_DIRECTOR_API_KEY = parseEnvBoolean(
  process.env.DIRECTOR_CORE_REQUIRE_API_KEY
);
const FALLBACK_DIRECTOR_API_KEY = getNonEmptyString(
  process.env.DIRECTOR_CORE_API_KEY
);

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const bodyRecord = isRecord(body) ? (body as UnknownRecord) : null;
  const apiKeyFromBody = bodyRecord ? getNonEmptyString(bodyRecord.apiKey) : undefined;
  const apiKeyFromHeaders = extractApiKeyFromHeaders(request.headers);
  const apiKey = apiKeyFromHeaders ?? apiKeyFromBody ?? FALLBACK_DIRECTOR_API_KEY;

  if (REQUIRE_DIRECTOR_API_KEY && !apiKey) {
    return NextResponse.json(
      { error: "An API key is required to call Director Core." },
      { status: 401 }
    );
  }

  let payloadForValidation: unknown = body;

  if (bodyRecord && "apiKey" in bodyRecord) {
    const cloned: UnknownRecord = { ...bodyRecord };
    delete cloned.apiKey;
    payloadForValidation = cloned;
  }

  const validation = validateDirectorRequest(payloadForValidation);

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  try {
    const result = await callDirectorCore(validation.value);
    if (isDirectorCoreError(result)) {
      const status = result.status ?? 502;
      return NextResponse.json(
        {
          error: result.error,
          provider: result.provider,
          details: result.details ?? null,
        },
        { status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Director Core invocation failed", error);

    if (error instanceof DirectorCoreError) {
      const status = error.status ?? resolveStatusFromCode(error.code);
      const responseBody: UnknownRecord = {
        error: error.message,
        code: error.code,
      };

      const details = sanitizeErrorDetails(error.details);
      if (details !== undefined) {
        responseBody.details = details;
      }

      if (error.fallbackResult) {
        responseBody.fallback = formatSuccessPayload(error.fallbackResult);
      }

      return NextResponse.json(responseBody, {
        status: status ?? 500,
      });
    }

    return NextResponse.json(
      { error: "Director Core is not yet available" },
      { status: 500 }
    );
  }
}

function isDirectorCoreError(result: DirectorCoreResult): result is Extract<
  DirectorCoreResult,
  { success: false }
> {
  return result.success === false;
}

function validateDirectorRequest(payload: unknown): ValidationResult {
  if (!isRecord(payload)) {
    return { ok: false, error: "Body must be an object" };
  }

  const { mode } = payload;
  if (mode !== "image_prompt" && mode !== "video_plan" && mode !== "loop_sequence") {
    return { ok: false, error: "Invalid mode" };
  }

  const images = parseOptionalStringArray(payload.images);

  switch (mode) {
    case "image_prompt": {
      const result = parseImagePromptPayload(payload.payload);
      if (!result.ok) {
        return result;
      }
      const value: DirectorRequest = {
        mode,
        payload: result.value,
        images,
      };
      return { ok: true, value };
    }
    case "video_plan": {
      const result = parseVideoPlanPayload(payload.payload);
      if (!result.ok) {
        return result;
      }
      const value: DirectorRequest = {
        mode,
        payload: result.value,
        images,
      };
      return { ok: true, value };
    }
    case "loop_sequence": {
      const result = parseLoopSequencePayload(payload.payload);
      if (!result.ok) {
        return result;
      }
      const value: DirectorRequest = {
        mode,
        payload: result.value,
        images,
      };
      return { ok: true, value };
    }
    default:
      return { ok: false, error: "Unsupported mode" };
  }
}

function parseImagePromptPayload(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: "payload must be an object" };
  }

  const {
    vision_seed_text,
    model,
    selectedOptions,
    mood_profile = null,
    constraints = null,
  } = value as UnknownRecord;

  if (!isNonEmptyString(vision_seed_text)) {
    return { ok: false, error: "vision_seed_text is required" };
  }

  if (model !== "sdxl" && model !== "flux" && model !== "illustrious") {
    return { ok: false, error: "model must be sdxl, flux, or illustrious" };
  }

  const selections = parseSelections(selectedOptions);
  if (!selections.ok) {
    return selections;
  }

  const payload: ImagePromptPayload = {
    vision_seed_text: vision_seed_text.trim(),
    model,
    selectedOptions: selections.value,
    mood_profile: parseNullableString(mood_profile),
    constraints: parseNullableString(constraints),
  };

  return { ok: true, value: payload };
}

function parseVideoPlanPayload(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: "payload must be an object" };
  }

  const {
    vision_seed_text,
    script_text,
    tone,
    visual_style,
    aspect_ratio,
    mood_profile = null,
    cinematic_control_options,
  } = value as UnknownRecord;

  if (!isNonEmptyString(vision_seed_text)) {
    return { ok: false, error: "vision_seed_text is required" };
  }

  if (!isNonEmptyString(script_text)) {
    return { ok: false, error: "script_text is required" };
  }

  const validTones: VideoPlanPayload["tone"][] = [
    "informative",
    "hype",
    "calm",
    "dark",
    "inspirational",
  ];

  if (!validTones.includes(tone as VideoPlanPayload["tone"])) {
    return { ok: false, error: "tone is invalid" };
  }

  const validStyles: VideoPlanPayload["visual_style"][] = [
    "realistic",
    "stylized",
    "anime",
    "mixed-media",
  ];

  if (!validStyles.includes(visual_style as VideoPlanPayload["visual_style"])) {
    return { ok: false, error: "visual_style is invalid" };
  }

  const validAspectRatios: VideoPlanPayload["aspect_ratio"][] = ["16:9", "9:16"];
  if (!validAspectRatios.includes(aspect_ratio as VideoPlanPayload["aspect_ratio"])) {
    return { ok: false, error: "aspect_ratio is invalid" };
  }

  const cinematicControls = parseCinematicControlSelections(
    cinematic_control_options
  );
  if (!cinematicControls.ok) {
    return cinematicControls;
  }

  const payload: VideoPlanPayload = {
    vision_seed_text: vision_seed_text.trim(),
    script_text: script_text.trim(),
    tone: tone as VideoPlanPayload["tone"],
    visual_style: visual_style as VideoPlanPayload["visual_style"],
    aspect_ratio: aspect_ratio as VideoPlanPayload["aspect_ratio"],
    mood_profile: parseNullableString(mood_profile),
    cinematic_control_options: cinematicControls.value,
  };

  return { ok: true, value: payload };
}

function parseLoopSequencePayload(value: unknown): ValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: "payload must be an object" };
  }

  const {
    vision_seed_text,
    start_frame_description,
    loop_length = null,
    mood_profile = null,
    cameraAngles: cameraAnglesRaw,
    shotSizes: shotSizesRaw,
    composition: compositionRaw,
    cameraMovement: cameraMovementRaw,
    lightingStyles: lightingStylesRaw,
    colorPalettes: colorPalettesRaw,
    atmosphere: atmosphereRaw,
  } = value as UnknownRecord;

  if (!isNonEmptyString(vision_seed_text)) {
    return { ok: false, error: "vision_seed_text is required" };
  }

  if (!isNonEmptyString(start_frame_description)) {
    return { ok: false, error: "start_frame_description is required" };
  }

  let parsedLoopLength: number | null = null;
  if (loop_length !== null && loop_length !== undefined) {
    if (!isFiniteNumber(loop_length)) {
      return { ok: false, error: "loop_length must be a number" };
    }
    parsedLoopLength = Number(loop_length);
  }

  const payload: LoopSequencePayload = {
    vision_seed_text: vision_seed_text.trim(),
    start_frame_description: start_frame_description.trim(),
    loop_length: parsedLoopLength,
    mood_profile: parseNullableString(mood_profile),
  };

  const cameraAngles = parseOptionalStringArray(cameraAnglesRaw);
  if (cameraAngles && cameraAngles.length > 0) {
    payload.cameraAngles = cameraAngles;
  }

  const shotSizes = parseOptionalStringArray(shotSizesRaw);
  if (shotSizes && shotSizes.length > 0) {
    payload.shotSizes = shotSizes;
  }

  const composition = parseOptionalStringArray(compositionRaw);
  if (composition && composition.length > 0) {
    payload.composition = composition;
  }

  const cameraMovement = parseOptionalStringArray(cameraMovementRaw);
  if (cameraMovement && cameraMovement.length > 0) {
    payload.cameraMovement = cameraMovement;
  }

  const lightingStyles = parseOptionalStringArray(lightingStylesRaw);
  if (lightingStyles && lightingStyles.length > 0) {
    payload.lightingStyles = lightingStyles;
  }

  const colorPalettes = parseOptionalStringArray(colorPalettesRaw);
  if (colorPalettes && colorPalettes.length > 0) {
    payload.colorPalettes = colorPalettes;
  }

  const atmosphere = parseOptionalStringArray(atmosphereRaw);
  if (atmosphere && atmosphere.length > 0) {
    payload.atmosphere = atmosphere;
  }

  return { ok: true, value: payload };
}

function parseSelections(value: unknown):
  | { ok: true; value: ImagePromptPayload["selectedOptions"] }
  | { ok: false; error: string } {
  if (!isRecord(value)) {
    return { ok: false, error: "selectedOptions must be an object" };
  }

  const keys: Array<keyof ImagePromptPayload["selectedOptions"]> = [
    "cameraAngles",
    "shotSizes",
    "composition",
    "cameraMovement",
    "lightingStyles",
    "colorPalettes",
    "atmosphere",
  ];

  const selections: ImagePromptPayload["selectedOptions"] = {
    cameraAngles: [],
    shotSizes: [],
    composition: [],
    cameraMovement: [],
    lightingStyles: [],
    colorPalettes: [],
    atmosphere: [],
  };

  for (const key of keys) {
    const list = parseOptionalStringArray(value[key]);
    if (list) {
      selections[key] = list;
    }
  }

  return { ok: true, value: selections };
}

function parseCinematicControlSelections(value: unknown):
  | { ok: true; value: VideoPlanPayload["cinematic_control_options"] }
  | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "cinematic_control_options must be an object" };
  }

  const keys: Array<
    keyof NonNullable<VideoPlanPayload["cinematic_control_options"]>
  > = [
    "cameraAngles",
    "shotSizes",
    "composition",
    "cameraMovement",
    "lightingStyles",
    "colorPalettes",
    "atmosphere",
  ];

  const selections: NonNullable<VideoPlanPayload["cinematic_control_options"]> = {};

  for (const key of keys) {
    const list = parseOptionalStringArray(value[key]);
    if (list && list.length > 0) {
      selections[key] = list;
    }
  }

  return {
    ok: true,
    value: Object.keys(selections).length ? selections : undefined,
  };
}

function parseOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const filtered = value.filter((item): item is string => typeof item === "string");
  return filtered.map((item) => item.trim()).filter(Boolean);
}

function parseNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
