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
    const body = await request.json();
    const directorRequest = parseDirectorRequest(body);

    const text = await callDirectorCore(directorRequest);

    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof DirectorValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Unhandled director error", error);
    return NextResponse.json(
      { error: "Failed to call Director Core" },
      { status: 500 }
    );
  }
}

function parseDirectorRequest(body: unknown): DirectorRequest {
  if (!isRecord(body)) {
    throw new DirectorValidationError("Request body must be a JSON object");
  }

  const { mode, payload } = body;

  if (typeof mode !== "string") {
    throw new DirectorValidationError("mode is required");
  }

  if (!isRecord(payload)) {
    throw new DirectorValidationError("payload must be an object");
  }

  switch (mode) {
    case "image_prompt":
      return {
        mode,
        payload: parseImagePromptPayload(payload),
      } satisfies ImagePromptDirectorRequest;
    case "loop_sequence":
      return {
        mode,
        payload: parseLoopSequencePayload(payload),
      } satisfies LoopSequenceDirectorRequest;
    case "video_plan":
      return {
        mode,
        payload: parseVideoPlanPayload(payload),
      } satisfies VideoPlanDirectorRequest;
    default:
      throw new DirectorValidationError(`Unsupported director mode: ${mode}`);
  }
}

function parseImagePromptPayload(payload: UnknownRecord): ImagePromptDirectorRequest["payload"] {
  const { visionSeedText, modelChoice } = payload;

  if (!isNonEmptyString(visionSeedText)) {
    throw new DirectorValidationError("visionSeedText is required");
  }

  if (typeof modelChoice !== "string" || !VALID_IMAGE_MODELS.has(modelChoice)) {
    throw new DirectorValidationError(
      "modelChoice must be one of: sdxl, flux, illustrious"
    );
  }

  const result: ImagePromptDirectorRequest["payload"] = {
    visionSeedText: visionSeedText.trim(),
    modelChoice,
  };

  if (payload.cameraAngleId !== undefined) {
    result.cameraAngleId = parseOptionalString(payload.cameraAngleId, "cameraAngleId");
  }

  if (payload.shotSizeId !== undefined) {
    result.shotSizeId = parseOptionalString(payload.shotSizeId, "shotSizeId");
  }

  if (payload.compositionTechniqueId !== undefined) {
    result.compositionTechniqueId = parseOptionalString(
      payload.compositionTechniqueId,
      "compositionTechniqueId"
    );
  }

  if (payload.lightingVocabularyId !== undefined) {
    result.lightingVocabularyId = parseOptionalString(
      payload.lightingVocabularyId,
      "lightingVocabularyId"
    );
  }

  if (payload.colorPaletteId !== undefined) {
    result.colorPaletteId = parseOptionalString(
      payload.colorPaletteId,
      "colorPaletteId"
    );
  }

  if (payload.motionCueIds !== undefined) {
    result.motionCueIds = parseStringArray(payload.motionCueIds, "motionCueIds");
  }

  if (payload.stylePackIds !== undefined) {
    result.stylePackIds = parseStringArray(payload.stylePackIds, "stylePackIds");
  }

  return result;
}

function parseLoopSequencePayload(payload: UnknownRecord): LoopSequenceDirectorRequest["payload"] {
  const { loopSeedText } = payload;

  if (!isNonEmptyString(loopSeedText)) {
    throw new DirectorValidationError("loopSeedText is required");
  }

  const result: LoopSequenceDirectorRequest["payload"] = {
    loopSeedText: loopSeedText.trim(),
  };

  if (payload.durationSeconds !== undefined) {
    if (!isFiniteNumber(payload.durationSeconds)) {
      throw new DirectorValidationError("durationSeconds must be a number");
    }
    result.durationSeconds = Number(payload.durationSeconds);
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
    result.aspectRatio = payload.aspectRatio as LoopSequenceDirectorRequest["payload"]["aspectRatio"];
  }

  if (payload.vibe !== undefined) {
    result.vibe = parseOptionalString(payload.vibe, "vibe");
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

    return {
      id: id.trim(),
      title: title.trim(),
      summary: summary.trim(),
      question: question.trim(),
    } satisfies SceneDraft;
  });
}

function parseSceneAnswerArray(value: unknown): SceneAnswer[] {
  if (!Array.isArray(value)) {
    throw new DirectorValidationError("sceneAnswers must be an array");
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new DirectorValidationError(
        `sceneAnswers[${index}] must be an object`
      );
    }

    const { sceneId, answer } = item;

    if (!isNonEmptyString(sceneId)) {
      throw new DirectorValidationError(
        `sceneAnswers[${index}].sceneId is required`
      );
    }

    if (!isNonEmptyString(answer)) {
      throw new DirectorValidationError(
        `sceneAnswers[${index}].answer is required`
      );
    }

    return {
      sceneId: sceneId.trim(),
      answer: answer.trim(),
    } satisfies SceneAnswer;
  });
}
