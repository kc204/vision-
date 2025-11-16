export type ImagePromptMode = "image_prompt";
export type VideoPlanMode = "video_plan";
export type LoopSequenceMode = "loop_sequence";

export type DirectorMode =
  | ImagePromptMode
  | VideoPlanMode
  | LoopSequenceMode;

export type ImagePromptPayload = {
  vision_seed_text: string;
  model: "sdxl" | "flux" | "illustrious";
  selectedOptions: {
    cameraAngles: string[];
    shotSizes: string[];
    composition: string[];
    cameraMovement: string[];
    lightingStyles: string[];
    colorPalettes: string[];
    atmosphere: string[];
  };
  mood_profile: string | null;
  constraints: string | null;
};

export type VideoPlanPayload = {
  vision_seed_text: string;
  script_text: string;
  tone: "informative" | "hype" | "calm" | "dark" | "inspirational";
  visual_style: "realistic" | "stylized" | "anime" | "mixed-media";
  aspect_ratio: "16:9" | "9:16";
  mood_profile: string | null;
  cinematic_control_options?: {
    cameraAngles?: string[];
    shotSizes?: string[];
    composition?: string[];
    cameraMovement?: string[];
    lightingStyles?: string[];
    colorPalettes?: string[];
    atmosphere?: string[];
  };
};

export type LoopSequencePayload = {
  vision_seed_text: string;
  start_frame_description: string;
  loop_length: number | null;
  mood_profile: string | null;
  cameraAngles?: string[];
  shotSizes?: string[];
  composition?: string[];
  cameraMovement?: string[];
  lightingStyles?: string[];
  colorPalettes?: string[];
  atmosphere?: string[];
};

export type DirectorRequest =
  | { mode: "image_prompt"; payload: ImagePromptPayload; images?: string[] }
  | { mode: "video_plan"; payload: VideoPlanPayload; images?: string[] }
  | { mode: "loop_sequence"; payload: LoopSequencePayload; images?: string[] };

export type GeneratedImage = {
  mimeType: string;
  data: string;
  altText?: string;
};

export type GeneratedVideo = {
  url?: string;
  mimeType?: string;
  base64?: string;
  posterImage?: string;
  durationSeconds?: number;
  frameRate?: number;
  frames?: string[];
};

export type DirectorMediaFrame = {
  url?: string | null;
  base64?: string | null;
  mimeType?: string | null;
  caption?: string | null;
};

export type DirectorMediaAsset = {
  id?: string | number | null;
  kind?: "image" | "video";
  url?: string | null;
  base64?: string | null;
  mimeType?: string | null;
  posterUrl?: string | null;
  posterBase64?: string | null;
  thumbnailUrl?: string | null;
  thumbnailBase64?: string | null;
  frames?: DirectorMediaFrame[];
  caption?: string | null;
  description?: string | null;
  durationSeconds?: number | null;
  frameRate?: number | null;
};

export type LoopSequenceResult = {
  frames: GeneratedImage[];
  loopLength?: number | null;
  frameRate?: number;
  metadata?: Record<string, unknown>;
};

export type DirectorCoreSuccess =
  | {
      success: true;
      mode: "image_prompt";
      provider: "gemini";
      images: GeneratedImage[];
      promptText?: string;
      metadata?: Record<string, unknown>;
    }
  | {
      success: true;
      mode: "video_plan";
      provider: "veo-3.1";
      videos: GeneratedVideo[];
      storyboard?: unknown;
      metadata?: Record<string, unknown>;
    }
  | {
      success: true;
      mode: "loop_sequence";
      provider: "nano-banana";
      loop: LoopSequenceResult;
    };

export type DirectorCoreError = {
  success: false;
  error: string;
  provider?: string;
  status?: number;
  details?: unknown;
};

export type DirectorCoreResult = DirectorCoreSuccess | DirectorCoreError;

export type DirectorMediaAssetFrame = {
  id?: string | number | null;
  url?: string | null;
  base64?: string | null;
  mimeType?: string | null;
  caption?: string | null;
  description?: string | null;
};

export type DirectorMediaAsset = {
  id?: string | number | null;
  kind?: "image" | "video" | string | null;
  url?: string | null;
  base64?: string | null;
  mimeType?: string | null;
  caption?: string | null;
  description?: string | null;
  posterUrl?: string | null;
  posterBase64?: string | null;
  thumbnailUrl?: string | null;
  thumbnailBase64?: string | null;
  durationSeconds?: number | null;
  frameRate?: number | null;
  width?: number | null;
  height?: number | null;
  frames?: DirectorMediaAssetFrame[];
  metadata?: Record<string, unknown> | null;
};

export type DirectorSuccessResponse<T = unknown> = {
  success: true;
  mode: DirectorMode;
  provider?: string;
  text?: string | null;
  result?: T | null;
  fallbackText?: string | null;
  media?: DirectorMediaAsset[];
  metadata?: Record<string, unknown> | null;
};

export type DirectorErrorResponse = {
  success: false;
  error: string;
  provider?: string;
  status?: number;
  details?: unknown;
};

export type DirectorResponse<T = unknown> =
  | DirectorSuccessResponse<T>
  | DirectorErrorResponse;

export type SceneJSON = {
  segment_title: string;
  scene_description: string;
  main_subject: string;
  camera_movement: string;
  visual_tone: string;
  motion: string;
  mood: string;
  narrative: string;
  sound_suggestion?: string;
  text_overlay?: string;
  voice_timing_hint?: string;
  broll_suggestions?: string;
  graphics_callouts?: string;
  editor_notes?: string;
  continuity_lock: {
    subject_identity: string;
    lighting_and_palette: string;
    camera_grammar: string;
    environment_motif: string;
  };
  acceptance_check: string[];
};

export type VideoPlanResponse = {
  scenes: SceneJSON[];
  thumbnailConcept: string;
};

export type LoopCycleJSON = {
  segment_title: string;
  scene_description: string;
  main_subject: string;
  camera_movement: string;
  visual_tone: string;
  motion: string;
  mood: string;
  narrative: string;
  sound_suggestion?: string;
  continuity_lock: {
    subject_identity: string;
    lighting_and_palette: string;
    camera_grammar: string;
    environment_motif: string;
    emotional_trajectory: string;
  };
  acceptance_check: string[];
};
