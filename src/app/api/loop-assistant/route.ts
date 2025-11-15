import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
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

  const headerApiKey = request.headers
    .get("x-provider-api-key")
    ?.trim();

  const session = await auth();
  const result = await callGeminiChat(systemPrompt, validation.value, {
    googleAccessToken: session?.providerTokens?.google?.accessToken,
    apiKey: headerApiKey && headerApiKey.length > 0 ? headerApiKey : undefined,
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
