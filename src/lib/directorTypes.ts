import type { VisualOption } from "./visualOptions";

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
  glossary: {
    cameraAngles: VisualOption[];
    shotSizes: VisualOption[];
    composition: VisualOption[];
    cameraMovement: VisualOption[];
    lightingStyles: VisualOption[];
    colorPalettes: VisualOption[];
    atmosphere: VisualOption[];
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
  lighting_and_composition_options?: {
    lightingStyles?: string[];
    composition?: string[];
  };
};

export type LoopSequencePayload = {
  vision_seed_text: string;
  start_frame_description: string;
  loop_length: number | null;
  mood_profile: string | null;
};

export type DirectorRequest =
  | { mode: "image_prompt"; payload: ImagePromptPayload; images?: string[] }
  | { mode: "video_plan"; payload: VideoPlanPayload; images?: string[] }
  | { mode: "loop_sequence"; payload: LoopSequencePayload; images?: string[] };

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
