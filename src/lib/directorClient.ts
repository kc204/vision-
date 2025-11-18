import {
  assertNoLatestAliases,
  enforceAllowedGeminiModels,
  parseModelList,
} from "./googleModels";
import { DIRECTOR_CORE_SYSTEM_PROMPT } from "./prompts/directorCore";
import { logGenerativeClientTarget, resolveGeminiApiBaseUrl } from "./geminiApiUrl";
import type {
  DirectorCoreResult,
  DirectorCoreSuccess,
  DirectorMediaAsset,
  DirectorMediaAssetFrame,
  DirectorRequest,
  DirectorSuccessResponse,
  GeneratedImage,
  GeneratedVideo,
  LoopSequenceResult,
  VideoPlanPayload,
} from "./directorTypes";

const GEMINI_API_URL = resolveGeminiApiBaseUrl(process.env.GEMINI_API_URL);
const VEO_API_URL = resolveGeminiApiBaseUrl(process.env.VEO_API_URL ?? GEMINI_API_URL);
const NANO_BANANA_API_URL =
  process.env.NANO_BANANA_API_URL ?? "https://api.nanobanana.com/v1";

const DEFAULT_GEMINI_IMAGE_MODELS = ["gemini-2.5-flash"] as const;
const RAW_GEMINI_IMAGE_MODELS = parseModelList(
  process.env.GEMINI_IMAGE_MODELS ?? process.env.GEMINI_IMAGE_MODEL,
  [...DEFAULT_GEMINI_IMAGE_MODELS]
);

type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

type VeoMediaAttachment = {
  type: "IMAGE" | "VIDEO";
  mime_type?: string;
  data?: string;
  url?: string;
};

type VeoPromptPayload = {
  prompt: string;
  script: { input: string };
  aspect_ratio?: string;
  tone?: string;
  visual_style?: string;
  mood_profile?: string | null;
  planner_context?: string;
  cinematic_control_options?: Record<string, unknown>;
  media?: VeoMediaAttachment[];
  system_prompt?: string;
};

type VeoPredictRequest = { prompt: VeoPromptPayload };

assertNoLatestAliases(RAW_GEMINI_IMAGE_MODELS, {
  context: "image",
  envVar: "GEMINI_IMAGE_MODELS",
});

const GEMINI_IMAGE_MODELS = enforceAllowedGeminiModels(
  RAW_GEMINI_IMAGE_MODELS,
  {
    fallback: DEFAULT_GEMINI_IMAGE_MODELS,
    context: "image",
    envVar: "GEMINI_IMAGE_MODELS",
  }
);
const VEO_VIDEO_MODELS = parseModelList(
  process.env.VEO_VIDEO_MODELS ?? process.env.VEO_VIDEO_MODEL,
  ["veo-3.1-generate-preview"]
);

let geminiImageClientLogged = false;
let veoClientLogged = false;

export type DirectorProviderCredentials = {
  gemini?: {
    apiKey: string;
  };
  veo?: {
    apiKey: string;
  };
  nanoBanana?: {
    apiKey?: string;
  };
};

export async function callDirectorCore(
  req: DirectorRequest,
  credentials?: DirectorProviderCredentials
): Promise<DirectorCoreResult> {
  try {
    switch (req.mode) {
      case "image_prompt":
        return await callGeminiImageProvider(req, credentials);
      case "video_plan":
        return await callVeoVideoProvider(req, credentials);
      case "loop_sequence":
        return await callNanoBananaProvider(req, credentials);
      default:
        return {
          success: false,
          error: `Unsupported director mode: ${(req as { mode?: unknown }).mode}`,
        };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error while calling Director Core.";
    return { success: false, error: message };
  }
}

async function callGeminiImageProvider(
  req: Extract<DirectorRequest, { mode: "image_prompt" }>,
  credentials?: DirectorProviderCredentials
): Promise<DirectorCoreResult> {
  const apiKey = credentials?.gemini?.apiKey ?? getServerGeminiApiKey();

  if (!apiKey) {
    return {
      success: false,
      provider: "gemini",
      error:
        "Missing credentials for Gemini image generation. Provide an API key or configure GEMINI_API_KEY or GOOGLE_API_KEY.",
      status: 401,
    };
  }

  const model = GEMINI_IMAGE_MODELS[0];
  if (!model) {
    return {
      success: false,
      provider: "gemini",
      error: "No Gemini image model is configured.",
      status: 500,
    };
  }

  logGeminiImageClientConfiguration(model);

  const endpoint = `${GEMINI_API_URL}/models/${encodeURIComponent(model)}:generateContent`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;

  const parts = buildUserParts(req.payload, req.images);
  const payload = {
    system_instruction: {
      role: "system",
      parts: [{ text: DIRECTOR_CORE_SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: "user" as const,
        parts,
      },
    ],
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach Gemini image provider.";
    return {
      success: false,
      provider: "gemini",
      error: `Gemini request failed to send: ${message}`,
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    return {
      success: false,
      provider: "gemini",
      status: response.status,
      error: `Gemini responded with invalid JSON: ${message}`,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      provider: "gemini",
      status: response.status,
      error: extractErrorMessage(data, "Gemini image request failed."),
      details: data,
    };
  }

  const { images, promptText, metadata } = parseGeminiImageResponse(data);
  const hasPromptText = typeof promptText === "string" && promptText.trim().length > 0;
  const hasMetadata = metadata !== undefined;

  if (images.length === 0 && !hasPromptText && !hasMetadata) {
    return {
      success: false,
      provider: "gemini",
      status: response.status,
      error: "Gemini did not return any image data in the response.",
      details: data,
    };
  }

  return {
    success: true,
    mode: "image_prompt",
    provider: "gemini",
    images,
    promptText,
    metadata,
  };
}

async function callVeoVideoProvider(
  req: Extract<DirectorRequest, { mode: "video_plan" }>,
  credentials?: DirectorProviderCredentials
): Promise<DirectorCoreResult> {
  const apiKey = credentials?.veo?.apiKey ?? getServerVeoApiKey();

  if (!apiKey) {
    return {
      success: false,
      provider: "veo",
      error:
        "Missing credentials for Veo video planning. Provide an API key or configure VEO_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY.",
      status: 401,
    };
  }

  const model = VEO_VIDEO_MODELS[0];
  const modelValidationError = validateVeoModel(model);
  if (modelValidationError) {
    return {
      success: false,
      provider: model ?? "veo",
      error: modelValidationError,
      status: 500,
    };
  }

  logVeoClientConfiguration({ model, baseUrl: VEO_API_URL });

  const endpoint = `${VEO_API_URL}/models/${encodeURIComponent(model)}:predictLongRunning`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;

  const requestPayload = buildVeoVideoRequestPayload(req.payload, req.images);
  if (!requestPayload.ok) {
    return {
      success: false,
      provider: model,
      status: 400,
      error: requestPayload.error,
    };
  }

  const payload = {
    prompt: {
      ...requestPayload.value.prompt,
      system_prompt: DIRECTOR_CORE_SYSTEM_PROMPT,
    },
  } satisfies VeoPredictRequest;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reach Veo provider.";
    return {
      success: false,
      provider: model,
      error: `Veo request failed to send: ${message}`,
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    return {
      success: false,
      provider: model,
      status: response.status,
      error: `Veo responded with invalid JSON: ${message}`,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      provider: model,
      status: response.status,
      error: extractErrorMessage(data, "Veo video request failed."),
      details: data,
    };
  }

  const operationName = extractOperationName(data);
  if (!operationName) {
    return {
      success: false,
      provider: model,
      status: response.status,
      error:
        "Veo did not return a long-running operation name. Check the configured model and endpoint.",
      details: data,
    };
  }

  const operationResult = await pollVeoVideoOperation(operationName, apiKey, model);
  if (!operationResult.success) {
    return operationResult.result;
  }

  const validatedResponse = validateVeoResponse(
    operationResult.payload,
    model,
    operationResult.status
  );
  if (!validatedResponse.ok) {
    return validatedResponse.result;
  }

  const { videos, storyboard, metadata } = parseVeoVideoResponse(
    validatedResponse.payload
  );

  const hasStoryboardPlan = hasStructuredPlan(storyboard);
  const hasMetadataPlan = metadataHasStructuredPlan(metadata);

  if (videos.length === 0 && !hasStoryboardPlan && !hasMetadataPlan) {
    return {
      success: false,
      provider: model,
      status: operationResult.status,
      error: "Veo did not return any video outputs or storyboard plan in the response.",
      details: operationResult.payload,
    };
  }

  return {
    success: true,
    mode: "video_plan",
    provider: model,
    videos,
    storyboard,
    metadata,
  };
}

async function callNanoBananaProvider(
  req: Extract<DirectorRequest, { mode: "loop_sequence" }>,
  credentials?: DirectorProviderCredentials
): Promise<DirectorCoreResult> {
  const apiKey =
    credentials?.nanoBanana?.apiKey ?? getNonEmptyString(process.env.NANO_BANANA_API_KEY);
  if (!apiKey) {
    return {
      success: false,
      provider: "nano-banana",
      error:
        "Missing API key for Nano Banana loops. Provide a key in the request or set NANO_BANANA_API_KEY.",
      status: 401,
    };
  }

  const urlBase = NANO_BANANA_API_URL.replace(/\/$/, "");
  const url = `${urlBase}/loop-sequences:generate`;

  const payload = {
    system_prompt: DIRECTOR_CORE_SYSTEM_PROMPT,
    request: {
      ...req.payload,
      mode: req.mode,
      images: req.images ?? [],
    },
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach Nano Banana provider.";
    return {
      success: false,
      provider: "nano-banana",
      error: `Nano Banana request failed to send: ${message}`,
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    return {
      success: false,
      provider: "nano-banana",
      status: response.status,
      error: `Nano Banana responded with invalid JSON: ${message}`,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      provider: "nano-banana",
      status: response.status,
      error: extractErrorMessage(data, "Nano Banana loop request failed."),
      details: data,
    };
  }

  const loop = parseNanoBananaResponse(data);

  if (loop.frames.length === 0) {
    return {
      success: false,
      provider: "nano-banana",
      status: response.status,
      error: "Nano Banana did not return any frames for the loop sequence.",
      details: data,
    };
  }

  return {
    success: true,
    mode: "loop_sequence",
    provider: "nano-banana",
    loop,
  };
}

function buildUserParts(payload: unknown, images: string[] | undefined) {
  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
    | { fileData: { fileUri: string; mimeType?: string } }
  > = [
    {
      text: JSON.stringify({ mode: "image_prompt", payload }),
    },
  ];

  for (const part of buildImageParts(images)) {
    parts.push(part);
  }

  return parts;
}

export function buildVeoVideoRequestPayload(
  payload: VideoPlanPayload,
  images?: string[]
): ValidationResult<VeoPredictRequest> {
  const {
    vision_seed_text,
    script_text,
    tone,
    visual_style,
    aspect_ratio,
    mood_profile,
    planner_context,
    cinematic_control_options,
  } = payload;

  if (!isNonEmptyString(vision_seed_text)) {
    return { ok: false, error: "vision_seed_text is required for Veo video generation." };
  }

  if (!isNonEmptyString(script_text)) {
    return { ok: false, error: "script_text is required for Veo video generation." };
  }

  const media = buildVeoMediaAttachments(images);

  const veoPrompt: VeoPromptPayload = {
    prompt: vision_seed_text.trim(),
    script: { input: script_text.trim() },
  };

  if (isNonEmptyString(tone)) {
    veoPrompt.tone = tone.trim();
  }

  if (isNonEmptyString(visual_style)) {
    veoPrompt.visual_style = visual_style.trim();
  }

  if (isNonEmptyString(aspect_ratio)) {
    veoPrompt.aspect_ratio = aspect_ratio.trim();
  }

  if (typeof mood_profile === "string") {
    veoPrompt.mood_profile = mood_profile.trim().length ? mood_profile.trim() : null;
  }

  if (typeof planner_context === "string" && planner_context.trim().length) {
    veoPrompt.planner_context = planner_context.trim();
  }

  if (isRecord(cinematic_control_options)) {
    veoPrompt.cinematic_control_options = cinematic_control_options as Record<string, unknown>;
  }

  if (media.length) {
    veoPrompt.media = media;
  }

  return { ok: true, value: { prompt: veoPrompt } };
}

function buildVeoMediaAttachments(images?: string[]): VeoMediaAttachment[] {
  const media: VeoMediaAttachment[] = [];

  if (!images) {
    return media;
  }

  for (const image of images) {
    if (typeof image !== "string" || image.trim().length === 0) {
      continue;
    }

    const inlineData = parseDataUrl(image);
    if (inlineData) {
      media.push({ type: "IMAGE", data: inlineData.data, mime_type: inlineData.mimeType });
      continue;
    }

    if (isLikelyUrl(image)) {
      media.push({ type: "IMAGE", url: image });
      continue;
    }

    media.push({ type: "IMAGE", data: image, mime_type: "image/png" });
  }

  return media;
}

function buildImageParts(images: string[] | undefined) {
  const parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { fileData: { fileUri: string; mimeType?: string } }
  > = [];

  if (!images) {
    return parts;
  }

  for (const image of images) {
    if (typeof image !== "string" || image.length === 0) {
      continue;
    }

    const inlineData = parseDataUrl(image);
    if (inlineData) {
      parts.push({ inlineData });
      continue;
    }

    if (isLikelyUrl(image)) {
      parts.push({ fileData: { fileUri: image } });
      continue;
    }

    parts.push({ inlineData: { mimeType: "image/png", data: image } });
  }

  return parts;
}

function parseGeminiImageResponse(data: unknown): {
  images: GeneratedImage[];
  promptText?: string;
  metadata?: Record<string, unknown>;
} {
  const images: GeneratedImage[] = [];
  const textChunks: string[] = [];
  let metadata: Record<string, unknown> | undefined;

  if (isRecord(data)) {
    metadata = extractMetadata(data);

    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    for (const candidate of candidates) {
      if (!isRecord(candidate)) {
        continue;
      }
      const content = candidate.content;
      if (isRecord(content) && Array.isArray(content.parts)) {
        collectParts(content.parts, images, textChunks);
      }
      if (Array.isArray(candidate.output)) {
        collectParts(candidate.output, images, textChunks);
      }
    }

    const generatedImages = (data as { generated_images?: unknown }).generated_images;
    if (Array.isArray(generatedImages)) {
      for (const item of generatedImages) {
        if (isRecord(item) && isRecord(item.image) && typeof item.image.data === "string") {
          const mimeType =
            typeof item.image.mime_type === "string" ? item.image.mime_type : "image/png";
          images.push({ mimeType, data: item.image.data });
        }
      }
    }
  }

  return {
    images,
    promptText: textChunks.length ? textChunks.join("\n").trim() : undefined,
    metadata,
  };
}

function validateVeoResponse(
  payload: unknown,
  provider: string,
  status?: number
):
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; result: DirectorCoreResult } {
  if (!isRecord(payload)) {
    return {
      ok: false,
      result: {
        success: false,
        provider,
        status,
        error: "Veo returned an unexpected response payload.",
        details: payload,
      },
    };
  }

  const recordPayload = payload as Record<string, unknown>;
  const hasCandidates = Array.isArray(recordPayload.candidates);
  const hasGeneratedVideos = Array.isArray(
    (recordPayload as { generated_videos?: unknown }).generated_videos
  );

  if (!hasCandidates && !hasGeneratedVideos) {
    return {
      ok: false,
      result: {
        success: false,
        provider,
        status,
        error: "Veo response is missing generated_videos or candidates data.",
        details: payload,
      },
    };
  }

  return { ok: true, payload: recordPayload };
}

function parseVeoVideoResponse(data: unknown): {
  videos: GeneratedVideo[];
  storyboard?: unknown;
  metadata?: Record<string, unknown>;
} {
  const videos: GeneratedVideo[] = [];
  let storyboard: unknown;
  let metadata: Record<string, unknown> | undefined;

  if (isRecord(data)) {
    metadata = extractMetadata(data);
    if (Array.isArray(data.candidates)) {
      for (const candidate of data.candidates) {
        if (!isRecord(candidate)) {
          continue;
        }

        if (candidate.storyboard && storyboard === undefined) {
          storyboard = candidate.storyboard;
        }

        const content = candidate.content;
        if (isRecord(content) && Array.isArray(content.parts)) {
          collectVideoParts(content.parts, videos);
        }
      }
    }

    if (Array.isArray(data.generated_videos)) {
      for (const video of data.generated_videos) {
        if (!isRecord(video)) {
          continue;
        }
        const url = typeof video.url === "string" ? video.url : undefined;
        const mimeType = typeof video.mime_type === "string" ? video.mime_type : undefined;
        const base64 = typeof video.base64 === "string" ? video.base64 : undefined;
        const posterImage = typeof video.poster_image === "string" ? video.poster_image : undefined;
        const durationSeconds =
          typeof video.duration_seconds === "number" ? video.duration_seconds : undefined;
        const frameRate = typeof video.frame_rate === "number" ? video.frame_rate : undefined;
        const frames = Array.isArray(video.frames)
          ? video.frames.filter((entry): entry is string => typeof entry === "string")
          : undefined;
        videos.push({ url, mimeType, base64, posterImage, durationSeconds, frameRate, frames });
      }
    }
  }

  return { videos, storyboard, metadata };
}

function hasStructuredPlan(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (isRecord(value)) {
    return Object.keys(value).length > 0;
  }

  return false;
}

function metadataHasStructuredPlan(
  metadata: Record<string, unknown> | undefined
): boolean {
  if (!metadata) {
    return false;
  }

  const planKeys = [
    "storyboard",
    "plan",
    "plan_json",
    "planJson",
    "videoPlan",
    "video_plan",
    "response",
    "text",
  ];

  return planKeys.some((key) => hasStructuredPlan(metadata[key]));
}

function parseNanoBananaResponse(data: unknown): LoopSequenceResult {
  const frames: GeneratedImage[] = [];
  let loopLength: number | null | undefined;
  let frameRate: number | undefined;
  let metadata: Record<string, unknown> | undefined;

  if (isRecord(data)) {
    const responseFrames = Array.isArray(data.frames)
      ? data.frames
      : Array.isArray(data.generated_frames)
      ? data.generated_frames
      : [];

    for (const frame of responseFrames) {
      if (!isRecord(frame)) {
        if (typeof frame === "string") {
          frames.push({ mimeType: "image/png", data: frame });
        }
        continue;
      }

      if (typeof frame.data === "string") {
        const mimeType = typeof frame.mime_type === "string" ? frame.mime_type : "image/png";
        frames.push({ mimeType, data: frame.data });
      } else if (typeof frame.base64 === "string") {
        const mimeType = typeof frame.mime_type === "string" ? frame.mime_type : "image/png";
        frames.push({ mimeType, data: frame.base64 });
      } else if (typeof frame.url === "string") {
        frames.push({ mimeType: "image/url", data: frame.url });
      }
    }

    if (typeof data.loop_length === "number") {
      loopLength = data.loop_length;
    } else if (typeof data.loopLength === "number") {
      loopLength = data.loopLength;
    }

    if (typeof data.frame_rate === "number") {
      frameRate = data.frame_rate;
    } else if (typeof data.fps === "number") {
      frameRate = data.fps;
    }

    metadata = extractMetadata(data);
  }

  return { frames, loopLength, frameRate, metadata };
}

function collectParts(
  parts: unknown[],
  images: GeneratedImage[],
  textChunks: string[]
): void {
  for (const part of parts) {
    if (!isRecord(part)) {
      continue;
    }
    if (isRecord(part.inlineData) && typeof part.inlineData.data === "string") {
      const mimeType =
        typeof part.inlineData.mimeType === "string" ? part.inlineData.mimeType : "image/png";
      images.push({ mimeType, data: part.inlineData.data });
      continue;
    }
    if (typeof part.text === "string") {
      textChunks.push(part.text);
      continue;
    }
    if (isRecord(part.fileData) && typeof part.fileData.fileUri === "string") {
      const mimeType =
        typeof part.fileData.mimeType === "string" ? part.fileData.mimeType : "application/octet-stream";
      images.push({ mimeType, data: part.fileData.fileUri });
    }
  }
}

function collectVideoParts(parts: unknown[], videos: GeneratedVideo[]): void {
  for (const part of parts) {
    if (!isRecord(part)) {
      continue;
    }
    if (isRecord(part.inlineData) && typeof part.inlineData.data === "string") {
      const mimeType =
        typeof part.inlineData.mimeType === "string"
          ? part.inlineData.mimeType
          : "video/mp4";
      videos.push({ mimeType, base64: part.inlineData.data });
      continue;
    }
    if (isRecord(part.fileData) && typeof part.fileData.fileUri === "string") {
      const mimeType =
        typeof part.fileData.mimeType === "string" ? part.fileData.mimeType : undefined;
      videos.push({ url: part.fileData.fileUri, mimeType });
      continue;
    }
    if (typeof part.text === "string") {
      try {
        const parsed = JSON.parse(part.text);
        if (isRecord(parsed) && typeof parsed.url === "string") {
          const mimeType = typeof parsed.mimeType === "string" ? parsed.mimeType : undefined;
          const durationSeconds =
            typeof parsed.durationSeconds === "number" ? parsed.durationSeconds : undefined;
          const frameRate = typeof parsed.frameRate === "number" ? parsed.frameRate : undefined;
          const frames = Array.isArray(parsed.frames)
            ? parsed.frames.filter((entry: unknown): entry is string => typeof entry === "string")
            : undefined;
          videos.push({ url: parsed.url, mimeType, durationSeconds, frameRate, frames });
        }
      } catch {
        // Ignore unstructured text
      }
    }
  }
}

function extractMetadata(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const { candidates, generated_images, generated_videos, ...rest } = data;
  const metadataEntries = Object.entries(rest).filter(([_, value]) => value !== undefined);
  return metadataEntries.length ? Object.fromEntries(metadataEntries) : undefined;
}

function parseDataUrl(value: string): { mimeType: string; data: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(value);
  if (!match) {
    return null;
  }
  const [, mimeType, data] = match;
  return { mimeType, data };
}

function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getServerGeminiApiKey(): string | undefined {
  return (
    getNonEmptyString(process.env.GEMINI_API_KEY) ??
    getNonEmptyString(process.env.GOOGLE_API_KEY)
  );
}

function getServerVeoApiKey(): string | undefined {
  return (
    getNonEmptyString(process.env.VEO_API_KEY) ?? getServerGeminiApiKey()
  );
}

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function logGeminiImageClientConfiguration(model: string) {
  if (geminiImageClientLogged) {
    return;
  }

  geminiImageClientLogged = true;
  logGenerativeClientTarget({
    provider: "Gemini",
    context: "director image",
    baseUrl: GEMINI_API_URL,
    model,
  });
}

function logVeoClientConfiguration({
  model,
  baseUrl,
}: {
  model: string;
  baseUrl: string;
}) {
  if (veoClientLogged) {
    return;
  }

  veoClientLogged = true;
  logGenerativeClientTarget({
    provider: "Veo",
    context: "director video",
    baseUrl,
    model,
  });
}

function validateVeoModel(model: string | undefined): string | null {
  if (!model) {
    return "No Veo model is configured.";
  }

  if (!/^veo-[\w.-]*generate/i.test(model)) {
    return `Veo model "${model}" is not valid for long-running video generation. Use a model ending in "-generate-preview" (e.g., "veo-3.1-generate-preview").`;
  }

  return null;
}

function extractOperationName(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.name === "string") {
    return payload.name;
  }

  if (isRecord(payload.operation) && typeof payload.operation.name === "string") {
    return payload.operation.name;
  }

  return null;
}

async function pollVeoVideoOperation(
  operationName: string,
  apiKey: string,
  provider: string
): Promise<
  | { success: true; payload: unknown; status?: number }
  | { success: false; result: DirectorCoreResult }
> {
  const operationUrl = buildVeoOperationUrl(operationName, apiKey);
  const maxAttempts = 30;
  const pollIntervalMs = 1000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(operationUrl, { method: "GET" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reach Veo operation endpoint.";
      return {
        success: false,
        result: {
          success: false,
          provider,
          error: `Veo operation request failed to send: ${message}`,
        },
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown parse error.";
      return {
        success: false,
        result: {
          success: false,
          provider,
          status: response.status,
          error: `Veo operation responded with invalid JSON: ${message}`,
        },
      };
    }

    if (!response.ok) {
      return {
        success: false,
        result: {
          success: false,
          provider,
          status: response.status,
          error: extractErrorMessage(payload, "Veo video operation request failed."),
          details: payload,
        },
      };
    }

    if (isRecord(payload) && payload.done) {
      if (payload.error) {
        return {
          success: false,
          result: {
            success: false,
            provider,
            status: response.status,
            error: extractErrorMessage(payload, "Veo video operation failed."),
            details: payload,
          },
        };
      }

      const responsePayload = extractOperationPayload(payload);
      return { success: true, payload: responsePayload, status: response.status };
    }

    await delay(pollIntervalMs);
  }

  return {
    success: false,
    result: {
      success: false,
      provider,
      error: "Timed out waiting for Veo video generation to finish.",
    },
  };
}

function buildVeoOperationUrl(operationName: string, apiKey: string): string {
  const normalizedBase = VEO_API_URL.replace(/\/+$/, "");
  const normalizedName = operationName.replace(/^\/+/, "");
  const baseUrl = operationName.startsWith("http")
    ? operationName.replace(/\/+$/, "")
    : `${normalizedBase}/${normalizedName}`;
  const delimiter = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${delimiter}key=${encodeURIComponent(apiKey)}`;
}

function extractOperationPayload(payload: Record<string, unknown>): unknown {
  if (payload.response !== undefined) {
    return payload.response;
  }

  if (isRecord(payload.result)) {
    return payload.result;
  }

  return payload;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (isRecord(payload)) {
    const error = payload.error;
    if (typeof error === "string") {
      return error;
    }
    if (isRecord(error) && typeof error.message === "string") {
      return error.message;
    }
    if (typeof payload.message === "string") {
      return payload.message;
    }
  }
  return fallback;
}

export function mapDirectorCoreSuccess(
  result: DirectorCoreSuccess
): DirectorSuccessResponse {
  switch (result.mode) {
    case "image_prompt": {
      const promptText = result.promptText?.trim() ?? null;
      return {
        success: true,
        mode: result.mode,
        provider: result.provider,
        text: promptText,
        result: promptText,
        fallbackText: promptText,
        media: mapGeneratedImagesToMedia(result.images),
        metadata: result.metadata ?? null,
      };
    }
    case "video_plan": {
      const planText = stringifyStoryboard(result.storyboard);
      return {
        success: true,
        mode: result.mode,
        provider: result.provider,
        text: planText,
        fallbackText: planText,
        result: (result.storyboard as unknown) ?? planText ?? null,
        media: mapGeneratedVideosToMedia(result.videos),
        metadata: result.metadata ?? null,
      };
    }
    case "loop_sequence": {
      const media = mapLoopSequenceToMedia(result.loop);
      return {
        success: true,
        mode: result.mode,
        provider: result.provider,
        text: null,
        fallbackText: null,
        result: result.loop ?? null,
        media,
        metadata: result.loop.metadata ?? null,
      };
    }
    default:
      return assertNever(result);
  }
}

function mapGeneratedImagesToMedia(images: GeneratedImage[]): DirectorMediaAsset[] {
  return images.map((image, index) => {
    const source = partitionAssetSource(image.data);
    return {
      id: image.altText ?? `image-${index}`,
      kind: "image",
      url: source?.kind === "url" ? source.value : null,
      base64: source?.kind === "base64" ? source.value : null,
      mimeType: image.mimeType ?? null,
      caption: image.altText ?? null,
    } satisfies DirectorMediaAsset;
  });
}

function mapGeneratedVideosToMedia(videos: GeneratedVideo[]): DirectorMediaAsset[] {
  return videos.map((video, index) => {
    const poster = partitionAssetSource(video.posterImage);
    const frames = Array.isArray(video.frames)
      ? video.frames
          .map((frame, frameIndex) =>
            mapVideoFrame(frame, frameIndex, video.mimeType)
          )
          .filter((frame): frame is DirectorMediaAssetFrame => Boolean(frame))
      : undefined;

    const asset: DirectorMediaAsset = {
      id: video.url ?? video.base64 ?? `video-${index}`,
      kind: "video",
      url: video.url ?? null,
      base64: video.base64 ?? null,
      mimeType: video.mimeType ?? null,
      posterUrl: poster?.kind === "url" ? poster.value : null,
      posterBase64: poster?.kind === "base64" ? poster.value : null,
      durationSeconds: video.durationSeconds ?? null,
      frameRate: video.frameRate ?? null,
      frames,
    };

    return asset;
  });
}

function mapVideoFrame(
  value: string,
  frameIndex: number,
  mimeType?: string | null
): DirectorMediaAssetFrame | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const source = partitionAssetSource(value);
  if (!source) {
    return undefined;
  }

  const frame: DirectorMediaAssetFrame = {
    id: `frame-${frameIndex}`,
    mimeType: mimeType ?? null,
  };

  if (source.kind === "url") {
    frame.url = source.value;
  } else {
    frame.base64 = source.value;
  }

  return frame;
}

function mapLoopSequenceToMedia(loop: LoopSequenceResult): DirectorMediaAsset[] {
  if (!loop.frames.length) {
    return [];
  }

  const frames = loop.frames.map((frame, index) => {
    const source = partitionAssetSource(frame.data);
    const frameAsset: DirectorMediaAssetFrame = {
      id: frame.altText ?? `loop-frame-${index}`,
      mimeType: frame.mimeType ?? null,
      caption: frame.altText ?? null,
    };

    if (source?.kind === "url") {
      frameAsset.url = source.value;
    } else if (source?.kind === "base64") {
      frameAsset.base64 = source.value;
    }

    return frameAsset;
  });

  const primary = frames.find((frame) => frame.base64 || frame.url);

  return [
    {
      id: "loop-sequence",
      kind: "image",
      url: primary?.url ?? null,
      base64: primary?.base64 ?? null,
      mimeType: loop.frames[0]?.mimeType ?? null,
      durationSeconds:
        typeof loop.loopLength === "number" ? loop.loopLength : null,
      frameRate: loop.frameRate ?? null,
      frames,
    },
  ];
}

type AssetSource = { kind: "url" | "base64"; value: string };

function partitionAssetSource(value: string | undefined | null):
  | AssetSource
  | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isLikelyUrl(trimmed) || trimmed.startsWith("data:")) {
    return { kind: "url", value: trimmed };
  }

  return { kind: "base64", value: trimmed };
}

function stringifyStoryboard(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return null;
    }
  }

  return null;
}

function assertNever(value: never): never {
  throw new Error(
    `Unhandled director response: ${JSON.stringify(value as Record<string, unknown>)}`
  );
}
