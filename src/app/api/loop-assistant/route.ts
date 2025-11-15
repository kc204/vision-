import { NextResponse } from "next/server";

import { LOOP_ASSISTANT_SYSTEM_PROMPT } from "@/lib/prompts/loopAssistant";

const LOOP_ASSISTANT_API_URL = process.env.LOOP_ASSISTANT_API_URL?.trim() ?? "";
const FALLBACK_LOOP_ASSISTANT_API_KEY =
  process.env.LOOP_ASSISTANT_API_KEY?.trim() ?? "";
const LOOP_ASSISTANT_API_KEY_HEADER = "x-loop-assistant-api-key";

type ValidationResult =
  | { ok: true; messages: ChatMessage[]; extras: Record<string, unknown> }
  | { ok: false; error: string };

type ChatMessage = {
  role: string;
  content: string;
  [key: string]: unknown;
};

export async function POST(request: Request) {
  if (!LOOP_ASSISTANT_API_URL) {
    return NextResponse.json(
      {
        error:
          "Loop Assistant is not configured. Missing LOOP_ASSISTANT_API_URL environment variable.",
      },
      { status: 500 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validation = validatePayload(json);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const apiKey =
    extractApiKeyFromHeaders(request.headers) || FALLBACK_LOOP_ASSISTANT_API_KEY;

  const payload = {
    ...validation.extras,
    messages: injectSystemPrompt(validation.messages),
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(LOOP_ASSISTANT_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach Loop Assistant.";
    return NextResponse.json(
      { error: `Loop Assistant request failed to send: ${message}` },
      { status: 502 }
    );
  }

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

function validatePayload(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const { messages, ...extras } = input;

  if (!Array.isArray(messages)) {
    return { ok: false, error: "messages must be an array" };
  }

  const parsed: ChatMessage[] = [];
  for (const [index, value] of messages.entries()) {
    if (!isRecord(value)) {
      return {
        ok: false,
        error: `messages[${index}] must be an object`,
      };
    }

    const { role, content, ...rest } = value;

    if (typeof role !== "string" || role.trim().length === 0) {
      return {
        ok: false,
        error: `messages[${index}].role must be a non-empty string`,
      };
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return {
        ok: false,
        error: `messages[${index}].content must be a non-empty string`,
      };
    }

    parsed.push({ role, content, ...rest });
  }

  return { ok: true, messages: parsed, extras };
}

function injectSystemPrompt(messages: ChatMessage[]): ChatMessage[] {
  const filtered = messages.filter((message) => message.role !== "system");
  return [
    {
      role: "system",
      content: LOOP_ASSISTANT_SYSTEM_PROMPT,
    },
    ...filtered,
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractApiKeyFromHeaders(headers: Headers): string | null {
  const value = headers.get(LOOP_ASSISTANT_API_KEY_HEADER);
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
