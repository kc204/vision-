import { NextResponse } from "next/server";
import OpenAI, { APIError as OpenAIAPIError } from "openai";

import {
  cameraAngles,
  shotSizes,
  lightingStyles,
  colorPalettes,
  findVisualSnippet,
} from "@/lib/visualOptions";
import {
  getCapabilityConfig,
  getModelDefinition,
  IMAGE_PROMPT_RESPONSE_SCHEMA,
  ModelCapabilityConfig,
  ModelProvider,
} from "@/lib/models";
import {
  geminiGenerateContent,
  GeminiAPIError,
  GeminiConfigurationError,
} from "@/lib/gemini";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_IMAGE_PROMPT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

interface ValidatedImagePromptRequest {
  visionSeedText: string;
  modelChoice: "sdxl" | "flux" | "illustrious";
  cameraAngleId?: string;
  shotSizeId?: string;
  lightingStyleId?: string;
  colorPaletteId?: string;
  llmModel: string;
  modelConfig: ModelCapabilityConfig;
  provider: ModelProvider;
}

function validateImagePromptRequest(body: unknown):
  | { ok: true; value: ValidatedImagePromptRequest }
  | { ok: false; error: string; status?: number } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object", status: 400 };
  }

  const {
    visionSeedText,
    modelChoice,
    cameraAngleId,
    shotSizeId,
    lightingStyleId,
    colorPaletteId,
    llmModel,
  } = body as Record<string, unknown>;

  if (typeof visionSeedText !== "string" || !visionSeedText.trim()) {
    return { ok: false, error: "visionSeedText is required", status: 400 };
  }

  if (typeof modelChoice !== "string" ||
      !["sdxl", "flux", "illustrious"].includes(modelChoice)) {
    return { ok: false, error: "modelChoice must be one of sdxl, flux, or illustrious", status: 400 };
  }

  const resolvedModel =
    typeof llmModel === "string" && llmModel.trim()
      ? llmModel.trim()
      : DEFAULT_IMAGE_PROMPT_MODEL;

  const modelDefinition = getModelDefinition(resolvedModel);
  if (!modelDefinition) {
    return {
      ok: false,
      error: `Unknown model requested: ${resolvedModel}`,
      status: 400,
    };
  }

  const capabilityConfig = getCapabilityConfig(resolvedModel, "imagePrompt");
  if (!capabilityConfig) {
    return {
      ok: false,
      error: `Model ${resolvedModel} does not support image prompt generation`,
      status: 400,
    };
  }

  const optionalFields: Record<string, unknown> = {
    cameraAngleId,
    shotSizeId,
    lightingStyleId,
    colorPaletteId,
  };

  for (const [key, value] of Object.entries(optionalFields)) {
    if (value !== undefined && typeof value !== "string") {
      return {
        ok: false,
        error: `${key} must be a string when provided`,
        status: 400,
      };
    }
  }

  return {
    ok: true,
    value: {
      visionSeedText: visionSeedText.trim(),
      modelChoice: modelChoice as "sdxl" | "flux" | "illustrious",
      cameraAngleId: cameraAngleId as string | undefined,
      shotSizeId: shotSizeId as string | undefined,
      lightingStyleId: lightingStyleId as string | undefined,
      colorPaletteId: colorPaletteId as string | undefined,
      llmModel: resolvedModel,
      modelConfig: capabilityConfig,
      provider: modelDefinition.provider,
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = validateImagePromptRequest(body);

    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status ?? 400 }
      );
    }

    const {
      visionSeedText,
      modelChoice,
      cameraAngleId,
      shotSizeId,
      lightingStyleId,
      colorPaletteId,
      llmModel,
      modelConfig,
      provider,
    } = validation.value;

    const cameraSnippet = findVisualSnippet(cameraAngles, cameraAngleId)?.promptSnippet;
    const shotSnippet = findVisualSnippet(shotSizes, shotSizeId)?.promptSnippet;
    const lightingSnippet = findVisualSnippet(lightingStyles, lightingStyleId)?.promptSnippet;
    const colorSnippet = findVisualSnippet(colorPalettes, colorPaletteId)?.promptSnippet;

    const systemPrompt = `You are Vision Architect — Autonomous Image Composer (ComfyUI Edition).
You take a casual user description plus some camera/lighting preferences and output one polished positive prompt, one negative prompt with smart negatives, recommended settings, and a short summary.
The user does NOT know film or art jargon; you translate their intent and preferences into professional cinematic language.
If modelChoice is "illustrious", use structured Danbooru-style tags.
If modelChoice is "sdxl" or "flux", use descriptive cinematic language.
Always include appropriate smart negatives (e.g., bad anatomy, low quality, blurry, watermark, extra limbs, unwanted text).
Respond ONLY with JSON.`;

    const userPrompt = `VISION SEED:\n${visionSeedText}\n\nMODEL CHOICE:\n${modelChoice}\n\nVISUAL PREFERENCES:\nCamera angle: ${cameraSnippet ?? "none specified"}\nShot size: ${shotSnippet ?? "none specified"}\nLighting: ${lightingSnippet ?? "none specified"}\nColor palette: ${colorSnippet ?? "none specified"}\n\nDesign one powerful, coherent image based on this.\n\nReturn JSON in the following format:\n{\n  "positivePrompt": "...",\n  "negativePrompt": "...",\n  "settings": {\n    "model": "...",\n    "resolution": "...",\n    "sampler": "...",\n    "steps": 40,\n    "cfg": 7,\n    "seed": "..."\n  },\n  "summary": "..."\n}`;

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
        responseSchema: modelConfig.responseSchema ?? IMAGE_PROMPT_RESPONSE_SCHEMA,
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
          { error: "Failed to generate image prompt" },
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
        { error: "Failed to generate image prompt" },
        { status: 502 }
      );
    }

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response", parseError, content);
      return NextResponse.json(
        { error: "Failed to generate image prompt" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Unhandled error generating image prompt", error);

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
      { error: "Failed to generate image prompt" },
      { status: 500 }
    );
  }
}
