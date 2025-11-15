"use client";

import { useMemo, useState } from "react";

import { ImageDropzone } from "@/components/ImageDropzone";
import { PromptOutput } from "@/components/PromptOutput";
import { Tooltip } from "@/components/Tooltip";
import type { DirectorRequest, ImagePromptPayload } from "@/lib/directorTypes";
import { encodeFiles } from "@/lib/encodeFiles";
import {
  atmosphere,
  cameraAngles,
  cameraMovement,
  colorPalettes,
  composition,
  lightingStyles,
  shotSizes,
  type VisualOption,
} from "@/lib/visualOptions";

const modelOptions: Array<{ value: ImagePromptPayload["model"]; label: string }> = [
  { value: "sdxl", label: "SDXL" },
  { value: "flux", label: "Flux" },
  { value: "illustrious", label: "Illustrious (Anime)" },
];

type PromptSections = {
  positive: string;
  negative: string;
  settings: string;
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
  >({
    cameraAngles: [],
    shotSizes: [],
    composition: [],
    cameraMovement: [],
    lightingStyles: [],
    colorPalettes: [],
    atmosphere: [],
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PromptSections | null>(null);

  const visionSeedText = useMemo(() => {
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

  const canSubmit = visionSeedText.trim().length > 0 && !isSubmitting;

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

      const response = await fetch("/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const message = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(message?.error ?? "Failed to generate prompt");
      }

      const { text } = (await response.json()) as { text: string };
      setResult(parsePromptSections(text));
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
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
            Vision Architect
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Build a cinematic still image prompt
          </h1>
          <p className="text-sm text-slate-300">
            Fill in the Vision Seed sections, pick cinematic controls, and let the Director Core translate everything into SDXL, Flux, or Illustrious language.
          </p>
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

        {result ? (
          <div className="space-y-4">
            <PromptOutput
              label="Positive prompt"
              value={result.positive}
              copyLabel="Copy positive"
            />
            <PromptOutput
              label="Negative prompt"
              value={result.negative}
              copyLabel="Copy negative"
            />
            <PromptOutput
              label="Suggested settings"
              value={result.settings}
              copyLabel="Copy settings"
            />
          </div>
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
