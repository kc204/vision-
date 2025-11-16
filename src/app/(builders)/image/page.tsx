"use client";

import { useEffect, useMemo, useState } from "react";

import { ImageDropzone } from "@/components/ImageDropzone";
import { GeneratedMediaGallery } from "@/components/GeneratedMediaGallery";
import { PromptOutput } from "@/components/PromptOutput";
import { Tooltip } from "@/components/Tooltip";
import { ServerCredentialNotice } from "@/components/ServerCredentialNotice";
import { ProviderApiKeyInput } from "@/components/ProviderApiKeyInput";
import type {
  DirectorCoreResult,
  DirectorCoreSuccess,
  DirectorMediaAsset,
  DirectorRequest,
  ImagePromptPayload,
} from "@/lib/directorTypes";
import { encodeFiles } from "@/lib/encodeFiles";
import {
  atmosphere,
  cameraAngles,
  cameraMovement,
  colorPalettes,
  composition,
  findVisualSnippets,
  lightingStyles,
  shotSizes,
  type VisualOption,
} from "@/lib/visualOptions";

const SAMPLE_IMAGE_SELECTIONS: Readonly<ImagePromptPayload["selectedOptions"]> = {
  cameraAngles: ["low_angle"],
  shotSizes: ["medium"],
  composition: ["rule_of_thirds"],
  cameraMovement: ["steady_push"],
  lightingStyles: ["split"],
  colorPalettes: ["vaporwave"],
  atmosphere: ["urban_noir_rain"],
};

const SAMPLE_IMAGE_SEED: Readonly<{
  subjectFocus: string;
  environment: string;
  compositionNotes: string;
  lightingNotes: string;
  styleNotes: string;
  symbolismNotes: string;
  atmosphereNotes: string;
  outputIntent: string;
  constraints: string;
  moodProfile: string;
  model: ImagePromptPayload["model"];
}> = {
  subjectFocus:
    "Weathered detective gripping an encrypted data shard, eyes locked with determination.",
  environment:
    "Rain-slicked megacity alley, neon kanji reflecting off puddles beside humming vending drones.",
  compositionNotes:
    "Low three-quarter composition with lens flare cutting diagonally, subject framed on the left third.",
  lightingNotes:
    "Split lighting from magenta signage versus teal taxi glow, rimmed with cool backlight mist.",
  styleNotes:
    "Photoreal cinematic still rendered in Flux, with subtle film grain and anamorphic bokeh.",
  symbolismNotes:
    "Data shard glows like a heart, signaling fragile hope amid corporate oppression.",
  atmosphereNotes:
    "City steam, distant siren haze, rain streaks tracking down chrome surfaces.",
  outputIntent: "Streaming series key art poster for episode reveal night.",
  constraints:
    "Keep composition printable in 24x36 poster ratio, maintain SFW wardrobe details.",
  moodProfile:
    "Neo-noir resilience with melancholic optimism, neon palette anchored by muted shadows.",
  model: "flux",
};

const modelOptions: Array<{ value: ImagePromptPayload["model"]; label: string }> = [
  { value: "sdxl", label: "SDXL" },
  { value: "flux", label: "Flux" },
  { value: "illustrious", label: "Illustrious (Anime)" },
];

function createEmptySelectedOptions(): ImagePromptPayload["selectedOptions"] {
  return {
    cameraAngles: [],
    shotSizes: [],
    composition: [],
    cameraMovement: [],
    lightingStyles: [],
    colorPalettes: [],
    atmosphere: [],
  };
}

type PromptSections = {
  positive: string;
  negative: string;
  settings: string;
};

type ImageGenerationResult = {
  sections: PromptSections | null;
  fallbackText: string | null;
  media: DirectorMediaAsset[];
};

const optionGroups: Array<{
  key: keyof ImagePromptPayload["selectedOptions"];
  label: string;
  options: VisualOption[];
}> = [
  { key: "cameraAngles", label: "Camera angles", options: cameraAngles },
  { key: "shotSizes", label: "Shot sizes", options: shotSizes },
  { key: "composition", label: "Composition", options: composition },
  { key: "cameraMovement", label: "Camera movement", options: cameraMovement },
  { key: "lightingStyles", label: "Lighting styles", options: lightingStyles },
  { key: "colorPalettes", label: "Color palettes", options: colorPalettes },
  { key: "atmosphere", label: "Atmosphere & effects", options: atmosphere },
];

const visualOptionLists: Record<
  keyof ImagePromptPayload["selectedOptions"],
  VisualOption[]
> = {
  cameraAngles,
  shotSizes,
  composition,
  cameraMovement,
  lightingStyles,
  colorPalettes,
  atmosphere,
};

export default function ImageBuilderPage() {
  const [subjectFocus, setSubjectFocus] = useState("");
  const [environment, setEnvironment] = useState("");
  const [compositionNotes, setCompositionNotes] = useState("");
  const [lightingNotes, setLightingNotes] = useState("");
  const [styleNotes, setStyleNotes] = useState("");
  const [symbolismNotes, setSymbolismNotes] = useState("");
  const [atmosphereNotes, setAtmosphereNotes] = useState("");
  const [outputIntent, setOutputIntent] = useState("");
  const [model, setModel] = useState<ImagePromptPayload["model"]>("sdxl");
  const [constraints, setConstraints] = useState("");
  const [moodProfile, setMoodProfile] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<
    ImagePromptPayload["selectedOptions"]
  >(() => createEmptySelectedOptions());
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageGenerationResult | null>(null);
  const [useSampleSeed, setUseSampleSeed] = useState(false);
  const [providerApiKey, setProviderApiKey] = useState("");

  useEffect(() => {
    if (useSampleSeed) {
      setSubjectFocus(SAMPLE_IMAGE_SEED.subjectFocus);
      setEnvironment(SAMPLE_IMAGE_SEED.environment);
      setCompositionNotes(SAMPLE_IMAGE_SEED.compositionNotes);
      setLightingNotes(SAMPLE_IMAGE_SEED.lightingNotes);
      setStyleNotes(SAMPLE_IMAGE_SEED.styleNotes);
      setSymbolismNotes(SAMPLE_IMAGE_SEED.symbolismNotes);
      setAtmosphereNotes(SAMPLE_IMAGE_SEED.atmosphereNotes);
      setOutputIntent(SAMPLE_IMAGE_SEED.outputIntent);
      setConstraints(SAMPLE_IMAGE_SEED.constraints);
      setMoodProfile(SAMPLE_IMAGE_SEED.moodProfile);
      setModel(SAMPLE_IMAGE_SEED.model);
      setSelectedOptions({
        cameraAngles: [...SAMPLE_IMAGE_SELECTIONS.cameraAngles],
        shotSizes: [...SAMPLE_IMAGE_SELECTIONS.shotSizes],
        composition: [...SAMPLE_IMAGE_SELECTIONS.composition],
        cameraMovement: [...SAMPLE_IMAGE_SELECTIONS.cameraMovement],
        lightingStyles: [...SAMPLE_IMAGE_SELECTIONS.lightingStyles],
        colorPalettes: [...SAMPLE_IMAGE_SELECTIONS.colorPalettes],
        atmosphere: [...SAMPLE_IMAGE_SELECTIONS.atmosphere],
      });
      setFiles([]);
    } else {
      setSubjectFocus("");
      setEnvironment("");
      setCompositionNotes("");
      setLightingNotes("");
      setStyleNotes("");
      setSymbolismNotes("");
      setAtmosphereNotes("");
      setOutputIntent("");
      setConstraints("");
      setMoodProfile("");
      setModel("sdxl");
      setSelectedOptions(createEmptySelectedOptions());
      setFiles([]);
    }
  }, [useSampleSeed]);

  const manualVisionSeedText = useMemo(() => {
    const sections = [
      { label: "Subject focus", value: subjectFocus },
      { label: "Environment & world", value: environment },
      { label: "Cinematic composition", value: compositionNotes },
      { label: "Lighting & color mood", value: lightingNotes },
      { label: "Style & medium", value: styleNotes },
      { label: "Symbolism & narrative", value: symbolismNotes },
      { label: "Atmosphere & effects", value: atmosphereNotes },
      { label: "Output intent", value: outputIntent },
    ].filter((section) => section.value.trim().length > 0);

    return sections
      .map((section) => `${section.label}: ${section.value.trim()}`)
      .join("\n");
  }, [
    atmosphereNotes,
    compositionNotes,
    environment,
    lightingNotes,
    outputIntent,
    styleNotes,
    subjectFocus,
    symbolismNotes,
  ]);

  const selectedVisualOptions = useMemo(() => {
    return (Object.entries(selectedOptions) as Array<
      [keyof ImagePromptPayload["selectedOptions"], string[]]
    >).flatMap(([key, ids]) => findVisualSnippets(visualOptionLists[key], ids));
  }, [selectedOptions]);

  const trimmedManualVisionSeedText = manualVisionSeedText.trim();

  const fallbackVisionSeedText = selectedVisualOptions
    .map((option) => `${option.label}: ${option.promptSnippet}`)
    .join("\n");

  const visionSeedText =
    trimmedManualVisionSeedText.length > 0
      ? trimmedManualVisionSeedText
      : fallbackVisionSeedText;

  const hasSeedContent =
    trimmedManualVisionSeedText.length > 0 ||
    selectedVisualOptions.length > 0 ||
    files.length > 0;

  const canSubmit = hasSeedContent && !isSubmitting;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const images = await encodeFiles(files);
      const payload: ImagePromptPayload = {
        vision_seed_text: visionSeedText,
        model,
        selectedOptions,
        mood_profile: moodProfile.trim().length ? moodProfile.trim() : null,
        constraints: constraints.trim().length ? constraints.trim() : null,
      };

      const requestPayload: DirectorRequest = {
        mode: "image_prompt",
        payload,
        images: images.length ? images : undefined,
      };

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (providerApiKey.trim().length > 0) {
        headers["x-provider-api-key"] = providerApiKey.trim();
      }

      const response = await fetch("/api/director", {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload),
      });

      const rawResponseJson = (await response.json().catch(() => null)) as
        | DirectorCoreResult
        | { error?: string }
        | null;

      if (!response.ok) {
        const message = (rawResponseJson as { error?: string } | null)?.error;
        throw new Error(message ?? "Failed to generate prompt");
      }

      if (
        !rawResponseJson ||
        typeof rawResponseJson !== "object" ||
        !("success" in rawResponseJson)
      ) {
        throw new Error("Empty response from director");
      }

      const responseJson: DirectorCoreResult = rawResponseJson;

      if (responseJson.success !== true) {
        throw new Error("Director Core returned an unexpected payload");
      }

      if (responseJson.mode !== "image_prompt") {
        throw new Error("Director Core returned non-image data");
      }

      const promptText = responseJson.promptText ?? null;
      let promptSections: PromptSections | null = null;

      if (promptText) {
        promptSections = parsePromptSections(promptText);
      }

      setResult({
        sections: promptSections,
        fallbackText: promptText,
        media: mapImagesToMediaAssets(responseJson),
      });
    } catch (submissionError) {
      console.error(submissionError);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to generate prompt"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
              Vision Architect
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Build a cinematic still image prompt
            </h1>
            <p className="text-sm text-slate-300">
              Fill in the Vision Seed sections, pick cinematic controls, and let the Director Core translate everything into SDXL, Flux, or Illustrious language.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/30 bg-slate-900 text-canvas-accent focus:ring-canvas-accent"
              checked={useSampleSeed}
              onChange={(event) => setUseSampleSeed(event.target.checked)}
            />
            Use sample data
          </label>
        </header>

        <SeedSection
          label="Subject focus"
          value={subjectFocus}
          onChange={setSubjectFocus}
          placeholder="Hero subject, emotion, key action"
        />
        <SeedSection
          label="Environment & world"
          value={environment}
          onChange={setEnvironment}
          placeholder="Location, time period, world-building details"
        />
        <SeedSection
          label="Cinematic composition"
          value={compositionNotes}
          onChange={setCompositionNotes}
          placeholder="Framing, lens, depth cues, perspective"
        />
        <SeedSection
          label="Lighting & color mood"
          value={lightingNotes}
          onChange={setLightingNotes}
          placeholder="Light quality, temperature, contrast, palette"
        />
        <SeedSection
          label="Style & medium"
          value={styleNotes}
          onChange={setStyleNotes}
          placeholder="Photoreal, painterly, anime, render engine, etc."
        />
        <SeedSection
          label="Symbolism & narrative"
          value={symbolismNotes}
          onChange={setSymbolismNotes}
          placeholder="Hidden meaning, storytelling beats, metaphors"
        />
        <SeedSection
          label="Atmosphere & effects"
          value={atmosphereNotes}
          onChange={setAtmosphereNotes}
          placeholder="Weather, particles, implied sound"
        />
        <SeedSection
          label="Output intent"
          value={outputIntent}
          onChange={setOutputIntent}
          placeholder="Poster, key art, wallpaper, concept sheet, etc."
        />

        <ImageDropzone
          files={files}
          onFilesChange={setFiles}
          label="Vision Seed images"
          description="Drop PNG, JPG, or WEBP references to anchor the vibe."
          maxFiles={6}
        />

        <fieldset className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Cinematic controls
          </legend>
          {optionGroups.map((group) => (
            <OptionGrid
              key={group.key}
              label={group.label}
              options={group.options}
              selectedIds={selectedOptions[group.key]}
              onToggle={(id) =>
                setSelectedOptions((previous) => ({
                  ...previous,
                  [group.key]: toggleSelection(previous[group.key], id),
                }))
              }
            />
          ))}
        </fieldset>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-200">Model</label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {modelOptions.map((option) => {
                  const isActive = option.value === model;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setModel(option.value)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-canvas-accent bg-canvas-accent/20 text-white"
                          : "border-white/10 bg-slate-900/50 text-slate-200 hover:border-white/20"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-200">
                Optional constraints
              </label>
              <textarea
                value={constraints}
                onChange={(event) => setConstraints(event.target.value)}
                rows={3}
                placeholder="Steps cap, printable color limits, SFW requirements, etc."
                className="min-h-[96px] rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-200">
              Mood profile (optional)
            </label>
            <textarea
              value={moodProfile}
              onChange={(event) => setMoodProfile(event.target.value)}
              rows={3}
              placeholder="Persisted tone, palette, motifs to carry into future calls"
              className="min-h-[96px] rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            />
          </div>
        </div>

        <ProviderApiKeyInput
          value={providerApiKey}
          onChange={setProviderApiKey}
          description="Optional: route this session through your own Gemini image key."
          helperText="Provided keys live only in this browser session and are forwarded via x-provider-api-key."
        />

        <ServerCredentialNotice
          description="Director Core uses managed credentials for Gemini image and chat calls."
          helperText="No Google AI Studio key or browser storage is required."
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-canvas-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isSubmitting ? "Generating…" : "Generate image prompt"}
        </button>
        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <aside className="space-y-6">
        {!result && !error ? (
          <div className="min-h-[320px] rounded-3xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-sm text-slate-400">
            Prompt results will appear here after generation.
          </div>
        ) : null}

        {result?.media.length ? (
          <GeneratedMediaGallery assets={result.media} />
        ) : null}

        {result?.sections ? (
          <div className="space-y-4">
            <PromptOutput
              label="Positive prompt"
              value={result.sections.positive}
              copyLabel="Copy positive"
            />
            <PromptOutput
              label="Negative prompt"
              value={result.sections.negative}
              copyLabel="Copy negative"
            />
            <PromptOutput
              label="Suggested settings"
              value={result.sections.settings}
              copyLabel="Copy settings"
            />
          </div>
        ) : null}

        {!result?.sections && result?.fallbackText ? (
          <PromptOutput
            label="Generation response"
            value={result.fallbackText}
            copyLabel="Copy response"
          />
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </aside>
    </section>
  );
}

function SeedSection({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
      />
    </label>
  );
}

type ImagePromptSuccess = Extract<DirectorCoreSuccess, { mode: "image_prompt" }>;

function mapImagesToMediaAssets(result: ImagePromptSuccess): DirectorMediaAsset[] {
  return (result.images ?? []).map((image, index) => {
    const { url, base64 } = normalizeMediaValue(image.data);
    return {
      id: image.altText ?? `image-${index}`,
      kind: "image",
      mimeType: image.mimeType,
      url,
      base64,
      caption: image.altText ?? null,
      description: image.altText ?? null,
    } satisfies DirectorMediaAsset;
  });
}

function normalizeMediaValue(value: string): { url?: string; base64?: string } {
  if (/^(https?:|blob:)/i.test(value) || value.startsWith("data:")) {
    return { url: value };
  }

  return { base64: value };
}

function OptionGrid({
  label,
  options,
  selectedIds,
  onToggle,
}: {
  label: string;
  options: VisualOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-200">{label}</h2>
        <Tooltip content="Hover each option to learn how it shapes the shot.">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-slate-900/60 text-[10px] font-semibold text-slate-200">
            ?
          </span>
        </Tooltip>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selectedIds.includes(option.id);
          return (
            <Tooltip key={option.id} content={option.tooltip}>
              <button
                type="button"
                onClick={() => onToggle(option.id)}
                className={`group relative rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "border-canvas-accent bg-canvas-accent/20 text-white"
                    : "border-white/10 bg-slate-900/50 text-slate-200 hover:border-white/20"
                }`}
              >
                {option.label}
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function toggleSelection(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((value) => value !== id) : [...list, id];
}

function parsePromptSections(text: string): PromptSections {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return {
    positive: blocks[0] ?? "",
    negative: blocks[1] ?? "",
    settings: blocks.slice(2).join("\n\n"),
  };
}

