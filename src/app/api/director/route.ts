import { NextResponse } from "next/server";
import OpenAI from "openai";
import { parseStructuredText } from "@/lib/imagePromptParser";

type SelectedOptionPayload = {
  id: string;
  label: string;
  promptSnippet: string;
  category: string;
};

type DirectorRequest = {
  mode: "image_prompt";
  model_choice: "sdxl" | "flux" | "illustrious";
  vision_seed_text: string[];
  vision_seed_images?: string[];
  selected_options?: SelectedOptionPayload[];
  constraints?: string[];
};

type ImagePromptResponse = {
  positivePrompt: string;
  negativePrompt: string;
  summary: string;
  settings: Record<string, string | number>;
  moodMemory?: string;
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

    const body = (await request.json()) as DirectorRequest;

    if (body.mode !== "image_prompt") {
      return NextResponse.json(
        { error: "Unsupported director mode" },
        { status: 400 }
      );
    }

    const visionSeedText = (body.vision_seed_text ?? [])
      .map((line) => line?.trim())
      .filter((line): line is string => Boolean(line));

    if (visionSeedText.length === 0 && (!body.vision_seed_images || body.vision_seed_images.length === 0)) {
      return NextResponse.json(
        { error: "Provide a vision seed description or reference images" },
        { status: 400 }
      );
    }

    const selectedOptions = body.selected_options ?? [];
    const optionSummary = selectedOptions.length
      ? selectedOptions
          .map((option) => `${option.category}: ${option.label} -> ${option.promptSnippet}`)
          .join("\n")
      : "None provided";

    const constraints = body.constraints ?? [];
    const constraintSummary = constraints.length > 0 ? constraints.join("\n") : "None provided";

    const imageSummary = body.vision_seed_images?.length
      ? `${body.vision_seed_images.length} reference image(s) supplied as base64 data URLs. Describe how they should influence the prompt even though you cannot view them.`
      : "No reference images provided.";

    const systemPrompt = `You are Vision Architect — Autonomous Image Composer (ComfyUI Edition).
You take casual descriptions plus cinematic preferences and output one polished positive prompt, one negative prompt with smart negatives, recommended settings, and a short summary.
The user does NOT know film or art jargon; translate their intent and preferences into professional cinematic language.
If model_choice is "illustrious", prefer structured Danbooru-style tags.
If model_choice is "sdxl" or "flux", use descriptive cinematic language.
Always include appropriate smart negatives (bad anatomy, low quality, blurry, watermark, extra limbs, unwanted text, etc.).
Respond ONLY with JSON.`;

    const userPrompt = `VISION SEED NOTES:\n${visionSeedText.join("\n")}\n\nREFERENCE IMAGES:\n${imageSummary}\n\nMODEL CHOICE:\n${body.model_choice}\n\nCINEMATIC OPTIONS:\n${optionSummary}\n\nCONSTRAINTS:\n${constraintSummary}\n\nDesign one coherent, cinematic image concept. Return JSON in this format:\n{\n  "positivePrompt": "...",\n  "negativePrompt": "...",\n  "settings": {\n    "model": "...",\n    "resolution": "...",\n    "sampler": "...",\n    "steps": 40,\n    "cfg": 7,\n    "seed": "..."\n  },\n  "summary": "..."\n}`;

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
      const parsed = JSON.parse(content) as ImagePromptResponse;
      return NextResponse.json({ mode: "image_prompt", ...parsed });
    } catch (parseError) {
      const structured = parseStructuredText(content);
      if (structured) {
        console.warn("Falling back to structured text parsing for director response");
        return NextResponse.json({ mode: "image_prompt", ...structured });
      }

      console.error("Failed to parse OpenAI response", parseError, content);
      return NextResponse.json(
        { error: "Failed to generate image prompt" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unhandled error generating director response", error);
    return NextResponse.json(
      { error: "Failed to generate image prompt" },
      { status: 500 }
    );
  }
}
