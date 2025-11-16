import { NextResponse } from "next/server";

import { callGeminiChat, GeminiChatMessage } from "@/lib/geminiClient";

type ValidationResult =
  | { ok: true; value: GeminiChatMessage[] }
  | { ok: false; error: string };

export async function POST(request: Request) {
  const systemPrompt = process.env.LOOP_ASSISTANT_SYSTEM_PROMPT;
  if (!systemPrompt) {
    return NextResponse.json(
      { error: "Loop assistant is not configured." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const bodyRecord = body as Record<string, unknown>;

  const validation = parseMessages(
    bodyRecord.messages ?? bodyRecord.history
  );
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const apiKey = extractGeminiApiKey(request, bodyRecord);
  const result = await callGeminiChat(systemPrompt, validation.value, {
    apiKey: apiKey ?? undefined,
  });
  if (!result.success) {
    const { status, error, details } = result;
    const responseBody: Record<string, unknown> = { error };
    if (details !== undefined) {
      responseBody.details = details;
    }
    return NextResponse.json(responseBody, { status: status ?? 502 });
  }

  return NextResponse.json({ reply: result.reply });
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

function parseMessages(value: unknown): ValidationResult {
  if (value === undefined) {
    return { ok: true, value: [] };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "messages must be an array" };
  }

  const messages: GeminiChatMessage[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      return { ok: false, error: "Each message must be an object" };
    }

    const { role, content } = entry as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") {
      return { ok: false, error: "message role must be user or assistant" };
    }

    if (typeof content !== "string") {
      return { ok: false, error: "message content must be a string" };
    }

    const normalizedRole: GeminiChatMessage["role"] = role;
    messages.push({ role: normalizedRole, content });
  }

  return { ok: true, value: messages };
}

function extractGeminiApiKey(
  request: Request,
  body: Record<string, unknown>
): string | undefined {
  const directHeaderKey = getHeaderValue(request, [
    "X-Gemini-Api-Key",
    "X-Google-Api-Key",
  ]);
  if (directHeaderKey) {
    return directHeaderKey;
  }

  const providerHeaderKey = normalizeApiKey(
    request.headers.get("x-provider-api-key")
  );
  if (providerHeaderKey) {
    return providerHeaderKey;
  }

  const providerKey = findFirstKey(body, [
    "gemini",
    "geminiApiKey",
    "gemini_api_key",
    "google",
    "googleApiKey",
    "google_api_key",
  ]);
  if (providerKey) {
    return providerKey;
  }

  const providerKeys = body.providerKeys;
  if (isRecord(providerKeys)) {
    const nestedProviderKey = findFirstKey(providerKeys, [
      "gemini",
      "geminiApiKey",
      "gemini_api_key",
      "google",
      "googleApiKey",
      "google_api_key",
    ]);
    if (nestedProviderKey) {
      return nestedProviderKey;
    }
  }

  const provider = body.provider;
  if (isRecord(provider)) {
    const nestedProviderKey = findFirstKey(provider, [
      "gemini",
      "geminiApiKey",
      "gemini_api_key",
      "google",
      "googleApiKey",
      "google_api_key",
    ]);
    if (nestedProviderKey) {
      return nestedProviderKey;
    }
  }

  return (
    normalizeApiKey(body.geminiApiKey) ??
    normalizeApiKey(body.googleApiKey) ??
    normalizeApiKey(body.providerApiKey) ??
    normalizeApiKey(body.apiKey)
  );
}

function normalizeApiKey(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function findFirstKey(
  source: Record<string, unknown>,
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
