import { NextResponse } from "next/server";
import OpenAI from "openai";

import {
  LoopCycleJSON,
  LoopSequenceDirectorRequest,
} from "@/lib/directorTypes";

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

    const body = (await request.json()) as Partial<LoopSequenceDirectorRequest>;

    if (body.mode !== "loop_sequence") {
      return NextResponse.json<DirectorErrorResponse>(
        { error: "Unsupported director mode" },
        { status: 400 }
      );
    }

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

    const referenceImage = body.images?.[0];
    const referenceHint = referenceImage
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
    console.error("Unhandled director error", error);
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
      if (Array.isArray((parsed as { cycles?: unknown }).cycles)) {
        return (parsed as { cycles: LoopCycleJSON[] }).cycles;
      }
    } catch (error) {
      console.warn("Failed to parse candidate", error);
    }
  }

  return null;
}
