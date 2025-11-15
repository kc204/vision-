const GEMINI_API_URL =
  process.env.GEMINI_API_URL ?? "https://generativelanguage.googleapis.com/v1beta";

const GEMINI_CHAT_MODEL =
  process.env.GEMINI_CHAT_MODEL ?? "gemini-1.5-pro-latest";

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

export async function callGeminiChat(
  systemPrompt: string,
  history: GeminiChatMessage[],
  apiKeyOverride?: string
): Promise<GeminiChatResult> {
  const apiKey =
    getNonEmptyString(apiKeyOverride) ??
    getNonEmptyString(process.env.GEMINI_API_KEY) ??
    getNonEmptyString(process.env.GOOGLE_API_KEY);
  if (!apiKey) {
    return {
      success: false,
      error:
        "Missing API key for Gemini chat. Provide a key in the request or set GEMINI_API_KEY/GOOGLE_API_KEY.",
    };
  }

  const url = `${GEMINI_API_URL}/models/${encodeURIComponent(
    GEMINI_CHAT_MODEL
  )}:generateContent?key=${apiKey}`;

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
      headers: {
        "Content-Type": "application/json",
      },
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
