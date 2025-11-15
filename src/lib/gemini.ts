const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/";

function normalizeBaseUrl(baseUrl?: string) {
  if (!baseUrl) {
    return DEFAULT_BASE_URL;
  }
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE_URL = normalizeBaseUrl(process.env.GEMINI_API_BASE_URL);

export class GeminiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigurationError";
  }
}

export class GeminiAPIError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "GeminiAPIError";
    this.status = status;
    this.details = details;
  }
}

export type GeminiPart = { text?: string } & Record<string, unknown>;

export type GeminiContent = {
  role: "user" | "model" | "system";
  parts: GeminiPart[];
};

export interface GeminiChatRequest {
  model: string;
  contents: GeminiContent[];
  systemInstruction?: GeminiContent;
  responseMimeType?: string;
  responseSchema?: unknown;
  generationConfig?: Record<string, unknown>;
  safetySettings?: unknown;
  tools?: unknown;
}

export interface GeminiVideoRequest {
  model: string;
  request: Record<string, unknown>;
}

export type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<GeminiPart>;
    };
  }>;
  [key: string]: unknown;
};

export type GeminiGenerateVideoResponse = Record<string, unknown>;

function ensureApiKey(): string {
  if (!GEMINI_API_KEY) {
    throw new GeminiConfigurationError("Missing GEMINI_API_KEY env variable");
  }
  return GEMINI_API_KEY;
}

async function requestGemini<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const apiKey = ensureApiKey();
  const url = new URL(path, GEMINI_BASE_URL);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json: unknown;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new GeminiAPIError(
        "Gemini response could not be parsed as JSON",
        response.status,
        { raw: text, parseError: error instanceof Error ? error.message : error }
      );
    }
  }

  if (!response.ok) {
    const errorMessage =
      (typeof json === "object" && json && "error" in json &&
        typeof (json as { error?: { message?: string } }).error?.message === "string"
        ? (json as { error?: { message?: string } }).error?.message
        : undefined) ?? `Gemini request failed with status ${response.status}`;

    throw new GeminiAPIError(errorMessage, response.status, json);
  }

  return (json as T) ?? ({} as T);
}

export async function geminiGenerateContent({
  model,
  contents,
  systemInstruction,
  responseMimeType,
  responseSchema,
  generationConfig,
  safetySettings,
  tools,
}: GeminiChatRequest): Promise<GeminiGenerateContentResponse> {
  const path = `models/${encodeURIComponent(model)}:generateContent`;

  const mergedGenerationConfig = {
    ...(generationConfig ?? {}),
    ...(responseMimeType ? { responseMimeType } : {}),
    ...(responseSchema ? { responseSchema } : {}),
  };

  const payload: Record<string, unknown> = {
    contents,
  };

  if (systemInstruction) {
    payload.system_instruction = systemInstruction;
  }
  if (safetySettings) {
    payload.safety_settings = safetySettings;
  }
  if (tools) {
    payload.tools = tools;
  }
  if (Object.keys(mergedGenerationConfig).length > 0) {
    payload.generationConfig = mergedGenerationConfig;
  }

  return requestGemini<GeminiGenerateContentResponse>(path, payload);
}

export async function geminiGenerateVideo({
  model,
  request,
}: GeminiVideoRequest): Promise<GeminiGenerateVideoResponse> {
  const path = `models/${encodeURIComponent(model)}:generateVideo`;
  return requestGemini<GeminiGenerateVideoResponse>(path, request);
}
