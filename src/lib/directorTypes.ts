export type VisualSelectionMap = {
  cameraAngles: string[];
  shotSizes: string[];
  composition: string[];
  cameraMovement: string[];
  lightingStyles: string[];
  colorPalettes: string[];
  atmosphere: string[];
};

export type ImagePromptDirectorRequest = {
  type: "image_prompt";
  visionSeedText: string;
  modelChoice: "sdxl" | "flux" | "illustrious";
  selectedOptions: VisualSelectionMap;
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
