import { NextResponse } from "next/server";
import OpenAI from "openai";

type ContinuityLock = {
  subject_identity: string;
  lighting_and_palette: string;
  camera_grammar: string;
  environment_motif: string;
};

type LoopStoryBeat = {
  title: string;
  summary: string;
  continuity_lock: ContinuityLock;
  acceptance_check: string[];
};

type LoopEndFrame = {
  frame_prompt: string;
  motion_guidance: string;
  transition_signal: string;
};

type LoopCycle = {
  cycle: number;
  storyBeat: LoopStoryBeat;
  endFrame: LoopEndFrame;
  autopilot_directive: string;
};

type LoopCycleRequest = {
  visionSeed: string;
  inspirationReferences?: string;
  startFrames?: string[];
  previousCycles?: LoopCycle[];
  predictiveMode: boolean;
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

    const body = (await request.json()) as LoopCycleRequest;

    if (!body.visionSeed || body.visionSeed.trim().length === 0) {
      return NextResponse.json(
        { error: "Vision Seed is required" },
        { status: 400 }
      );
    }

    const startFramesList = body.startFrames && body.startFrames.length > 0
      ? body.startFrames
      : [];

    const previousCyclesText = body.previousCycles && body.previousCycles.length > 0
      ? JSON.stringify(body.previousCycles, null, 2)
      : "[]";

    const systemPrompt = `You are the Autonomous Loop Director, a specialist that keeps animated loops coherent forever.
You always respond with strict JSON.
Every cycle you receive the Vision Seed, inspiration references, optional start frames, and a log of previous cycles.
Your job is to: (1) extend the loop with the next story beat, (2) define the new end frame, and (3) reinforce continuity locks that must remain true.
Never break the JSON schema, never include commentary, and never forget continuity_lock and acceptance_check.`;

    const userPrompt = `VISION SEED:\n${body.visionSeed.trim()}\n\nINSPIRATION REFERENCES:\n${
      body.inspirationReferences?.trim() || "None provided"
    }\n\nSTART FRAMES:\n${
      startFramesList.length > 0 ? startFramesList.join("\n") : "None provided"
    }\n\nPREDICTIVE MODE:\n${body.predictiveMode ? "ACTIVE" : "OFF"}\n\nPREVIOUS CYCLES LOG:\n${previousCyclesText}\n\nReturn JSON that matches this schema exactly:\n{\n  "cycle": <next cycle index number>,\n  "storyBeat": {\n    "title": "Short headline for this beat",\n    "summary": "2-3 sentence summary of what unfolds",\n    "continuity_lock": {\n      "subject_identity": "Maintain who/what is focal",\n      "lighting_and_palette": "Color/lighting that must carry forward",\n      "camera_grammar": "Lens, movement, or framing rules that persist",\n      "environment_motif": "Environmental elements that need to repeat"\n    },\n    "acceptance_check": ["Bullet list of conditions to verify continuity"]\n  },\n  "endFrame": {\n    "frame_prompt": "Describe the last frame users should render",\n    "motion_guidance": "Note how motion resolves into the loop seam",\n    "transition_signal": "What tells us it's time to hand off to the next cycle"\n  },\n  "autopilot_directive": "If predictive mode is active, give the operator instructions for auto-triggering the next cycle; otherwise, say how to prepare manually."\n}`;

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
        { error: "Failed to generate loop cycle" },
        { status: 500 }
      );
    }

    try {
      const parsed = JSON.parse(content) as LoopCycle;
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response", parseError, content);
      return NextResponse.json(
        { error: "Failed to generate loop cycle" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unhandled error generating loop cycle", error);
    return NextResponse.json(
      { error: "Failed to generate loop cycle" },
      { status: 500 }
    );
  }
}
