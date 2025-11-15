import { NextResponse } from "next/server";
import OpenAI from "openai";

type AspectRatio = "16:9" | "9:16";

type VisionSeedInput = {
  scriptText: string;
  tone: string;
  palette: string;
  references: string[];
  aspectRatio: AspectRatio;
};

type SceneDraft = {
  id: string;
  title: string;
  summary: string;
  question: string;
};

type SceneAnswer = {
  sceneId: string;
  answer: string;
};

type ContinuityLock = {
  subject_identity: string;
  lighting_and_palette: string;
  camera_grammar: string;
  environment_motif: string;
};

type FinalScenePlan = {
  id: string;
  segment_title: string;
  scene_description: string;
  main_subject: string;
  camera_movement: string;
  visual_tone: string;
  motion: string;
  mood: string;
  narrative: string;
  sound_suggestion: string;
  text_overlay: string;
  voice_timing_hint: string;
  broll_suggestions: string;
  graphics_callouts: string;
  editor_notes: string;
  continuity_lock: ContinuityLock;
  acceptance_check: string[];
  followup_answer: string;
};

type TransitionPlan = {
  from_scene_id: string;
  to_scene_id: string;
  style: string;
  description: string;
  motion_design: string;
  audio_bridge: string;
};

type ThumbnailConcept = {
  logline: string;
  composition: string;
  color_notes: string;
  typography: string;
};

type VisionSeedSummary = {
  hook: string;
  story_summary: string;
  tone_directives: string;
  palette_notes: string;
  reference_synthesis: string;
};

type CollectDetailsResponse = {
  stage: "collect_details";
  visionSeed: VisionSeedSummary & { aspectRatio: AspectRatio };
  segmentation: SceneDraft[];
};

type ExportPayload = {
  version: string;
  aspectRatio: AspectRatio;
  tone: string;
  palette: string;
  references: string[];
  scenes: FinalScenePlan[];
  transitions: TransitionPlan[];
  thumbnailConcept: ThumbnailConcept;
};

type RenderJob = {
  id: string;
  status: string;
  etaSeconds?: number | null;
  raw?: unknown;
};

type CompletePlanResponse = {
  stage: "complete";
  visionSeed: VisionSeedSummary & { aspectRatio: AspectRatio };
  scenes: FinalScenePlan[];
  transitions: TransitionPlan[];
  thumbnailConcept: ThumbnailConcept;
  exportPayload: ExportPayload;
  renderJob?: RenderJob;
};

type VideoPlanRequest = {
  visionSeed: VisionSeedInput;
  segmentation?: SceneDraft[];
  sceneAnswers?: SceneAnswer[];
  directRender?: boolean;
  finalPlanOverride?: CompletePlanResponse;
};

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const GEMINI_VIDEO_MODEL =
  process.env.GEMINI_VIDEO_MODEL ?? "gemini-1.5-pro-video-preview";
const GEMINI_API_BASE =
  process.env.GEMINI_API_BASE ?? "https://generativelanguage.googleapis.com/v1beta";

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

    if (!body.visionSeed) {
      return NextResponse.json(
        { error: "Missing visionSeed payload" },
        { status: 400 }
      );
    }

    const { visionSeed, segmentation, sceneAnswers, directRender, finalPlanOverride } = body;

    if (!visionSeed.scriptText?.trim()) {
      return NextResponse.json(
        { error: "visionSeed.scriptText is required" },
        { status: 400 }
      );
    }

    if (!visionSeed.tone?.trim()) {
      return NextResponse.json(
        { error: "visionSeed.tone is required" },
        { status: 400 }
      );
    }

    if (!visionSeed.palette?.trim()) {
      return NextResponse.json(
        { error: "visionSeed.palette is required" },
        { status: 400 }
      );
    }

    if (!visionSeed.aspectRatio) {
      return NextResponse.json(
        { error: "visionSeed.aspectRatio is required" },
        { status: 400 }
      );
    }

    const normalizedVisionSeed: VisionSeedInput = {
      scriptText: visionSeed.scriptText,
      tone: visionSeed.tone,
      palette: visionSeed.palette,
      references: Array.isArray(visionSeed.references)
        ? visionSeed.references
        : typeof visionSeed.references === "string"
        ? visionSeed.references
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
      aspectRatio: visionSeed.aspectRatio,
    };

    if (finalPlanOverride && directRender) {
      const renderJob = await triggerGeminiRender(
        finalPlanOverride.exportPayload ?? finalPlanOverride
      );
      const response: CompletePlanResponse = {
        ...finalPlanOverride,
        renderJob,
        stage: "complete",
      };
      return NextResponse.json(response satisfies CompletePlanResponse);
    }

    if (!segmentation || !sceneAnswers || sceneAnswers.length === 0) {
      const collectResponse = await generateSegmentation(normalizedVisionSeed);
      return NextResponse.json(collectResponse satisfies CollectDetailsResponse);
    }

    const completePlan = await generateCompletePlan(
      normalizedVisionSeed,
      segmentation,
      sceneAnswers
    );

    let renderJob: RenderJob | undefined;
    if (directRender) {
      renderJob = await triggerGeminiRender(completePlan.exportPayload);
    }

    const response: CompletePlanResponse = {
      ...completePlan,
      renderJob,
    };

    return NextResponse.json(response satisfies CompletePlanResponse);
  } catch (error) {
    console.error("Unhandled error generating video plan", error);
    return NextResponse.json(
      { error: "Failed to generate video plan" },
      { status: 500 }
    );
  }
}

async function generateSegmentation(
  visionSeed: VisionSeedInput
): Promise<CollectDetailsResponse> {
  const referencesBlock =
    visionSeed.references.length > 0
      ? visionSeed.references.map((ref, index) => `${index + 1}. ${ref}`).join("\\n")
      : "None provided";

  const systemPrompt = `You are Vision Canvas Orchestrator, a senior cinematic director running a multi-step planning pipeline.
Stage goal: take the provided vision seed (script, tone, palette, references) and output a segmentation blueprint.
Respond ONLY with JSON matching the requested schema.`;

  const userPrompt = `VISION SEED SCRIPT:\n${visionSeed.scriptText}\n\nTONE DIRECTIVE:\n${visionSeed.tone}\n\nCOLOR PALETTE NOTES:\n${visionSeed.palette}\n\nCITED REFERENCES:\n${referencesBlock}\n\nASPECT RATIO TARGET:${visionSeed.aspectRatio}\n\nInstructions:\n- Create 6-10 story scenes depending on density.\n- Each scene must have a human-friendly title, a beat summary, and one clarifying question the editor should answer.\n- Questions must be specific and reference the beat context.\n- Provide a refined summary of the overall concept that future stages will reuse.\n\nReturn JSON as:\n{\n  "stage": "collect_details",\n  "visionSeed": {\n    "hook": "...",\n    "story_summary": "...",\n    "tone_directives": "...",\n    "palette_notes": "...",\n    "reference_synthesis": "...",\n    "aspectRatio": "16:9"\n  },\n  "segmentation": [\n    {\n      "id": "scene-1",\n      "title": "Scene title",\n      "summary": "Two sentence beat summary",\n      "question": "Clarifying question to ask"\n    }\n  ]\n}`;

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
    throw new Error("Segmentation model returned no content");
  }

  const parsed = JSON.parse(content) as CollectDetailsResponse;
  return parsed;
}

async function generateCompletePlan(
  visionSeed: VisionSeedInput,
  segmentation: SceneDraft[],
  sceneAnswers: SceneAnswer[]
): Promise<CompletePlanResponse> {
  const answerMap = Object.fromEntries(
    sceneAnswers.map((entry) => [entry.sceneId, entry.answer])
  );

  const segmentationBlock = segmentation
    .map((segment) => {
      const answer = answerMap[segment.id] ?? "";
      return `ID: ${segment.id}\nTITLE: ${segment.title}\nSUMMARY: ${segment.summary}\nQUESTION: ${segment.question}\nANSWER: ${answer}`;
    })
    .join("\n\n---\n\n");

  const referencesBlock =
    visionSeed.references.length > 0
      ? visionSeed.references.map((ref, index) => `${index + 1}. ${ref}`).join("\\n")
      : "None provided";

  const systemPrompt = `You are Vision Canvas Orchestrator continuing pipeline stages 3-5.
You already have scene segmentation with answers.
Produce finished scenes, transition JSONs, and thumbnail concept.
Respond ONLY with JSON matching schema.`;

  const userPrompt = `VISION SEED CONTEXT:\nTone: ${visionSeed.tone}\nPalette: ${visionSeed.palette}\nAspect Ratio: ${visionSeed.aspectRatio}\nReferences:\n${referencesBlock}\n\nSCRIPT SOURCE:\n${visionSeed.scriptText}\n\nSEGMENTATION WITH ANSWERS:\n${segmentationBlock}\n\nReturn JSON as:\n{\n  "stage": "complete",\n  "visionSeed": {\n    "hook": "...",\n    "story_summary": "...",\n    "tone_directives": "...",\n    "palette_notes": "...",\n    "reference_synthesis": "...",\n    "aspectRatio": "16:9"\n  },\n  "scenes": [\n    {\n      "id": "scene-1",\n      "segment_title": "...",\n      "scene_description": "...",\n      "main_subject": "...",\n      "camera_movement": "...",\n      "visual_tone": "...",\n      "motion": "...",\n      "mood": "...",\n      "narrative": "...",\n      "sound_suggestion": "...",\n      "text_overlay": "...",\n      "voice_timing_hint": "...",\n      "broll_suggestions": "...",\n      "graphics_callouts": "...",\n      "editor_notes": "...",\n      "continuity_lock": {\n        "subject_identity": "...",\n        "lighting_and_palette": "...",\n        "camera_grammar": "...",\n        "environment_motif": "..."\n      },\n      "acceptance_check": ["..."],\n      "followup_answer": "Restatement of provided answer"\n    }\n  ],\n  "transitions": [\n    {\n      "from_scene_id": "scene-1",\n      "to_scene_id": "scene-2",\n      "style": "Cut/Dissolve/...",\n      "description": "Narrative purpose",\n      "motion_design": "Motion design notes",\n      "audio_bridge": "How audio transitions"\n    }\n  ],\n  "thumbnailConcept": {\n    "logline": "...",\n    "composition": "...",\n    "color_notes": "...",\n    "typography": "..."\n  },\n  "exportPayload": {\n    "version": "v1",\n    "aspectRatio": "16:9",\n    "tone": "...",\n    "palette": "...",\n    "references": ["..."],\n    "scenes": [],\n    "transitions": [],\n    "thumbnailConcept": {\n      "logline": "...",\n      "composition": "...",\n      "color_notes": "...",\n      "typography": "..."\n    }\n  }
}`;

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
    throw new Error("Complete plan model returned no content");
  }

  const parsed = JSON.parse(content) as CompletePlanResponse;
  return parsed;
}

async function triggerGeminiRender(payload: ExportPayload | CompletePlanResponse) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY env variable");
  }

  const payloadForGemini =
    "exportPayload" in (payload as CompletePlanResponse)
      ? (payload as CompletePlanResponse).exportPayload
      : payload;

  const url = `${GEMINI_API_BASE}/models/${GEMINI_VIDEO_MODEL}:generateVideo?key=${process.env.GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Render a video using this orchestrated plan. Return only job metadata.\n${JSON.stringify(
              payloadForGemini
            )}`,
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini render failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    jobId?: string;
    name?: string;
    status?: string;
    state?: string;
    etaSeconds?: number;
    eta?: number;
    [key: string]: unknown;
  };

  const job: RenderJob = {
    id: data.jobId ?? data.name ?? "gemini-job",
    status: data.status ?? data.state ?? "submitted",
    etaSeconds: data.etaSeconds ?? data.eta ?? null,
    raw: data,
  };

  return job;
}
