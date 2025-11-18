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
  DirectorRequest,
  DirectorSuccessResponse,
  GeneratedImage,
} from "./directorTypes";

const GEMINI_API_URL = resolveGeminiApiBaseUrl(process.env.GEMINI_API_URL);

const DEFAULT_GEMINI_IMAGE_MODELS = ["gemini-2.5-flash"] as const;
const RAW_GEMINI_IMAGE_MODELS = parseModelList(
  process.env.GEMINI_IMAGE_MODELS ?? process.env.GEMINI_IMAGE_MODEL,
  [...DEFAULT_GEMINI_IMAGE_MODELS]
);

const DEFAULT_GEMINI_TEXT_MODELS = ["gemini-2.5-pro"] as const;
const RAW_GEMINI_TEXT_MODELS = parseModelList(
  process.env.GEMINI_TEXT_MODELS ?? process.env.GEMINI_TEXT_MODEL,
  [...DEFAULT_GEMINI_TEXT_MODELS]
);

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

assertNoLatestAliases(RAW_GEMINI_TEXT_MODELS, {
  context: "director",
  envVar: "GEMINI_TEXT_MODELS",
});

const GEMINI_TEXT_MODELS = enforceAllowedGeminiModels(
  RAW_GEMINI_TEXT_MODELS,
  {
    fallback: DEFAULT_GEMINI_TEXT_MODELS,
    context: "director",
    envVar: "GEMINI_TEXT_MODELS",
  }
);

let geminiImageClientLogged = false;
let geminiTextClientLogged = false;

export type DirectorProviderCredentials = {
  gemini?: {
    apiKey: string;
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
        return await callGeminiVideoPlanProvider(req, credentials);
      case "loop_sequence":
        return await callGeminiLoopSequenceProvider(req, credentials);
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

  const parts = buildDirectorUserParts(req.mode, req.payload, req.images);
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

async function callGeminiVideoPlanProvider(
  req: Extract<DirectorRequest, { mode: "video_plan" }>,
  credentials?: DirectorProviderCredentials
): Promise<DirectorCoreResult> {
  const response = await callGeminiTextModel(req, credentials);
  if (!response.ok) {
    return response.result;
  }

  const metadata = appendRawTextMetadata(response.metadata, response.text);

  return {
    success: true,
    mode: "video_plan",
    provider: "gemini",
    metadata,
    text: response.text,
  };
}

async function callGeminiLoopSequenceProvider(
  req: Extract<DirectorRequest, { mode: "loop_sequence" }>,
  credentials?: DirectorProviderCredentials
): Promise<DirectorCoreResult> {
  const response = await callGeminiTextModel(req, credentials);
  if (!response.ok) {
    return response.result;
  }

  const metadata = appendRawTextMetadata(response.metadata, response.text);

  return {
    success: true,
    mode: "loop_sequence",
    provider: "gemini",
    metadata,
    text: response.text,
  };
}

type GeminiTextCallSuccess = {
  ok: true;
  text: string;
  metadata?: Record<string, unknown>;
};

type GeminiTextCallFailure = {
  ok: false;
  result: DirectorCoreResult;
};

async function callGeminiTextModel(
  req: Extract<DirectorRequest, { mode: "video_plan" | "loop_sequence" }>,
  credentials?: DirectorProviderCredentials
): Promise<GeminiTextCallSuccess | GeminiTextCallFailure> {
  const apiKey = credentials?.gemini?.apiKey ?? getServerGeminiApiKey();

  if (!apiKey) {
    return {
      ok: false,
      result: {
        success: false,
        provider: "gemini",
        error:
          "Missing credentials for Gemini text generation. Provide an API key or configure GEMINI_API_KEY or GOOGLE_API_KEY.",
        status: 401,
      },
    };
  }

  const model = GEMINI_TEXT_MODELS[0];
  if (!model) {
    return {
      ok: false,
      result: {
        success: false,
        provider: "gemini",
        error: "No Gemini director model is configured.",
        status: 500,
      },
    };
  }

  logGeminiTextClientConfiguration(model);

  const endpoint = `${GEMINI_API_URL}/models/${encodeURIComponent(model)}:generateContent`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;

  const parts = buildDirectorUserParts(req.mode, req.payload, req.images);
  const payload = {
    system_instruction: {
      role: "system" as const,
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
    const message = error instanceof Error ? error.message : "Failed to reach Gemini provider.";
    return {
      ok: false,
      result: {
        success: false,
        provider: "gemini",
        error: `Gemini request failed to send: ${message}`,
      },
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    return {
      ok: false,
      result: {
        success: false,
        provider: "gemini",
        status: response.status,
        error: `Gemini responded with invalid JSON: ${message}`,
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      result: {
        success: false,
        provider: "gemini",
        status: response.status,
        error: extractErrorMessage(data, "Gemini director request failed."),
        details: data,
      },
    };
  }

  const { text, metadata } = parseGeminiTextResponse(data);

  if (!text) {
    return {
      ok: false,
      result: {
        success: false,
        provider: "gemini",
        status: response.status,
        error: "Gemini did not return any text in the response.",
        details: data,
      },
    };
  }

  return { ok: true, text, metadata };
}

function buildDirectorUserParts(
  mode: DirectorRequest["mode"],
  payload: unknown,
  images: string[] | undefined
) {
  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
    | { fileData: { fileUri: string; mimeType?: string } }
  > = [
    {
      text: JSON.stringify({ mode, payload }),
    },
  ];

  for (const part of buildImageParts(images)) {
    parts.push(part);
  }

  return parts;
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

function parseGeminiTextResponse(data: unknown): {
  text?: string;
  metadata?: Record<string, unknown>;
} {
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
        collectTextParts(content.parts, textChunks);
      }
      if (Array.isArray(candidate.output)) {
        collectTextParts(candidate.output, textChunks);
      }
    }
  }

const text = textChunks.map((chunk) => chunk.trim()).filter(Boolean).join("\n").trim();

  return { text: text || undefined, metadata };
}

function collectTextParts(parts: unknown[], textChunks: string[]): void {
  for (const part of parts) {
    if (!isRecord(part)) {
      continue;
    }
    if (typeof part.text === "string") {
      textChunks.push(part.text);
    }
  }
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

function extractMetadata(data: Record<string, unknown>): Record<string, unknown> | undefined {
  const { candidates, generated_images, generated_videos, ...rest } = data;
  const metadataEntries = Object.entries(rest).filter(([_, value]) => value !== undefined);
  return metadataEntries.length ? Object.fromEntries(metadataEntries) : undefined;
}

function appendRawTextMetadata(
  metadata: Record<string, unknown> | undefined,
  rawText: string
): Record<string, unknown> | undefined {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return metadata;
  }

  const base = metadata ? { ...metadata } : {};
  if (typeof base.rawText === "string" && base.rawText.trim().length) {
    if (base.rawText.includes(trimmed)) {
      return base;
    }
    base.rawText = `${base.rawText}\n${trimmed}`;
  } else {
    base.rawText = trimmed;
  }

  return base;
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

function logGeminiTextClientConfiguration(model: string) {
  if (geminiTextClientLogged) {
    return;
  }

  geminiTextClientLogged = true;
  logGenerativeClientTarget({
    provider: "Gemini",
    context: "director text",
    baseUrl: GEMINI_API_URL,
    model,
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
      const planText = result.text?.trim() ?? stringifyStoryboard(result.storyboard);
      return {
        success: true,
        mode: result.mode,
        provider: result.provider,
        text: planText,
        fallbackText: planText,
        result: (result.storyboard as unknown) ?? planText ?? null,
        media: [],
        metadata: result.metadata ?? null,
      };
    }
    case "loop_sequence": {
      const planText = result.text?.trim() ?? stringifyStoryboard(result.loop);
      return {
        success: true,
        mode: result.mode,
        provider: result.provider,
        text: planText,
        fallbackText: planText,
        result: result.loop ?? planText ?? null,
        media: [],
        metadata: result.metadata ?? null,
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
