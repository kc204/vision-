"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ImageDropzone } from "@/components/ImageDropzone";
import { PromptOutput } from "@/components/PromptOutput";
import { Tooltip } from "@/components/Tooltip";
import {
  cameraAngles,
  shotSizes,
  colorPalettes,
  compositionTechniques,
  lightingVocabulary,
  motionCues,
  stylePacks,
  type VisualOption,
  groupOptions,
  searchOptions,
  findVisualSnippet,
  findVisualSnippets,
} from "@/lib/visualOptions";
import type {
  DirectorRequest,
  ImagePromptPayload,
  ImagePromptSelectedOptions,
  VisualOptionSelection,
} from "@/lib/directorTypes";

const helperText =
  "Write how you’d brief a creative partner—Director Core translates it into cinematic language.";

const models = [
  { value: "sdxl", label: "SDXL" },
  { value: "flux", label: "Flux" },
  { value: "illustrious", label: "Illustrious (anime)" },
] as const;

type ModelChoice = (typeof models)[number]["value"];

type ImagePromptResult = {
  positivePrompt: string;
  negativePrompt: string;
  suggestedSettings: string;
  raw: string;
  visionSeed: string;
};

type VisionSeedField = {
  id: "subject" | "environment" | "moment";
  label: string;
  placeholder: string;
};

const visionSeedFields: VisionSeedField[] = [
  {
    id: "subject",
    label: "Subject & focus",
    placeholder: "Who or what are we spotlighting?",
  },
  {
    id: "environment",
    label: "Environment",
    placeholder: "Where does this moment take place?",
  },
  {
    id: "moment",
    label: "Moment to capture",
    placeholder: "What is happening in this exact frame?",
  },
];

export default function ImagePromptBuilderPage() {
  const [modelChoice, setModelChoice] = useState<ModelChoice>("sdxl");
  const [visionSeedValues, setVisionSeedValues] = useState<Record<VisionSeedField["id"], string>>({
    subject: "",
    environment: "",
    moment: "",
  });
  const [moodProfile, setMoodProfile] = useState("");
  const [constraints, setConstraints] = useState("");
  const [cameraAngleId, setCameraAngleId] = useState<string>("");
  const [shotSizeId, setShotSizeId] = useState<string>("");
  const [compositionTechniqueId, setCompositionTechniqueId] = useState<string>("");
  const [lightingVocabularyId, setLightingVocabularyId] = useState<string>("");
  const [colorPaletteId, setColorPaletteId] = useState<string>("");
  const [motionCueIds, setMotionCueIds] = useState<string[]>([]);
  const [stylePackIds, setStylePackIds] = useState<string[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImagePromptResult | null>(null);

  const disableGenerate = useMemo(() => {
    const missingSeed = visionSeedFields.some(({ id }) =>
      visionSeedValues[id].trim().length === 0
    );
    return missingSeed || isLoading;
  }, [visionSeedValues, isLoading]);

  const assembledVisionSeed = useMemo(() => {
    return visionSeedFields
      .map(({ label, id }) => `${label}: ${visionSeedValues[id].trim()}`)
      .join("\n");
  }, [visionSeedValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disableGenerate) return;

    setIsLoading(true);
    setError(null);

    try {
      const references = await encodeFiles(referenceFiles);
      const payload: ImagePromptPayload = {
        vision_seed: assembledVisionSeed,
        mood_profile: moodProfile.trim(),
        constraints: constraints.trim(),
        model: modelChoice,
        selectedOptions: buildSelectedOptions({
          cameraAngleId,
          shotSizeId,
          compositionTechniqueId,
          lightingVocabularyId,
          colorPaletteId,
          motionCueIds,
          stylePackIds,
        }),
        references: references.length > 0 ? references : undefined,
      };

      const requestBody: DirectorRequest = {
        mode: "image_prompt",
        payload,
      };

      const response = await fetch("/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const text = await response.text();
      const parsed = parseDirectorResponse(text, assembledVisionSeed);
      setResult(parsed);
    } catch (requestError) {
      console.error(requestError);
      setError(
        "Something went wrong translating your Vision Seed. Please try again."
      );
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
            Vision Architect Studio
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Build a cinematic image brief
          </h1>
          <p className="text-sm text-slate-300">
            Complete the Vision Seed, layer in mood and constraints, then let
            Director Core craft the production-ready prompts.
          </p>
          <p className="text-xs text-slate-400">{helperText}</p>
        </header>

        <fieldset className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Vision Seed (required)
          </legend>
          {visionSeedFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <label className="block text-sm font-medium text-slate-200">
                {field.label}
              </label>
              <textarea
                required
                value={visionSeedValues[field.id]}
                onChange={(event) =>
                  setVisionSeedValues((previous) => ({
                    ...previous,
                    [field.id]: event.target.value,
                  }))
                }
                rows={field.id === "moment" ? 4 : 3}
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </fieldset>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">
              Mood profile
            </label>
            <textarea
              value={moodProfile}
              onChange={(event) => setMoodProfile(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
              placeholder="Dreamy optimism, nostalgic warmth, quiet awe"
            />
            <p className="text-xs text-slate-400">
              Describe the emotional temperature or tone the image should carry.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-200">
              Constraints & must-haves
            </label>
            <textarea
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
              placeholder="Keep character proportions realistic, avoid text overlays"
            />
            <p className="text-xs text-slate-400">
              Call out continuity notes, brand requirements, or guardrails.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200">
            Select a model
          </label>
          <select
            value={modelChoice}
            onChange={(event) => setModelChoice(event.target.value as ModelChoice)}
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
          >
            {models.map((model) => (
              <option
                key={model.value}
                value={model.value}
                className="text-slate-900"
              >
                {model.label}
              </option>
            ))}
          </select>
        </div>

        <ImageDropzone
          files={referenceFiles}
          onFilesChange={setReferenceFiles}
          label="Reference frames (optional)"
          description="Drop PNG, JPG, or WEBP frames to ground the look."
          maxFiles={6}
        />

        <fieldset className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Cinematic guidance (optional)
          </legend>
          <VisualOptionBrowser
            label="Camera angle"
            options={cameraAngles}
            selectedIds={cameraAngleId ? [cameraAngleId] : []}
            onSelectionChange={(ids) => setCameraAngleId(ids[0] ?? "")}
            placeholder="Search cinematic camera angles"
          />
          <VisualOptionBrowser
            label="Shot size / framing"
            options={shotSizes}
            selectedIds={shotSizeId ? [shotSizeId] : []}
            onSelectionChange={(ids) => setShotSizeId(ids[0] ?? "")}
            placeholder="Search classic framings"
          />
          <VisualOptionBrowser
            label="Composition technique"
            options={compositionTechniques}
            selectedIds={
              compositionTechniqueId ? [compositionTechniqueId] : []
            }
            onSelectionChange={(ids) =>
              setCompositionTechniqueId(ids[0] ?? "")
            }
            placeholder="Rule of thirds, golden ratio, leading lines..."
            helperText="Define how the frame guides attention."
          />
          <VisualOptionBrowser
            label="Lighting vocabulary"
            options={lightingVocabulary}
            selectedIds={lightingVocabularyId ? [lightingVocabularyId] : []}
            onSelectionChange={(ids) => setLightingVocabularyId(ids[0] ?? "")}
            placeholder="Soft wrap, Rembrandt, neon bounce..."
            helperText="Describe the light quality or technique."
          />
          <VisualOptionBrowser
            label="Color mood / palette"
            options={colorPalettes}
            selectedIds={colorPaletteId ? [colorPaletteId] : []}
            onSelectionChange={(ids) => setColorPaletteId(ids[0] ?? "")}
            placeholder="Search palettes by tone or vibe"
          />
          <VisualOptionBrowser
            label="Motion cues"
            options={motionCues}
            selectedIds={motionCueIds}
            onSelectionChange={setMotionCueIds}
            placeholder="Stack movement ideas (whip pan, parallax...)"
            helperText="Select multiple cues to hint at camera movement."
            multiple
          />
          <VisualOptionBrowser
            label="Style packs"
            options={stylePacks}
            selectedIds={stylePackIds}
            onSelectionChange={setStylePackIds}
            placeholder="Search looks like neo noir, anime cel, retro futurism"
            helperText="Blend stylistic treatments or illustration modes."
            multiple
          />
        </fieldset>

        <button
          type="submit"
          disabled={disableGenerate}
          className="w-full rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isLoading ? "Generating…" : "Generate prompts"}
        </button>

        {error && (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        )}
      </form>

      <aside className="space-y-4">
        {!result && !error && (
          <div className="h-full rounded-3xl border border-dashed border-white/10 bg-slate-950/30 p-6 text-center text-sm text-slate-400">
            Your Director Core prompt kit will appear here once generated.
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <PromptOutput
              label="Vision Seed"
              value={result.visionSeed}
              copyLabel="Copy Vision Seed"
            />
            <PromptOutput
              label="Positive prompt"
              value={result.positivePrompt}
              isCode
              copyLabel="Copy positive prompt"
            />
            <PromptOutput
              label="Negative prompt"
              value={result.negativePrompt}
              isCode
              copyLabel="Copy negative prompt"
            />
            <PromptOutput
              label="Suggested settings"
              value={result.suggestedSettings}
              copyLabel="Copy suggested settings"
            />
            <PromptOutput
              label="Director output"
              value={result.raw}
              copyLabel="Copy full response"
              variant="subtle"
            />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        )}
      </aside>
    </section>
  );
}

type VisualOptionBrowserProps = {
  label: string;
  options: VisualOption[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  placeholder?: string;
  helperText?: string;
  multiple?: boolean;
};

function VisualOptionBrowser({
  label,
  options,
  selectedIds,
  onSelectionChange,
  placeholder,
  helperText,
  multiple = false,
}: VisualOptionBrowserProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const groupedOptions = useMemo(() => {
    const filtered = searchOptions(options, query);
    return groupOptions(filtered);
  }, [options, query]);

  const selectedOptions = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return options.filter((option) => selectedSet.has(option.id));
  }, [options, selectedIds]);

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [expanded]);

  const toggleOption = (option: VisualOption) => {
    if (multiple) {
      const nextIds = selectedIds.includes(option.id)
        ? selectedIds.filter((id) => id !== option.id)
        : [...selectedIds, option.id];
      onSelectionChange(nextIds);
      return;
    }

    if (selectedIds[0] === option.id) {
      onSelectionChange([]);
    } else {
      onSelectionChange([option.id]);
    }
    setExpanded(false);
  };

  const clearSelection = () => {
    onSelectionChange([]);
    setQuery("");
  };

  const clearQuery = () => setQuery("");

  const handleToggleExpanded = () => {
    setExpanded((previous) => !previous);
  };

  const noMatches = groupedOptions.every((group) => group.options.length === 0);
  const hasSelections = selectedOptions.length > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-2 font-medium text-slate-200">
            {label}
            <span className="text-xs font-normal text-slate-400">
              (optional{multiple ? ", choose multiple" : ""})
            </span>
          </span>
          {helperText ? (
            <p className="text-xs text-slate-400">{helperText}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {hasSelections ? (
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-semibold text-canvas-accent hover:underline"
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleToggleExpanded}
            className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-white/30"
          >
            {expanded ? "Hide options" : "Browse options"}
          </button>
        </div>
      </div>

      {hasSelections ? (
        <div className="space-y-2">
          <ul className="flex flex-wrap gap-2">
            {selectedOptions.map((option) => (
              <li key={option.id}>
                <Tooltip content={option.tooltip}>
                  <button
                    type="button"
                    onClick={() => toggleOption(option)}
                    className="inline-flex items-center gap-2 rounded-full border border-canvas-accent/40 bg-canvas-accent/10 px-3 py-1 text-xs font-semibold text-canvas-accent transition hover:border-canvas-accent hover:bg-canvas-accent/20"
                  >
                    {option.label}
                    <span aria-hidden="true">×</span>
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
          <div className="space-y-1 text-xs text-slate-400">
            {selectedOptions.map((option) => (
              <p key={option.id}>
                <span className="font-semibold text-slate-300">{option.label}:</span>{" "}
                {option.tooltip}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">No preference selected.</p>
      )}

      {expanded ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder ?? "Search or filter"}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
              type="search"
            />
            <button
              type="button"
              onClick={clearQuery}
              className="text-xs font-semibold text-slate-300 hover:text-white"
            >
              Clear search
            </button>
          </div>
          <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
            {noMatches ? (
              <p className="text-xs text-slate-400">No matches. Try a different keyword.</p>
            ) : (
              groupedOptions.map((group) =>
                group.options.length > 0 ? (
                  <div key={group.id} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {group.label}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {group.options.map((option) => {
                        const isSelected = selectedIds.includes(option.id);
                        return (
                          <Tooltip key={option.id} content={option.tooltip}>
                            <button
                              type="button"
                              onClick={() => toggleOption(option)}
                              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-canvas-accent ${
                                isSelected
                                  ? "border-canvas-accent bg-canvas-accent/20 text-white"
                                  : "border-white/10 bg-slate-950/60 text-slate-100 hover:border-white/20 hover:bg-slate-900"
                              }`}
                            >
                              <span className="font-semibold">{option.label}</span>
                              <span className="mt-1 block text-xs text-slate-300">
                                {option.tooltip}
                              </span>
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              )
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type SelectedOptionIds = {
  cameraAngleId: string;
  shotSizeId: string;
  compositionTechniqueId: string;
  lightingVocabularyId: string;
  colorPaletteId: string;
  motionCueIds: string[];
  stylePackIds: string[];
};

function buildSelectedOptions(ids: SelectedOptionIds): ImagePromptSelectedOptions {
  const toSelection = (option: VisualOption | undefined): VisualOptionSelection | undefined =>
    option
      ? {
          id: option.id,
          label: option.label,
          prompt_snippet: option.promptSnippet,
        }
      : undefined;

  const cameraAngle = toSelection(findVisualSnippet(cameraAngles, ids.cameraAngleId));
  const shotSize = toSelection(findVisualSnippet(shotSizes, ids.shotSizeId));
  const composition = toSelection(
    findVisualSnippet(compositionTechniques, ids.compositionTechniqueId)
  );
  const lighting = toSelection(
    findVisualSnippet(lightingVocabulary, ids.lightingVocabularyId)
  );
  const colorPalette = toSelection(findVisualSnippet(colorPalettes, ids.colorPaletteId));

  const toSelections = (options: VisualOption[]): VisualOptionSelection[] =>
    options.map((option) => ({
      id: option.id,
      label: option.label,
      prompt_snippet: option.promptSnippet,
    }));

  const motionCueSelections = toSelections(
    findVisualSnippets(motionCues, ids.motionCueIds)
  );
  const stylePackSelections = toSelections(
    findVisualSnippets(stylePacks, ids.stylePackIds)
  );

  return {
    cameraAngle,
    shotSize,
    compositionTechnique: composition,
    lightingVocabulary: lighting,
    colorPalette,
    motionCues: motionCueSelections,
    stylePacks: stylePackSelections,
  };
}

async function encodeFiles(files: File[]): Promise<string[]> {
  const encodings = await Promise.all(files.map((file) => readFileAsBase64(file)));
  return encodings.filter((value): value is string => value.length > 0);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const base64 = result.replace(/^data:[^;]+;base64,/, "");
        resolve(base64);
      } else {
        resolve("");
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}

type SectionKey = "positive" | "negative" | "settings";

const sectionHeadingMap: Record<string, SectionKey> = {
  "positive prompt": "positive",
  "positive": "positive",
  "negative prompt": "negative",
  "negative": "negative",
  "suggested settings": "settings",
  "settings": "settings",
};

function parseDirectorResponse(text: string, visionSeed: string): ImagePromptResult {
  const sections: Record<SectionKey, string[]> = {
    positive: [],
    negative: [],
    settings: [],
  };

  let activeSection: SectionKey | null = null;

  const lines = text.replace(/\r/g, "").split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (activeSection) {
        sections[activeSection].push("");
      }
      continue;
    }

    const headingMatch = line.match(/^(.*?)(?:\s*:)?\s*(.*)$/);
    if (headingMatch) {
      const potentialHeading = headingMatch[1].trim().toLowerCase();
      const remainder = headingMatch[2]?.trim() ?? "";
      const mapped = sectionHeadingMap[potentialHeading];
      if (mapped) {
        activeSection = mapped;
        if (remainder.length > 0) {
          sections[mapped].push(remainder);
        }
        continue;
      }
    }

    const exactHeading = line.trim().toLowerCase();
    if (sectionHeadingMap[exactHeading]) {
      activeSection = sectionHeadingMap[exactHeading];
      continue;
    }

    if (activeSection) {
      sections[activeSection].push(line.trim());
    }
  }

  const normalize = (values: string[]) =>
    values
      .join("\n")
      .split(/\n{2,}/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0)
      .join("\n\n");

  const positivePrompt = normalize(sections.positive);
  const negativePrompt = normalize(sections.negative);
  const suggestedSettings = normalize(sections.settings);

  const fallbackPositive = positivePrompt || text.trim();

  return {
    positivePrompt: fallbackPositive,
    negativePrompt,
    suggestedSettings,
    raw: text.trim(),
    visionSeed,
  };
}
