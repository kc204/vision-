import { NextResponse } from "next/server";
import OpenAI, { APIError as OpenAIAPIError } from "openai";

import {
  getCapabilityConfig,
  getModelDefinition,
  ModelCapabilityConfig,
  ModelProvider,
  VIDEO_PLAN_RESPONSE_SCHEMA,
} from "@/lib/models";
import {
  geminiGenerateContent,
  GeminiAPIError,
  GeminiConfigurationError,
} from "@/lib/gemini";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_VIDEO_PLAN_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

type Tone = "informative" | "hype" | "calm" | "dark" | "inspirational";
type VisualStyle = "realistic" | "stylized" | "anime" | "mixed-media";
type AspectRatio = "16:9" | "9:16";

interface ValidatedVideoPlanRequest {
  scriptText: string;
  tone: Tone;
  visualStyle: VisualStyle;
  aspectRatio: AspectRatio;
  llmModel: string;
  modelConfig: ModelCapabilityConfig;
  provider: ModelProvider;
}

function validateVideoPlanRequest(body: unknown):
  | { ok: true; value: ValidatedVideoPlanRequest }
  | { ok: false; error: string; status?: number } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object", status: 400 };
  }

  const { scriptText, tone, visualStyle, aspectRatio, llmModel } =
    body as Record<string, unknown>;

  if (typeof scriptText !== "string" || !scriptText.trim()) {
    return { ok: false, error: "scriptText is required", status: 400 };
  }

  if (!isTone(tone)) {
    return { ok: false, error: "tone is invalid", status: 400 };
  }

  if (!isVisualStyle(visualStyle)) {
    return { ok: false, error: "visualStyle is invalid", status: 400 };
  }

  if (!isAspectRatio(aspectRatio)) {
    return { ok: false, error: "aspectRatio is invalid", status: 400 };
  }

  const resolvedModel =
    typeof llmModel === "string" && llmModel.trim()
      ? llmModel.trim()
      : DEFAULT_VIDEO_PLAN_MODEL;

  const modelDefinition = getModelDefinition(resolvedModel);
  if (!modelDefinition) {
    return {
      ok: false,
      error: `Unknown model requested: ${resolvedModel}`,
      status: 400,
    };
  }

  const capabilityConfig = getCapabilityConfig(resolvedModel, "videoPlan");
  if (!capabilityConfig) {
    return {
      ok: false,
      error: `Model ${resolvedModel} does not support video plan generation`,
      status: 400,
    };
  }

  return {
    ok: true,
    value: {
      scriptText: scriptText.trim(),
      tone,
      visualStyle,
      aspectRatio,
      llmModel: resolvedModel,
      modelConfig: capabilityConfig,
      provider: modelDefinition.provider,
    },
  };
}

function isTone(value: unknown): value is Tone {
  return (
    typeof value === "string" &&
    ["informative", "hype", "calm", "dark", "inspirational"].includes(value)
  );
}

function isVisualStyle(value: unknown): value is VisualStyle {
  return (
    typeof value === "string" &&
    ["realistic", "stylized", "anime", "mixed-media"].includes(value)
  );
}

function isAspectRatio(value: unknown): value is AspectRatio {
  return typeof value === "string" && ["16:9", "9:16"].includes(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateVideoPlanRequest(body);

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status ?? 400 }
      );
    }

    const { scriptText, tone, visualStyle, aspectRatio, llmModel, modelConfig, provider } =
      validation.value;

    const systemPrompt = `You are a YouTube Cinematic Director & Visual Story Architect.
You receive a video script and style preferences.
Your job is to split the script into 5–12 scenes, craft detailed JSON objects for each scene, and produce a thumbnail concept tied to the hook.
You are talking to another program, not a human. Respond ONLY with valid JSON matching the requested schema.`;

    const userPrompt = `SCRIPT:\n${scriptText}\n\nTONE:\n${tone}\n\nVISUAL STYLE:\n${visualStyle}\n\nASPECT RATIO:\n${aspectRatio}\n\nInstructions:\n- Create between 5 and 12 scenes depending on script length.\n- For each scene, fill in all required fields.\n- Then provide one thumbnailConcept tied to the main hook.\n\nReturn JSON in the following format:\n{\n"scenes": [ ... ],\n  "thumbnailConcept": "..."\n}\n\nRequired JSON schema:\n{\n  "scenes": [\n    {\n      "segment_title": "Scene X – Short title",\n      "scene_description": "Visual story for this scene.",\n      "main_subject": "Who or what anchors the frame.",\n      "camera_movement": "How the camera moves or stays still.",\n      "visual_tone": "Lighting, palette, atmosphere.",\n      "motion": "What moves in the scene.",\n      "mood": "Emotional energy.",\n      "narrative": "What this moment means thematically.",\n      "sound_suggestion": "Ambient or music idea.",\n      "text_overlay": "Optional on-screen text.",\n      "voice_timing_hint": "Approx seconds used by this scene.",\n      "broll_suggestions": "Quick extra shots.",\n      "graphics_callouts": "Labels or lower-thirds.",\n      "editor_notes": "Where to cut, pacing notes.",\n      "continuity_lock": {\n        "subject_identity": "What must stay consistent.",\n        "lighting_and_palette": "Colors and light that should match.",\n        "camera_grammar": "Lens/movement patterns to keep.",\n        "environment_motif": "Repeating background elements."\n      },\n      "acceptance_check": [\n        "Short bullets for continuity rules"\n      ]\n    }\n  ],\n  "thumbnailConcept": "One-line idea for a strong thumbnail tied to the hook."\n}`;

    if (provider === "gemini") {
      const response = await geminiGenerateContent({
        model: llmModel,
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        systemInstruction: {
          role: "system",
          parts: [{ text: systemPrompt }],
        },
        responseMimeType: modelConfig.responseMimeType ?? "application/json",
        responseSchema: modelConfig.responseSchema ?? VIDEO_PLAN_RESPONSE_SCHEMA,
      });

      const rawContent =
        response.candidates?.flatMap((candidate) =>
          candidate.content?.parts?.map((part) => part.text ?? "") ?? []
        ).join("") ?? "";

      if (!rawContent.trim()) {
        return NextResponse.json(
          { error: "Gemini returned an empty response" },
          { status: 502 }
        );
      }

      try {
        const parsed = JSON.parse(rawContent);
        return NextResponse.json(parsed);
      } catch (parseError) {
        console.error("Failed to parse Gemini response", parseError, rawContent);
        return NextResponse.json(
          { error: "Failed to generate video plan" },
          { status: 502 }
        );
      }
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY env variable");
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: llmModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error("No content returned from OpenAI");
      return NextResponse.json(
        { error: "Failed to generate video plan" },
        { status: 502 }
      );
    }

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response", parseError, content);
      return NextResponse.json(
        { error: "Failed to generate video plan" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Unhandled error generating video plan", error);

    if (error instanceof GeminiConfigurationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (error instanceof GeminiAPIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 500 }
      );
    }

    if (error instanceof OpenAIAPIError) {
      const status = typeof error.status === "number" ? error.status : 500;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate video plan" },
      { status: 500 }
    );
  }
}
