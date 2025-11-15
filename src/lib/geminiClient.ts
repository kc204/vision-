import { parseModelList, resolveGoogleModel } from "./googleModels";

const GEMINI_API_URL =
  process.env.GEMINI_API_URL ?? "https://generativelanguage.googleapis.com/v1beta";

const GEMINI_CHAT_MODELS = parseModelList(
  process.env.GEMINI_CHAT_MODELS ?? process.env.GEMINI_CHAT_MODEL,
  ["gemini-1.5-pro-latest"]
);

export type GeminiChatRole = "user" | "assistant";

export type GeminiChatMessage = {
  role: GeminiChatRole;
  content: string;
};

export type GeminiChatSuccess = {
  success: true;
  reply: string;
};

export type GeminiChatError = {
  success: false;
  error: string;
  status?: number;
  details?: unknown;
};

export type GeminiChatResult = GeminiChatSuccess | GeminiChatError;

type GeminiChatCredentials = {
  googleAccessToken?: string;
  apiKey?: string;
};

export async function callGeminiChat(
  systemPrompt: string,
  history: GeminiChatMessage[],
  credentials?: GeminiChatCredentials
): Promise<GeminiChatResult> {
  const googleAccessToken = credentials?.googleAccessToken;
  const fallbackApiKey =
    credentials?.apiKey ??
    getNonEmptyString(process.env.GEMINI_API_KEY) ??
    getNonEmptyString(process.env.GOOGLE_API_KEY);

  const usingOAuth = Boolean(googleAccessToken);
  const token = googleAccessToken ?? fallbackApiKey;

  if (!token) {
    return {
      success: false,
      error:
        "Missing credentials for Gemini chat. Sign in with Google or configure GEMINI_API_KEY.",
      status: 401,
    };
  }

  let model: string | null;
  try {
    model = usingOAuth
      ? await resolveGoogleModel(token, GEMINI_CHAT_MODELS, GEMINI_API_URL)
      : GEMINI_CHAT_MODELS[0];
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to evaluate Google account entitlements for Gemini chat.";
    return { success: false, error: message };
  }

  if (!model) {
    return {
      success: false,
      error:
        "Your Google account is not entitled to the Gemini chat models required for loop assistant.",
      status: 403,
    };
  }

  const endpoint = `${GEMINI_API_URL}/models/${encodeURIComponent(model)}:generateContent`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const url = usingOAuth ? endpoint : `${endpoint}?key=${token}`;
  if (usingOAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const contents = history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  if (contents.length === 0) {
    contents.push({
      role: "user" as const,
      parts: [
        {
          text: "Begin the conversation according to the system instructions and offer the opening response.",
        },
      ],
    });
  }

  const payload = {
    systemInstruction: {
      role: "system" as const,
      parts: [{ text: systemPrompt }],
    },
    contents,
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
      error instanceof Error ? error.message : "Failed to reach Gemini chat endpoint.";
    return {
      success: false,
      error: `Gemini chat request failed to send: ${message}`,
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    return {
      success: false,
      status: response.status,
      error: `Gemini responded with invalid JSON: ${message}`,
    };
  }

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: extractGeminiErrorMessage(data, "Gemini chat request failed."),
      details: data,
    };
  }

  const reply = extractReplyText(data);
  if (!reply) {
    return {
      success: false,
      status: response.status,
      error: "Gemini did not return any text in the response.",
      details: data,
    };
  }

  return { success: true, reply };
}

function extractReplyText(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  const candidates = payload.candidates;
  if (!Array.isArray(candidates)) {
    return null;
  }

  for (const candidate of candidates) {
    if (!isRecord(candidate)) {
      continue;
    }

    const content = candidate.content;
    if (!isRecord(content)) {
      continue;
    }

    const parts = content.parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      if (isRecord(part) && typeof part.text === "string" && part.text.trim().length > 0) {
        return part.text;
      }
    }
  }

  return null;
}

function extractGeminiErrorMessage(payload: unknown, fallback: string): string {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
