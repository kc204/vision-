export type DirectorMode = "video_plan";

export type AspectRatioOption = "16:9" | "9:16" | "1:1";

export type DirectorRequest = {
  mode: DirectorMode;
  visionSeed: string;
  script: string;
  tone: string;
  style: string;
  aspectRatio: AspectRatioOption;
  lighting?: string;
  composition?: string;
};

export type VideoPlanThumbnail = {
  title?: string;
  description?: string;
  prompt: string;
};

export type VideoPlanScene = {
  id: string;
  title: string;
  summary?: string;
  description?: string;
  prompt: string;
  voiceover?: string;
  duration?: string;
};

export type VideoPlanResponse = {
  mode: "video_plan";
  thumbnail: VideoPlanThumbnail;
  scenes: VideoPlanScene[];
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

export function parseVideoPlanResponse(payload: unknown): VideoPlanResponse {
  if (!payload || typeof payload !== "object") {
    throw new Error("Director response is not an object");
  }

  const data = payload as Record<string, unknown>;

  if (data.mode !== "video_plan") {
    throw new Error("Director response mode mismatch");
  }

  if (!data.thumbnail || typeof data.thumbnail !== "object") {
    throw new Error("Director response is missing a thumbnail plan");
  }

  const thumbnailData = data.thumbnail as Record<string, unknown>;
  const thumbnailPrompt = thumbnailData.prompt;

  if (!isNonEmptyString(thumbnailPrompt)) {
    throw new Error("Director thumbnail prompt is required");
  }

  if (!Array.isArray(data.scenes) || data.scenes.length === 0) {
    throw new Error("Director response must include at least one scene");
  }

  const scenes: VideoPlanScene[] = data.scenes.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`Scene ${index + 1} is not an object`);
    }

    const sceneData = entry as Record<string, unknown>;
    const prompt = sceneData.prompt ?? sceneData.visual_prompt;

    if (!isNonEmptyString(prompt)) {
      throw new Error(`Scene ${index + 1} is missing a prompt`);
    }

    const idValue = sceneData.id;
    const titleValue = sceneData.title ?? sceneData.segment_title;

    const id = isNonEmptyString(idValue)
      ? idValue
      : `scene-${index + 1}`;
    const title = isNonEmptyString(titleValue)
      ? (titleValue as string)
      : `Scene ${index + 1}`;

    return {
      id,
      title,
      prompt: prompt as string,
      summary: optionalString(sceneData.summary ?? sceneData.synopsis),
      description: optionalString(
        sceneData.description ?? sceneData.scene_description
      ),
      voiceover: optionalString(sceneData.voiceover ?? sceneData.voice_over),
      duration: optionalString(sceneData.duration ?? sceneData.length),
    } satisfies VideoPlanScene;
  });

  return {
    mode: "video_plan",
    thumbnail: {
      prompt: thumbnailPrompt,
      title: optionalString(thumbnailData.title),
      description: optionalString(
        thumbnailData.description ?? thumbnailData.summary
      ),
    },
    scenes,
  } satisfies VideoPlanResponse;
}
