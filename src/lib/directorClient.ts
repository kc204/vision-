import { enforceAllowedGeminiModels, parseModelList } from "./googleModels";
import { DIRECTOR_CORE_SYSTEM_PROMPT } from "./prompts/directorCore";
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
} from "./directorTypes";

const GEMINI_API_URL =
  process.env.GEMINI_API_URL ?? "https://generativelanguage.googleapis.com/v1";
const VEO_API_URL = process.env.VEO_API_URL ?? GEMINI_API_URL;
const NANO_BANANA_API_URL =
  process.env.NANO_BANANA_API_URL ?? "https://api.nanobanana.com/v1";

const DEFAULT_GEMINI_IMAGE_MODELS = ["gemini-2.5-flash"] as const;
const GEMINI_IMAGE_MODELS = enforceAllowedGeminiModels(
  parseModelList(
    process.env.GEMINI_IMAGE_MODELS ?? process.env.GEMINI_IMAGE_MODEL,
    [...DEFAULT_GEMINI_IMAGE_MODELS]
  ),
  {
    fallback: DEFAULT_GEMINI_IMAGE_MODELS,
    context: "image",
    envVar: "GEMINI_IMAGE_MODELS",
  }
);
const VEO_VIDEO_MODELS = parseModelList(
  process.env.VEO_VIDEO_MODELS ?? process.env.VEO_VIDEO_MODEL,
  ["veo-3.1"]
);

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

  if (images.length === 0) {
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
      provider: "veo-3.1",
      error:
        "Missing credentials for Veo video planning. Provide an API key or configure VEO_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY.",
      status: 401,
    };
  }

  const model = VEO_VIDEO_MODELS[0];
  if (!model) {
    return {
      success: false,
      provider: "veo-3.1",
      error: "No Veo model is configured.",
      status: 500,
    };
  }

  const endpoint = `${VEO_API_URL}/models/${encodeURIComponent(model)}:generateContent`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const url = `${endpoint}?key=${encodeURIComponent(apiKey)}`;

  const parts = buildVideoPlanParts(req.payload, req.images);
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
    const message = error instanceof Error ? error.message : "Failed to reach Veo provider.";
    return {
      success: false,
      provider: "veo-3.1",
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
      provider: "veo-3.1",
      status: response.status,
      error: `Veo responded with invalid JSON: ${message}`,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      provider: "veo-3.1",
      status: response.status,
      error: extractErrorMessage(data, "Veo video request failed."),
      details: data,
    };
  }

  const { videos, storyboard, metadata } = parseVeoVideoResponse(data);

  if (videos.length === 0) {
    return {
      success: false,
      provider: "veo-3.1",
      status: response.status,
      error: "Veo did not return any video outputs in the response.",
      details: data,
    };
  }

  return {
    success: true,
    mode: "video_plan",
    provider: "veo-3.1",
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

function buildVideoPlanParts(payload: DirectorRequest["payload"], images?: string[]) {
  const promptSections: string[] = [];

  if (isRecord(payload)) {
    const {
      vision_seed_text,
      script_text,
      tone,
      visual_style,
      aspect_ratio,
      mood_profile,
      cinematic_control_options,
    } = payload as Record<string, unknown>;

    promptSections.push(`Mode: video_plan`);
    if (typeof vision_seed_text === "string") {
      promptSections.push(`Vision Seed:\n${vision_seed_text}`);
    }
    if (typeof script_text === "string") {
      promptSections.push(`Script:\n${script_text}`);
    }
    if (typeof tone === "string") {
      promptSections.push(`Tone: ${tone}`);
    }
    if (typeof visual_style === "string") {
      promptSections.push(`Visual Style: ${visual_style}`);
    }
    if (typeof aspect_ratio === "string") {
      promptSections.push(`Aspect Ratio: ${aspect_ratio}`);
    }
    if (typeof mood_profile === "string" && mood_profile.trim().length > 0) {
      promptSections.push(`Mood Profile: ${mood_profile}`);
    }
    if (cinematic_control_options && typeof cinematic_control_options === "object") {
      promptSections.push(
        `Cinematic Controls: ${JSON.stringify(cinematic_control_options, null, 2)}`
      );
    }
  } else {
    promptSections.push(`Mode: video_plan`, JSON.stringify(payload));
  }

  const parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
    | { fileData: { fileUri: string; mimeType?: string } }
  > = promptSections.map((section) => ({ text: section }));

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
        result: (result.loop.metadata as unknown) ?? null,
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
