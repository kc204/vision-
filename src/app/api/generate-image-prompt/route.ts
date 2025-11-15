import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  cameraAngles,
  shotSizes,
  lightingStyles,
  colorPalettes,
  findVisualSnippet,
} from "@/lib/visualOptions";

type ImagePromptRequest = {
  visionSeedText: string;
  modelChoice: "sdxl" | "flux" | "illustrious";
  cameraAngleId?: string;
  shotSizeId?: string;
  lightingStyleId?: string;
  colorPaletteId?: string;
};

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY env variable");
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ImagePromptRequest;

    if (!body.visionSeedText || !body.modelChoice) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const cameraSnippet = findVisualSnippet(cameraAngles, body.cameraAngleId)?.promptSnippet;
    const shotSnippet = findVisualSnippet(shotSizes, body.shotSizeId)?.promptSnippet;
    const lightingSnippet = findVisualSnippet(lightingStyles, body.lightingStyleId)?.promptSnippet;
    const colorSnippet = findVisualSnippet(colorPalettes, body.colorPaletteId)?.promptSnippet;

    const systemPrompt = `You are Vision Architect — Autonomous Image Composer (ComfyUI Edition).
You take a casual user description plus some camera/lighting preferences and output one polished positive prompt, one negative prompt with smart negatives, recommended settings, and a short summary.
The user does NOT know film or art jargon; you translate their intent and preferences into professional cinematic language.
If modelChoice is "illustrious", use structured Danbooru-style tags.
If modelChoice is "sdxl" or "flux", use descriptive cinematic language.
Always include appropriate smart negatives (e.g., bad anatomy, low quality, blurry, watermark, extra limbs, unwanted text).
Respond ONLY with JSON.`;

    const userPrompt = `VISION SEED:\n${body.visionSeedText}\n\nMODEL CHOICE:\n${body.modelChoice}\n\nVISUAL PREFERENCES:\nCamera angle: ${cameraSnippet ?? "none specified"}\nShot size: ${shotSnippet ?? "none specified"}\nLighting: ${lightingSnippet ?? "none specified"}\nColor palette: ${colorSnippet ?? "none specified"}\n\nDesign one powerful, coherent image based on this.\n\nReturn JSON in the following format:\n{\n  "positivePrompt": "...",\n  "negativePrompt": "...",\n  "settings": {\n    "model": "...",\n    "resolution": "...",\n    "sampler": "...",\n    "steps": 40,\n    "cfg": 7,\n    "seed": "..."\n  },\n  "summary": "..."\n}`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
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
        { status: 500 }
      );
    }

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response", parseError, content);
      return NextResponse.json(
        { error: "Failed to generate image prompt" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unhandled error generating image prompt", error);
    return NextResponse.json(
      { error: "Failed to generate image prompt" },
      { status: 500 }
    );
  }
}
