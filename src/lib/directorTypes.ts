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

export interface SceneJSON {
  id: string;
  title: string;
  summary: string;
  question: string;
}

export interface SceneAnswerPayload {
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
  images?: string[];
}

export interface ContinuityLock {
  subject_identity: string;
  lighting_and_palette: string;
  camera_grammar: string;
  environment_motif: string;
}

export interface FinalScenePlan {
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
}

export interface TransitionPlan {
  from_scene_id: string;
  to_scene_id: string;
  style: string;
  description: string;
  motion_design: string;
  audio_bridge: string;
}

export interface ThumbnailConcept {
  logline: string;
  composition: string;
  color_notes: string;
  typography: string;
}

export interface VisionSeedSummary {
  hook: string;
  story_summary: string;
  tone_directives: string;
  palette_notes: string;
  reference_synthesis: string;
  aspectRatio: AspectRatio;
}

export interface ExportPayload {
  version: string;
  aspectRatio: AspectRatio;
  tone: string;
  palette: string;
  references: string[];
  scenes: FinalScenePlan[];
  transitions: TransitionPlan[];
  thumbnailConcept: ThumbnailConcept;
}

export interface RenderJob {
  id: string;
  status: string;
  etaSeconds?: number | null;
  raw?: unknown;
}

export interface CollectDetailsResponse {
  stage: "collect_details";
  visionSeed: VisionSeedSummary;
  segmentation: SceneJSON[];
}

export interface CompletePlanResponse {
  stage: "complete";
  visionSeed: VisionSeedSummary;
  scenes: FinalScenePlan[];
  transitions: TransitionPlan[];
  thumbnailConcept: ThumbnailConcept;
  exportPayload: ExportPayload;
  renderJob?: RenderJob;
}

export type VideoPlanResponse =
  | CollectDetailsResponse
  | CompletePlanResponse;

export interface LoopKeyframe {
  frame: number;
  description: string;
  camera?: string;
  motion?: string;
  lighting?: string;
}

export interface LoopCycleJSON {
  cycle_id: string;
  title?: string;
  beat_summary?: string;
  prompt: string;
  start_frame: number;
  loop_length: number;
  continuity_lock: ContinuityLock;
  keyframes?: LoopKeyframe[];
  mood_profile?: string;
}

export interface LoopSequenceDirectorRequest {
  mode: LoopSequenceMode;
  visionSeed: string;
  startFrame?: number;
  loopLength?: number;
  includeMoodProfile?: boolean;
  images?: string[];
}

export type VideoPlanDirectorRequest = {
  mode: "video_plan";
  payload: VideoPlanPayload;
};

export type DirectorRequest =
  | ImagePromptDirectorRequest
  | VideoPlanDirectorRequest
  | LoopSequenceDirectorRequest;
