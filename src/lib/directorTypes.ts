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

export type LoopSequenceDirectorRequest = {
  type: "loop_sequence";
  loopSeedText: string;
  durationSeconds?: number;
  aspectRatio?: AspectRatio | "1:1";
  vibe?: string;
  references?: string[];
};

export type VideoPlanDirectorRequest = {
  type: "video_plan";
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

export type DirectorRequest =
  | ImagePromptDirectorRequest
  | VideoPlanDirectorRequest
  | LoopSequenceDirectorRequest;
