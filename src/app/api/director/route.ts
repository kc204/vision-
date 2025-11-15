import { NextResponse } from "next/server";
import OpenAI from "openai";

type ContinuityLocks = {
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
  start_frame_description: string;
  loop_length: number;
  continuity_locks: ContinuityLocks;
  keyframes?: LoopKeyframe[];
  mood_profile?: string;
  acceptance_checks?: string[];
};

type LoopDirectorPayload = {
  vision_seed_text: string;
  start_frame_description: string;
  loop_length: number;
  include_mood_profile?: boolean;
  reference_images?: string[];
};

type LoopDirectorRequest = {
  mode: "loop_sequence";
  payload?: LoopDirectorPayload;
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

    const body = (await request.json()) as Partial<LoopDirectorRequest>;

    if (body.mode !== "loop_sequence") {
      return NextResponse.json<DirectorErrorResponse>(
        { error: "Unsupported director mode" },
        { status: 400 }
      );
    }

    if (!body.payload?.vision_seed_text?.trim()) {
      return NextResponse.json<DirectorErrorResponse>(
        { error: "vision_seed_text is required" },
        { status: 400 }
      );
    }

    if (!body.payload.start_frame_description?.trim()) {
      return NextResponse.json<DirectorErrorResponse>(
        { error: "start_frame_description is required" },
        { status: 400 }
      );
    }

    const loopLength = Number.isFinite(body.payload.loop_length)
      ? Math.max(1, Number(body.payload.loop_length))
      : 48;

    const includeMoodProfile = Boolean(body.payload.include_mood_profile);

    const referenceCount = body.payload.reference_images?.length ?? 0;
    const referenceHint = referenceCount
      ? `The user supplied ${referenceCount} base64-encoded reference image${referenceCount === 1 ? "" : "s"}. Use them to inform continuity notes and tone, but do not echo the raw strings.`
      : "No reference images were provided.";

    const moodProfileDirective = includeMoodProfile
      ? "If helpful, summarize a short mood profile that can be reused when refining the loop later."
      : "Do not invent a mood profile section unless the loop inherently requires it.";

    const systemPrompt = `You are Loop Sequence Director — an animation planning assistant for short seamless loops. You translate casual language into production-ready JSON instructions. Always respond with JSON only.`;

    const userPrompt = `MODE: loop_sequence
VISION SEED:
${body.payload.vision_seed_text.trim()}

START FRAME DESCRIPTION:
${body.payload.start_frame_description.trim()}

LOOP LENGTH: ${loopLength} frames
${referenceHint}
${moodProfileDirective}

Design 2-4 cohesive loop cycles that explore the idea while keeping the loop seamless.
Each cycle should:
- Provide a descriptive prompt capturing the visual moment.
- Lock key continuity details (subjects, lighting/palette, camera grammar, environment motif) inside a continuity_locks object.
- Outline 3-5 keyframes describing how motion evolves between the start frame and the loop reset.
- Mention whether a mood profile should be remembered when include_mood_profile is true.
- Provide 2-3 acceptance_checks that can be verified during production.

Return a JSON array of cycles using this schema:
[
  {
    "cycle_id": "loop-cycle-1",
    "title": "Optional short title",
    "beat_summary": "One-sentence summary of the loop",
    "prompt": "Primary generation prompt",
    "start_frame_description": "${body.payload.start_frame_description.trim().replace(/"/g, '\\"')}",
    "loop_length": ${loopLength},
    "continuity_locks": {
      "subject_identity": "...",
      "lighting_and_palette": "...",
      "camera_grammar": "...",
      "environment_motif": "..."
    },
    "keyframes": [
      {
        "frame": 0,
        "description": "Describe the visual moment",
        "camera": "Optional camera note",
        "motion": "Optional motion note",
        "lighting": "Optional lighting note"
      }
    ],
    "mood_profile": "Only when include_mood_profile is true",
    "acceptance_checks": ["Shot stays seamless at the reset", "Color temperature matches the mood"]
  }
]`;

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

    const parsed = JSON.parse(content.trim()) as unknown;

    if (!Array.isArray(parsed)) {
      console.error("Loop sequence response was not an array", parsed);
      return NextResponse.json<DirectorErrorResponse>(
        { error: "Failed to generate loop sequence" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Unhandled director error", error);
    return NextResponse.json<DirectorErrorResponse>(
      { error: "Failed to generate loop sequence" },
      { status: 500 }
    );
  }
}
