import { NextResponse } from "next/server";

import { callDirectorCore } from "@/lib/directorClient";
import type {
  DirectorRequest,
  ImagePromptPayload,
  VideoPlanPayload,
  LoopSequencePayload,
} from "@/lib/directorTypes";
import type { VisualOption } from "@/lib/visualOptions";

type UnknownRecord = Record<string, unknown>;

type ValidationResult =
  | { ok: true; value: DirectorRequest }
  | { ok: false; error: string };

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

  try {
    const text = await callDirectorCore(validation.value);
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Director Core invocation failed", error);
    return NextResponse.json(
      { error: "Director Core is not yet available" },
      { status: 500 }
    );
  }
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
    glossary,
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

  const parsedGlossary = parseGlossary(glossary);
  if (!parsedGlossary.ok) {
    return parsedGlossary;
  }

  const payload: ImagePromptPayload = {
    vision_seed_text: vision_seed_text.trim(),
    model,
    selectedOptions: selections.value,
    glossary: parsedGlossary.value,
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
    lighting_and_composition_options,
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

  let lighting_and_composition: VideoPlanPayload["lighting_and_composition_options"] | undefined;

  if (lighting_and_composition_options !== undefined) {
    if (!isRecord(lighting_and_composition_options)) {
      return { ok: false, error: "lighting_and_composition_options must be an object" };
    }

    const lightingStyles = parseOptionalStringArray(
      lighting_and_composition_options.lightingStyles
    );
    const composition = parseOptionalStringArray(
      lighting_and_composition_options.composition
    );

    lighting_and_composition = {};

    if (lightingStyles) {
      lighting_and_composition.lightingStyles = lightingStyles;
    }

    if (composition) {
      lighting_and_composition.composition = composition;
    }
  }

  const payload: VideoPlanPayload = {
    vision_seed_text: vision_seed_text.trim(),
    script_text: script_text.trim(),
    tone: tone as VideoPlanPayload["tone"],
    visual_style: visual_style as VideoPlanPayload["visual_style"],
    aspect_ratio: aspect_ratio as VideoPlanPayload["aspect_ratio"],
    mood_profile: parseNullableString(mood_profile),
    lighting_and_composition_options: lighting_and_composition,
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

function parseGlossary(value: unknown):
  | { ok: true; value: ImagePromptPayload["glossary"] }
  | { ok: false; error: string } {
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

  const glossary: ImagePromptPayload["glossary"] = {
    cameraAngles: [],
    shotSizes: [],
    composition: [],
    cameraMovement: [],
    lightingStyles: [],
    colorPalettes: [],
    atmosphere: [],
  };

  for (const key of keys) {
    const list = parseVisualOptionArray(value[key]);
    if (!list.ok) {
      return list;
    }
    glossary[key] = list.value;
  }

  return { ok: true, value: glossary };
}

function parseVisualOptionArray(value: unknown):
  | { ok: true; value: VisualOption[] }
  | { ok: false; error: string } {
  if (!Array.isArray(value)) {
    return { ok: false, error: "glossary entries must be arrays of visual options" };
  }

  const options: VisualOption[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return { ok: false, error: "Each glossary option must be an object" };
    }

    const { id, label, tooltip, promptSnippet, group, keywords } =
      item as UnknownRecord;

    if (!isNonEmptyString(id)) {
      return { ok: false, error: "glossary option id must be a string" };
    }

    if (!isNonEmptyString(label)) {
      return { ok: false, error: "glossary option label must be a string" };
    }

    if (!isNonEmptyString(tooltip)) {
      return { ok: false, error: "glossary option tooltip must be a string" };
    }

    if (!isNonEmptyString(promptSnippet)) {
      return { ok: false, error: "glossary option promptSnippet must be a string" };
    }

    let parsedGroup: string | undefined;
    if (group !== undefined && group !== null) {
      if (typeof group !== "string") {
        return { ok: false, error: "glossary option group must be a string" };
      }
      parsedGroup = group.trim() || undefined;
    }

    let parsedKeywords: string[] | undefined;
    if (keywords !== undefined && keywords !== null) {
      if (!Array.isArray(keywords)) {
        return { ok: false, error: "glossary option keywords must be an array" };
      }

      if (!keywords.every((keyword) => typeof keyword === "string")) {
        return {
          ok: false,
          error: "glossary option keywords must all be strings",
        };
      }

      const validKeywords = keywords
        .map((keyword: string) => keyword.trim())
        .filter(Boolean);

      if (validKeywords.length > 0) {
        parsedKeywords = validKeywords;
      }
    }

    const option: VisualOption = {
      id: id.trim(),
      label: label.trim(),
      tooltip: tooltip.trim(),
      promptSnippet: promptSnippet.trim(),
    };

    if (parsedGroup) {
      option.group = parsedGroup;
    }

    if (parsedKeywords) {
      option.keywords = parsedKeywords;
    }

    options.push(option);
  }

  return { ok: true, value: options };
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
  return Boolean(value) && typeof value === "object";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
