import { NextResponse } from "next/server";
import OpenAI from "openai";
import type {
  ImagePromptDirectorRequest,
  ImagePromptPayload,
  ImagePromptSelectedOptions,
  VisualOptionSelection,
} from "@/lib/directorTypes";

type ContinuityLock = {
  subject_identity: string;
  lighting_and_palette: string;
  camera_grammar: string;
  environment_motif: string;
};

type LoopKeyframe = {
  frame: number;
  description: string;
  camera?: string;
  motion?: string;
  lighting?: string;
};

type LoopCycleJSON = {
  cycle_id: string;
  title?: string;
  beat_summary?: string;
  prompt: string;
  start_frame: number;
  loop_length: number;
  continuity_lock: ContinuityLock;
  keyframes?: LoopKeyframe[];
  mood_profile?: string;
};

type LoopDirectorRequest = {
  mode: "loop_sequence";
  visionSeed: string;
  startFrame?: number;
  loopLength?: number;
  includeMoodProfile?: boolean;
  referenceImage?: string | null;
};

type DirectorErrorResponse = {
  error: string;
};

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY env variable");
      return NextResponse.json<DirectorErrorResponse>(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const rawBody = (await request.json()) as unknown;

    if (isImagePromptRequest(rawBody)) {
      return await handleImagePrompt(rawBody);
    }

    if (isLoopSequenceRequest(rawBody)) {
      return await handleLoopSequence(rawBody);
    }

    return NextResponse.json<DirectorErrorResponse>(
      { error: "Unsupported director mode" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Unhandled director error", error);
    return NextResponse.json<DirectorErrorResponse>(
      { error: "Failed to process director request" },
      { status: 500 }
    );
  }
}

async function handleImagePrompt(
  request: ImagePromptDirectorRequest
): Promise<NextResponse> {
  const payload = request.payload as ImagePromptPayload;
  const visionSeed = payload.vision_seed?.trim();

  if (!visionSeed) {
    return NextResponse.json<DirectorErrorResponse>(
      { error: "vision_seed is required" },
      { status: 400 }
    );
  }

  const moodProfile = payload.mood_profile?.trim() ?? "";
  const constraints = payload.constraints?.trim() ?? "";
  const referenceCount = Array.isArray(payload.references)
    ? payload.references.length
    : 0;
  const referenceNote = referenceCount
    ? `The user supplied ${referenceCount} reference image(s) encoded as base64. Use them to ground continuity and tone but never echo the raw data.`
    : "No reference images were provided.";

  const cinematicNotes = formatSelectedOptions(payload.selectedOptions);

  const systemPrompt =
    "You are Vision Architect Director — an assistant who turns structured creative briefs into production-ready prompts for image diffusion models. Respond as plain text with exactly three labeled sections: Positive Prompt:, Negative Prompt:, Suggested Settings:.";

  const userPrompt = `MODE: image_prompt
VISION SEED:
${visionSeed}

MOOD PROFILE:
${moodProfile || "Not specified"}

CONSTRAINTS:
${constraints || "None provided"}

MODEL PREFERENCE:
${payload.model}

CINEMATIC OPTIONS:
${cinematicNotes || "No additional cinematic guidance."}

${referenceNote}

Craft a polished positive prompt that weaves in the model preference, cinematic cues, and emotional intent. Include a concise negative prompt calling out elements to avoid. Provide Suggested Settings as short bullet lines or key-value hints — do not use JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error("OpenAI returned no content for image prompt", completion);
      return NextResponse.json<DirectorErrorResponse>(
        { error: "Failed to generate image prompt" },
        { status: 500 }
      );
    }

    return new NextResponse(content, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Failed to generate image prompt", error);
    return NextResponse.json<DirectorErrorResponse>(
      { error: "Failed to generate image prompt" },
      { status: 500 }
    );
  }
}

async function handleLoopSequence(
  body: LoopDirectorRequest
): Promise<NextResponse> {
  if (!body.visionSeed || !body.visionSeed.trim()) {
    return NextResponse.json<DirectorErrorResponse>(
      { error: "visionSeed is required" },
      { status: 400 }
    );
  }

  const startFrame = Number.isFinite(body.startFrame)
    ? Number(body.startFrame)
    : 0;
  const loopLength = Number.isFinite(body.loopLength)
    ? Math.max(1, Number(body.loopLength))
    : 48;

  const includeMoodProfile = Boolean(body.includeMoodProfile);

  const referenceHint = body.referenceImage
    ? "The user also supplied a base64-encoded reference image. Use it to inform continuity notes and tone, but do not echo the raw string."
    : "No reference image was provided.";

  const moodProfileDirective = includeMoodProfile
    ? "If helpful, summarize a short mood profile that can be reused when refining the loop later."
    : "Do not invent a mood profile section unless the loop inherently requires it.";

  const systemPrompt = `You are Loop Sequence Director — an animation planning assistant for short seamless loops. You translate casual language into production-ready JSON instructions. Always respond with JSON only.`;

  const userPrompt = `MODE: loop_sequence
VISION SEED:
${body.visionSeed.trim()}

START FRAME: ${startFrame}
LOOP LENGTH: ${loopLength} frames
${referenceHint}
${moodProfileDirective}

Design 2-4 cohesive loop cycles that explore the idea while keeping the loop seamless.
Each cycle should:
- Provide a descriptive prompt capturing the visual moment.
- Lock key continuity details (subjects, lighting/palette, camera grammar, environment motif).
- Outline 3-5 keyframes describing how motion evolves between the start frame and the loop reset.
- Mention whether a mood profile should be remembered when includeMoodProfile is true.

Return a JSON array of cycles using this schema:
[
  {
    "cycle_id": "loop-cycle-1",
    "title": "Optional short title",
    "beat_summary": "One-sentence summary of the loop",
    "prompt": "Primary generation prompt",
    "start_frame": ${startFrame},
    "loop_length": ${loopLength},
    "continuity_lock": {
      "subject_identity": "...",
      "lighting_and_palette": "...",
      "camera_grammar": "...",
      "environment_motif": "..."
    },
    "keyframes": [
      {
        "frame": ${startFrame},
        "description": "Describe the visual moment",
        "camera": "Optional camera note",
        "motion": "Optional motion note",
        "lighting": "Optional lighting note"
      }
    ],
    "mood_profile": "Only when includeMoodProfile is true"
  }
]`;

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      console.error("OpenAI returned no content for loop sequence");
      return NextResponse.json<DirectorErrorResponse>(
        { error: "Failed to generate loop sequence" },
        { status: 500 }
      );
    }

    const parsed = tryParseLoopCycles(content);

    if (!parsed) {
      console.error("Failed to parse loop sequence response", content);
      return NextResponse.json<DirectorErrorResponse>(
        { error: "Failed to generate loop sequence" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Failed to generate loop sequence", error);
    return NextResponse.json<DirectorErrorResponse>(
      { error: "Failed to generate loop sequence" },
      { status: 500 }
    );
  }
}

function tryParseLoopCycles(content: string): LoopCycleJSON[] | null {
  const sanitized = content.trim();

  const jsonCandidates: string[] = [];
  if (sanitized.startsWith("{")) {
    jsonCandidates.push(sanitized);
  }

  const fencedMatch = sanitized.match(/```json([\s\S]*?)```/i);
  if (fencedMatch) {
    jsonCandidates.push(fencedMatch[1].trim());
  }

  const arrayMatch = sanitized.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonCandidates.push(arrayMatch[0]);
  }

  for (const candidate of jsonCandidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        return parsed as LoopCycleJSON[];
      }
    } catch (error) {
      console.error("Failed to parse candidate loop JSON", error);
    }
  }

  return null;
}

function isImagePromptRequest(value: unknown): value is ImagePromptDirectorRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (record.mode !== "image_prompt") {
    return false;
  }

  const payload = record.payload;
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const data = payload as ImagePromptPayload;
  if (typeof data.vision_seed !== "string") {
    return false;
  }

  if (typeof data.model !== "string") {
    return false;
  }

  if (!isImagePromptSelectedOptions(data.selectedOptions)) {
    return false;
  }

  if (
    data.references !== undefined &&
    (!Array.isArray(data.references) ||
      data.references.some((item) => typeof item !== "string"))
  ) {
    return false;
  }

  return true;
}

function isImagePromptSelectedOptions(
  value: ImagePromptSelectedOptions | undefined
): value is ImagePromptSelectedOptions {
  if (!value || typeof value !== "object") {
    return false;
  }

  const { motionCues, stylePacks } = value;

  if (!Array.isArray(motionCues) || !Array.isArray(stylePacks)) {
    return false;
  }

  return true;
}

function isLoopSequenceRequest(value: unknown): value is LoopDirectorRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return record.mode === "loop_sequence";
}

function formatSelectedOptions(options: ImagePromptSelectedOptions): string {
  const lines: string[] = [];

  const pushSelection = (label: string, selection?: VisualOptionSelection) => {
    if (selection) {
      lines.push(`${label}: ${selection.label} — ${selection.prompt_snippet}`);
    }
  };

  pushSelection("Camera angle", options.cameraAngle);
  pushSelection("Shot size", options.shotSize);
  pushSelection("Composition", options.compositionTechnique);
  pushSelection("Lighting", options.lightingVocabulary);
  pushSelection("Color palette", options.colorPalette);

  if (options.motionCues.length > 0) {
    lines.push(
      "Motion cues:\n" +
        options.motionCues
          .map((cue) => `- ${cue.label} — ${cue.prompt_snippet}`)
          .join("\n")
    );
  }

  if (options.stylePacks.length > 0) {
    lines.push(
      "Style packs:\n" +
        options.stylePacks
          .map((pack) => `- ${pack.label} — ${pack.prompt_snippet}`)
          .join("\n")
    );
  }

  return lines.join("\n\n");
}
