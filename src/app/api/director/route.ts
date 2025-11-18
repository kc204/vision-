import { NextResponse } from "next/server";

import * as directorClient from "@/lib/directorClient";
import type { DirectorProviderCredentials } from "@/lib/directorClient";
import type {
  ConversationTurn,
  DirectorRequest,
  ImagePromptPayload,
  VideoPlanPayload,
  LoopSequencePayload,
  DirectorCoreResult,
} from "@/lib/directorTypes";

type UnknownRecord = Record<string, unknown>;

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

type ProviderKeyBundle = {
  geminiApiKey?: string;
};

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

  const validation = validateDirectorRequest(body);

  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const providerKeys = extractProviderKeys(request, body);
  const credentials: DirectorProviderCredentials = {};

  if (providerKeys.geminiApiKey) {
    credentials.gemini = { apiKey: providerKeys.geminiApiKey };
  }

  const requireClientKey = shouldRequireClientApiKey(validation.value.mode);

  if (
    requireClientKey &&
    !hasRequiredProviderKey(validation.value.mode, providerKeys)
  ) {
    return NextResponse.json(
      { error: getMissingKeyMessage(validation.value.mode) },
      { status: 401 }
    );
  }

  try {
    const result = await directorClient.callDirectorCore(
      validation.value,
      credentials
    );
    if (isDirectorCoreError(result)) {
      const status = result.status ?? 502;
      return NextResponse.json(
        {
          success: false,
          mode: validation.value.mode,
          error: result.error,
          provider: result.provider,
          status,
          details: result.details ?? null,
        },
        { status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Director Core invocation failed", error);

    return NextResponse.json(
      { error: "Director Core is not yet available" },
      { status: 500 }
    );
  }
}

function extractProviderKeys(request: Request, body: unknown): ProviderKeyBundle {
  const keys: ProviderKeyBundle = {};

  const geminiHeaderKey = normalizeApiKey(
    getHeaderValue(request, ["x-gemini-api-key"])
  );
  if (geminiHeaderKey) {
    keys.geminiApiKey = geminiHeaderKey;
  }

  const headerKey = normalizeApiKey(
    getHeaderValue(request, ["x-provider-api-key"])
  );
  if (headerKey) {
    assignKey(keys, headerKey);
  }

  if (isRecord(body)) {
    assignProviderKeysFromRecord(keys, body);

    const providerKeys = body.providerKeys;
    if (isRecord(providerKeys)) {
      assignProviderKeysFromRecord(keys, providerKeys);
    }

    const provider = body.provider;
    if (isRecord(provider)) {
      assignProviderKeysFromRecord(keys, provider);
    }

    const generalBodyKey =
      normalizeApiKey(body.providerApiKey) ?? normalizeApiKey(body.apiKey);
    if (generalBodyKey) {
      assignKey(keys, generalBodyKey);
    }
  }

  return keys;
}

function assignProviderKeysFromRecord(
  target: ProviderKeyBundle,
  source: UnknownRecord
) {
  if (!target.geminiApiKey) {
    const geminiKey = findFirstKey(source, [
      "gemini",
      "geminiApiKey",
      "gemini_api_key",
      "google",
      "googleApiKey",
      "google_api_key",
    ]);
    if (geminiKey) {
      target.geminiApiKey = geminiKey;
    }
  }
}

function assignKey(target: ProviderKeyBundle, value: string) {
  if (!target.geminiApiKey) {
    target.geminiApiKey = value;
  }
}

function findFirstKey(
  source: UnknownRecord,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    if (key in source) {
      const value = normalizeApiKey(source[key]);
      if (value) {
        return value;
      }
    }
  }
  return undefined;
}

function normalizeApiKey(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

function shouldRequireClientApiKey(mode: DirectorRequest["mode"]): boolean {
  const explicit = process.env.DIRECTOR_CORE_REQUIRE_API_KEY;
  if (explicit !== undefined) {
    return parseEnvBoolean(explicit);
  }

  return !hasServerCredentialForMode(mode);
}

function hasRequiredProviderKey(
  mode: DirectorRequest["mode"],
  providerKeys: ProviderKeyBundle
): boolean {
  return Boolean(providerKeys.geminiApiKey ?? getServerGeminiApiKey());
}

function hasServerCredentialForMode(mode: DirectorRequest["mode"]): boolean {
  return Boolean(getServerGeminiApiKey());
}

function getMissingKeyMessage(mode: DirectorRequest["mode"]): string {
  return "Provide a Gemini API key via the request or configure GEMINI_API_KEY or GOOGLE_API_KEY.";
}

function getServerGeminiApiKey(): string | undefined {
  return (
    getEnvApiKey(process.env.GEMINI_API_KEY) ??
    getEnvApiKey(process.env.GOOGLE_API_KEY)
  );
}

function getEnvApiKey(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isDirectorCoreError(result: DirectorCoreResult): result is Extract<
  DirectorCoreResult,
  { success: false }
> {
  return result.success === false;
}

function validateDirectorRequest(
  payload: unknown
): ValidationResult<DirectorRequest> {
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

function parseImagePromptPayload(
  value: unknown
): ValidationResult<ImagePromptPayload> {
  if (!isRecord(value)) {
    return { ok: false, error: "payload must be an object" };
  }

  const {
    vision_seed_text,
    model,
    selectedOptions,
    glossary,
    mood_profile = null,
    constraints = null,
    conversation_turns,
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

  const glossaryResult = parseGlossary(glossary);
  if (!glossaryResult.ok) {
    return glossaryResult;
  }

  const payload: ImagePromptPayload = {
    vision_seed_text: vision_seed_text.trim(),
    model,
    selectedOptions: selections.value,
    glossary: glossaryResult.value,
    mood_profile: parseNullableString(mood_profile),
    constraints: parseNullableString(constraints),
    conversation_turns: conversationTurns.value,
  };

  return { ok: true, value: payload };
}

function getHeaderValue(request: Request, names: string[]): string | undefined {
  for (const name of names) {
    const value = request.headers.get(name);
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function parseVideoPlanPayload(
  value: unknown
): ValidationResult<VideoPlanPayload> {
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

function parseLoopSequencePayload(
  value: unknown
): ValidationResult<LoopSequencePayload> {
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

function parseGlossary(
  value: unknown
): ValidationResult<ImagePromptPayload["glossary"]> {
  if (!isRecord(value)) {
    return { ok: false, error: "glossary must be an object" };
  }

  const keys: Array<keyof ImagePromptPayload["glossary"]> = [
    "cameraAngles",
    "shotSizes",
    "composition",
    "cameraMovement",
    "lightingStyles",
    "colorPalettes",
    "atmosphere",
  ];

  const glossary = {} as ImagePromptPayload["glossary"];

  for (const key of keys) {
    const list = value[key];
    if (!Array.isArray(list)) {
      return { ok: false, error: `glossary.${key} must be an array` };
    }

    const entries: ImagePromptPayload["glossary"][typeof key] = [];
    for (const entry of list) {
      const parsed = parseGlossaryOption(entry);
      if (!parsed.ok) {
        return parsed;
      }
      entries.push(parsed.value);
    }

    glossary[key] = entries;
  }

  return { ok: true, value: glossary };
}

function parseGlossaryOption(
  value: unknown
): ValidationResult<ImagePromptPayload["glossary"][keyof ImagePromptPayload["glossary"]][number]> {
  if (!isRecord(value)) {
    return {
      ok: false,
      error: "glossary entries must be objects with id, label, tooltip, and promptSnippet",
    };
  }

  const { id, label, tooltip, promptSnippet } = value as UnknownRecord;

  if (
    !isNonEmptyString(id) ||
    !isNonEmptyString(label) ||
    !isNonEmptyString(tooltip) ||
    !isNonEmptyString(promptSnippet)
  ) {
    return {
      ok: false,
      error: "glossary entries must include id, label, tooltip, and promptSnippet",
    };
  }

  return {
    ok: true,
    value: {
      id: id.trim(),
      label: label.trim(),
      tooltip: tooltip.trim(),
      promptSnippet: promptSnippet.trim(),
    },
  };
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

function parseEnvBoolean(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeErrorDetails(details: unknown): unknown {
  if (details === undefined) {
    return undefined;
  }

  if (
    details === null ||
    typeof details === "string" ||
    typeof details === "number" ||
    typeof details === "boolean"
  ) {
    return details;
  }

  try {
    return structuredClone(details);
  } catch {
    return undefined;
  }
}

function formatSuccessPayload(result: DirectorCoreResult): DirectorCoreResult {
  try {
    return structuredClone(result);
  } catch {
    return result;
  }
}
