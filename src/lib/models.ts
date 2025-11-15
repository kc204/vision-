export type ModelProvider = "openai" | "gemini";

export type ModelCapability = "imagePrompt" | "videoPlan";

export interface ModelCapabilityConfig {
  kind: "chat" | "video";
  responseMimeType?: string;
  responseSchema?: unknown;
}

export interface ModelDefinition {
  id: string;
  label: string;
  provider: ModelProvider;
  description?: string;
  capabilities: Partial<Record<ModelCapability, ModelCapabilityConfig>>;
}

export const IMAGE_PROMPT_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    positivePrompt: { type: "string" },
    negativePrompt: { type: "string" },
    settings: {
      type: "object",
      properties: {
        model: { type: "string" },
        resolution: { type: "string" },
        sampler: { type: "string" },
        steps: { type: "integer" },
        cfg: { type: "number" },
        seed: { type: "string" },
      },
      required: ["model", "resolution", "sampler", "steps", "cfg", "seed"],
      additionalProperties: true,
    },
    summary: { type: "string" },
  },
  required: ["positivePrompt", "negativePrompt", "settings", "summary"],
  additionalProperties: false,
} as const;

export const VIDEO_PLAN_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    scenes: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          segment_title: { type: "string" },
          scene_description: { type: "string" },
          main_subject: { type: "string" },
          camera_movement: { type: "string" },
          visual_tone: { type: "string" },
          motion: { type: "string" },
          mood: { type: "string" },
          narrative: { type: "string" },
          sound_suggestion: { type: "string" },
          text_overlay: { type: "string" },
          voice_timing_hint: { type: "string" },
          broll_suggestions: { type: "string" },
          graphics_callouts: { type: "string" },
          editor_notes: { type: "string" },
          continuity_lock: {
            type: "object",
            properties: {
              subject_identity: { type: "string" },
              lighting_and_palette: { type: "string" },
              camera_grammar: { type: "string" },
              environment_motif: { type: "string" },
            },
            required: [
              "subject_identity",
              "lighting_and_palette",
              "camera_grammar",
              "environment_motif",
            ],
            additionalProperties: true,
          },
          acceptance_check: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "segment_title",
          "scene_description",
          "main_subject",
          "camera_movement",
          "visual_tone",
          "motion",
          "mood",
          "narrative",
          "sound_suggestion",
          "text_overlay",
          "voice_timing_hint",
          "broll_suggestions",
          "graphics_callouts",
          "editor_notes",
          "continuity_lock",
          "acceptance_check",
        ],
        additionalProperties: true,
      },
    },
    thumbnailConcept: { type: "string" },
  },
  required: ["scenes", "thumbnailConcept"],
  additionalProperties: false,
} as const;

const MODEL_DEFINITIONS: ModelDefinition[] = [
  {
    id: "gpt-4o-mini",
    label: "GPT-4o mini",
    provider: "openai",
    capabilities: {
      imagePrompt: { kind: "chat" },
      videoPlan: { kind: "chat" },
    },
  },
  {
    id: "gpt-4.1",
    label: "GPT-4.1",
    provider: "openai",
    capabilities: {
      imagePrompt: { kind: "chat" },
      videoPlan: { kind: "chat" },
    },
  },
  {
    id: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    provider: "gemini",
    capabilities: {
      imagePrompt: {
        kind: "chat",
        responseMimeType: "application/json",
        responseSchema: IMAGE_PROMPT_RESPONSE_SCHEMA,
      },
      videoPlan: {
        kind: "chat",
        responseMimeType: "application/json",
        responseSchema: VIDEO_PLAN_RESPONSE_SCHEMA,
      },
    },
  },
  {
    id: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    provider: "gemini",
    capabilities: {
      imagePrompt: {
        kind: "chat",
        responseMimeType: "application/json",
        responseSchema: IMAGE_PROMPT_RESPONSE_SCHEMA,
      },
      videoPlan: {
        kind: "chat",
        responseMimeType: "application/json",
        responseSchema: VIDEO_PLAN_RESPONSE_SCHEMA,
      },
    },
  },
  {
    id: "gemini-1.5-nano-banana",
    label: "Gemini Nano Banana",
    provider: "gemini",
    description: "Optimized for lightweight prompt engineering flows.",
    capabilities: {
      imagePrompt: {
        kind: "chat",
        responseMimeType: "application/json",
        responseSchema: IMAGE_PROMPT_RESPONSE_SCHEMA,
      },
    },
  },
  {
    id: "veo-3",
    label: "Veo 3",
    provider: "gemini",
    description: "Video-native Gemini endpoint for cinematic planning and renders.",
    capabilities: {
      videoPlan: {
        kind: "chat",
        responseMimeType: "application/json",
        responseSchema: VIDEO_PLAN_RESPONSE_SCHEMA,
      },
    },
  },
];

const MODEL_REGISTRY = new Map<string, ModelDefinition>(
  MODEL_DEFINITIONS.map((definition) => [definition.id, definition])
);

export function getModelDefinition(modelId: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.get(modelId);
}

export function getCapabilityConfig(
  modelId: string,
  capability: ModelCapability
): ModelCapabilityConfig | undefined {
  const model = getModelDefinition(modelId);
  return model?.capabilities?.[capability];
}

export function listModelsForCapability(capability: ModelCapability): ModelDefinition[] {
  return MODEL_DEFINITIONS.filter((definition) => capability in definition.capabilities);
}

export function isGeminiModel(modelId: string): boolean {
  return getModelDefinition(modelId)?.provider === "gemini";
}

export function isOpenAIModel(modelId: string): boolean {
  return getModelDefinition(modelId)?.provider === "openai";
}
