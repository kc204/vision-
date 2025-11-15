import { NextResponse } from "next/server";
import OpenAI from "openai";

type VideoPlanRequest = {
  scriptText: string;
  tone: "informative" | "hype" | "calm" | "dark" | "inspirational";
  visualStyle: "realistic" | "stylized" | "anime" | "mixed-media";
  aspectRatio: "16:9" | "9:16";
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

    const body = (await request.json()) as VideoPlanRequest;

    if (!body.scriptText || !body.tone || !body.visualStyle || !body.aspectRatio) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a YouTube Cinematic Director & Visual Story Architect.
You receive a video script and style preferences.
Your job is to split the script into 5–12 scenes, craft detailed JSON objects for each scene, and produce a thumbnail concept tied to the hook.
You are talking to another program, not a human. Respond ONLY with valid JSON matching the requested schema.`;

    const userPrompt = `SCRIPT:\n${body.scriptText}\n\nTONE:\n${body.tone}\n\nVISUAL STYLE:\n${body.visualStyle}\n\nASPECT RATIO:\n${body.aspectRatio}\n\nInstructions:\n- Create between 5 and 12 scenes depending on script length.\n- For each scene, fill in all required fields.\n- Then provide one thumbnailConcept tied to the main hook.\n\nReturn JSON in the following format:\n{\n  "scenes": [ ... ],\n  "thumbnailConcept": "..."\n}\n\nRequired JSON schema:\n{\n  "scenes": [\n    {\n      "segment_title": "Scene X – Short title",\n      "scene_description": "Visual story for this scene.",\n      "main_subject": "Who or what anchors the frame.",\n      "camera_movement": "How the camera moves or stays still.",\n      "visual_tone": "Lighting, palette, atmosphere.",\n      "motion": "What moves in the scene.",\n      "mood": "Emotional energy.",\n      "narrative": "What this moment means thematically.",\n      "sound_suggestion": "Ambient or music idea.",\n      "text_overlay": "Optional on-screen text.",\n      "voice_timing_hint": "Approx seconds used by this scene.",\n      "broll_suggestions": "Quick extra shots.",\n      "graphics_callouts": "Labels or lower-thirds.",\n      "editor_notes": "Where to cut, pacing notes.",\n      "continuity_lock": {\n        "subject_identity": "What must stay consistent.",\n        "lighting_and_palette": "Colors and light that should match.",\n        "camera_grammar": "Lens/movement patterns to keep.",\n        "environment_motif": "Repeating background elements."\n      },\n      "acceptance_check": [\n        "Short bullets for continuity rules"\n      ]\n    }\n  ],\n  "thumbnailConcept": "One-line idea for a strong thumbnail tied to the hook."\n}`;

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
        { error: "Failed to generate video plan" },
        { status: 500 }
      );
    }

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response", parseError, content);
      return NextResponse.json(
        { error: "Failed to generate video plan" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unhandled error generating video plan", error);
    return NextResponse.json(
      { error: "Failed to generate video plan" },
      { status: 500 }
    );
  }
}
