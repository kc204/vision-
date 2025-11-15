export type DirectorMode = "image_prompt" | "loop_sequence" | "video_plan";

export type ImagePromptPayload = {
  visionSeedText: string;
  modelChoice: "sdxl" | "flux" | "illustrious";
  cameraAngleId?: string;
  shotSizeId?: string;
  compositionTechniqueId?: string;
  lightingVocabularyId?: string;
  colorPaletteId?: string;
  motionCueIds?: string[];
  stylePackIds?: string[];
};

export type ImagePromptDirectorRequest = {
  mode: "image_prompt";
  payload: ImagePromptPayload;
};

export type AspectRatio = "16:9" | "9:16";

export type SceneDraft = {
  id: string;
  title: string;
  summary: string;
  question: string;
};

export type SceneAnswer = {
  sceneId: string;
  answer: string;
};

export type LoopSequencePayload = {
  loopSeedText: string;
  durationSeconds?: number;
  aspectRatio?: AspectRatio | "1:1";
  vibe?: string;
  references?: string[];
};

export type LoopSequenceDirectorRequest = {
  mode: "loop_sequence";
  payload: LoopSequencePayload;
};

export type VideoPlanPayload = {
  visionSeed: {
    scriptText: string;
    tone: string;
    palette: string;
    references: string[];
    aspectRatio: AspectRatio;
  };
  segmentation?: SceneDraft[];
  sceneAnswers?: SceneAnswer[];
  directRender?: boolean;
  finalPlanOverride?: unknown;
};

export type VideoPlanDirectorRequest = {
  mode: "video_plan";
  payload: VideoPlanPayload;
};

export type DirectorRequest =
  | ImagePromptDirectorRequest
  | VideoPlanDirectorRequest
  | LoopSequenceDirectorRequest;
