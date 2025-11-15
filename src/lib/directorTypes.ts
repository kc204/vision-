export type VisualOptionSelection = {
  id: string;
  label: string;
  prompt_snippet: string;
};

export type ImagePromptSelectedOptions = {
  cameraAngle?: VisualOptionSelection;
  shotSize?: VisualOptionSelection;
  compositionTechnique?: VisualOptionSelection;
  lightingVocabulary?: VisualOptionSelection;
  colorPalette?: VisualOptionSelection;
  motionCues: VisualOptionSelection[];
  stylePacks: VisualOptionSelection[];
};

export type ImagePromptPayload = {
  vision_seed: string;
  mood_profile: string;
  constraints: string;
  model: "sdxl" | "flux" | "illustrious";
  selectedOptions: ImagePromptSelectedOptions;
  references?: string[];
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

export type LoopSequenceDirectorRequest = {
  mode: "loop_sequence";
  visionSeed: string;
  startFrame?: number;
  loopLength?: number;
  includeMoodProfile?: boolean;
  referenceImage?: string | null;
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
