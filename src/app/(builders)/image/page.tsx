"use client";

import { FormEvent, useMemo, useState } from "react";
import { ImageDropzone, VisionSeedImage } from "@/components/image-dropzone";
import { PromptOutput } from "@/components/prompt-output";
import {
  cameraAngles,
  shotSizes,
  colorPalettes,
  compositionTechniques,
  lightingVocabulary,
  motionCues,
  stylePacks,
  VisualOption,
  groupOptions,
  searchOptions,
  findVisualSnippets,
} from "@/lib/visualOptions";

const models = [
  { value: "sdxl", label: "SDXL" },
  { value: "flux", label: "Flux" },
  { value: "illustrious", label: "Illustrious (anime)" },
] as const;

type ModelChoice = (typeof models)[number]["value"];

type SelectedOptionPayload = {
  id: string;
  label: string;
  promptSnippet: string;
  category: string;
};

type DirectorRequest = {
  mode: "image_prompt";
  model_choice: ModelChoice;
  vision_seed_text: string[];
  vision_seed_images?: string[];
  selected_options?: SelectedOptionPayload[];
  constraints?: string[];
};

type DirectorImagePromptResponse = {
  mode: "image_prompt";
  summary: string;
  positivePrompt: string;
  negativePrompt: string;
  settings: Record<string, string | number>;
  moodMemory?: string;
};

type VisionSeedField = {
  id: "subject" | "action" | "context";
  label: string;
  helper: string;
  placeholder: string;
};

const VISION_SEED_FIELDS: VisionSeedField[] = [
  {
    id: "subject",
    label: "What are we staging?",
    helper: "Describe the primary subjects or environment you want to capture.",
    placeholder: "A young astronaut exploring a glowing alien forest",
  },
  {
    id: "action",
    label: "What’s the moment?",
    helper: "Outline the action or story beat happening in the frame.",
    placeholder: "They lift their visor to examine luminous plants swirling with particles",
  },
  {
    id: "context",
    label: "Any vibe or details to lock in?",
    helper: "Mention mood, palette, lighting cues, or must-have details.",
    placeholder: "Ethereal teal and magenta light, misty atmosphere, cinematic depth of field",
  },
];

type OptionSection = {
  id: string;
  label: string;
  helper?: string;
  options: VisualOption[];
  multiple?: boolean;
};

const OPTION_SECTIONS: OptionSection[] = [
  {
    id: "camera",
    label: "Camera angles",
    helper: "Pick how we’re viewing the scene.",
    options: cameraAngles,
  },
  {
    id: "shot",
    label: "Shot size & framing",
    helper: "Lock the scale and composition of the subject.",
    options: shotSizes,
  },
  {
    id: "composition",
    label: "Composition techniques",
    helper: "Guide the viewer’s eye through the frame.",
    options: compositionTechniques,
    multiple: true,
  },
  {
    id: "lighting",
    label: "Lighting vocabulary",
    helper: "Define the quality and direction of light.",
    options: lightingVocabulary,
    multiple: true,
  },
  {
    id: "color",
    label: "Color moods & palettes",
    helper: "Set the color language and palette references.",
    options: colorPalettes,
    multiple: true,
  },
  {
    id: "motion",
    label: "Motion cues",
    helper: "Suggest how the camera or subject should move.",
    options: motionCues,
    multiple: true,
  },
  {
    id: "style",
    label: "Style packs",
    helper: "Blend stylistic treatments or illustrative looks.",
    options: stylePacks,
    multiple: true,
  },
];

type VisionSeedState = Record<VisionSeedField["id"], string>;

type SelectionState = Record<OptionSection["id"], string[]>;

const helperText = "Write like you’d text a collaborator. We’ll translate it into cinematic language.";

export default function ImagePromptBuilderPage() {
  const [visionSeed, setVisionSeed] = useState<VisionSeedState>(() => ({
    subject: "",
    action: "",
    context: "",
  }));
  const [selectionState, setSelectionState] = useState<SelectionState>(() =>
    Object.fromEntries(OPTION_SECTIONS.map((section) => [section.id, []])) as SelectionState
  );
  const [visionSeedImages, setVisionSeedImages] = useState<VisionSeedImage[]>([]);
  const [modelChoice, setModelChoice] = useState<ModelChoice>("sdxl");
  const [constraintsText, setConstraintsText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DirectorImagePromptResponse | null>(null);

  const hasVisionSeed = useMemo(() => {
    return Object.values(visionSeed).some((value) => value.trim().length > 0);
  }, [visionSeed]);

  const disableGenerate = useMemo(() => {
    return isLoading || !hasVisionSeed;
  }, [hasVisionSeed, isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disableGenerate) return;

    const visionSeedText = buildVisionSeedText(visionSeed);
    const selectedOptions = buildSelectedOptions(selectionState);
    const constraints = parseConstraints(constraintsText);

    setIsLoading(true);
    setError(null);

    const payload: DirectorRequest = {
      mode: "image_prompt",
      model_choice: modelChoice,
      vision_seed_text: visionSeedText,
      vision_seed_images:
        visionSeedImages.length > 0
          ? visionSeedImages.map((image) => image.dataUrl)
          : undefined,
      selected_options: selectedOptions.length > 0 ? selectedOptions : undefined,
      constraints: constraints.length > 0 ? constraints : undefined,
    };

    try {
      const response = await fetch("/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as DirectorImagePromptResponse;
      setResult(data);
    } catch (requestError) {
      console.error(requestError);
      setError(
        "We couldn’t craft that prompt. Check your inputs and try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const handleVisionSeedChange = (id: VisionSeedField["id"], value: string) => {
    setVisionSeed((previous) => ({ ...previous, [id]: value }));
  };

  const handleSelectionChange = (id: OptionSection["id"], next: string[]) => {
    setSelectionState((previous) => ({ ...previous, [id]: next }));
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-canvas-accent">
            Vision Architect
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Direct a cinematic image
          </h1>
          <p className="text-sm text-slate-300">{helperText}</p>
        </header>

        <section className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1 space-y-6">
              {VISION_SEED_FIELDS.map((field) => (
                <VisionSeedTextarea
                  key={field.id}
                  field={field}
                  value={visionSeed[field.id]}
                  onChange={handleVisionSeedChange}
                />
              ))}
            </div>
            <div className="lg:w-64">
              <ImageDropzone
                images={visionSeedImages}
                onImagesChange={setVisionSeedImages}
                title="Vision Seed images"
                description="Drop reference frames or upload stills for context."
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Cinematic options</h2>
          <p className="text-sm text-slate-300">
            Stack visual grammar cues and we’ll weave them into the director’s prompt.
          </p>
          <div className="space-y-4">
            {OPTION_SECTIONS.map((section) => (
              <VisualOptionBrowser
                key={section.id}
                label={section.label}
                helperText={section.helper}
                options={section.options}
                selectedIds={selectionState[section.id]}
                onSelectionChange={(ids) => handleSelectionChange(section.id, ids)}
                multiple={section.multiple ?? false}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-200">
              Choose a model
            </label>
            <select
              value={modelChoice}
              onChange={(event) => setModelChoice(event.target.value as ModelChoice)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            >
              {models.map((model) => (
                <option key={model.value} value={model.value} className="text-slate-900">
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-200">
              Constraints & must-haves
            </label>
            <textarea
              value={constraintsText}
              onChange={(event) => setConstraintsText(event.target.value)}
              rows={4}
              className="h-full w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
              placeholder="No text artifacts\nDeliver square crop"
            />
            <p className="text-xs text-slate-400">
              We’ll pass each line as a production constraint.
            </p>
          </div>
        </section>

        <button
          type="submit"
          disabled={disableGenerate}
          className="w-full rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isLoading ? "Assembling prompt…" : "Generate image prompt"}
        </button>

        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <aside className="space-y-4">
        {result ? (
          <div className="space-y-6">
            <PromptOutput title="Summary">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
                {result.summary}
              </p>
            </PromptOutput>
            <PromptOutput
              title="Positive prompt"
              copyLabel="Copy positive prompt"
              copyValue={result.positivePrompt}
            >
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
                {result.positivePrompt}
              </p>
            </PromptOutput>
            <PromptOutput
              title="Negative prompt"
              copyLabel="Copy negative prompt"
              copyValue={result.negativePrompt}
            >
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
                {result.negativePrompt}
              </p>
            </PromptOutput>
            <PromptOutput
              title="Suggested settings"
              copyLabel="Copy settings"
              copyValue={JSON.stringify(result.settings ?? {}, null, 2)}
            >
              {Object.keys(result.settings ?? {}).length > 0 ? (
                <dl className="grid grid-cols-1 gap-3 text-sm text-slate-200 sm:grid-cols-2">
                  {Object.entries(result.settings).map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/10 bg-slate-950/50 p-3"
                    >
                      <dt className="text-xs uppercase tracking-wide text-slate-400">
                        {formatSettingLabel(label)}
                      </dt>
                      <dd className="mt-1 font-medium text-white">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-slate-300">No settings provided.</p>
              )}
            </PromptOutput>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-100">
            Something went wrong generating your image prompt. Please try again.
          </div>
        ) : (
          <div className="h-full rounded-3xl border border-dashed border-white/10 bg-slate-950/30 p-6 text-center text-sm text-slate-400">
            Your prompt will appear here after you generate.
          </div>
        )}
      </aside>
    </section>
  );
}

type VisionSeedTextareaProps = {
  field: VisionSeedField;
  value: string;
  onChange: (id: VisionSeedField["id"], value: string) => void;
};

function VisionSeedTextarea({ field, value, onChange }: VisionSeedTextareaProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <div>
        <label className="block text-sm font-semibold text-white">
          {field.label}
        </label>
        <p className="mt-1 text-xs text-slate-400">{field.helper}</p>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(field.id, event.target.value)}
        rows={4}
        className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
        placeholder={field.placeholder}
      />
    </div>
  );
}

type VisualOptionBrowserProps = {
  label: string;
  options: VisualOption[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  helperText?: string;
  multiple?: boolean;
};

function VisualOptionBrowser({
  label,
  options,
  selectedIds,
  onSelectionChange,
  helperText,
  multiple = false,
}: VisualOptionBrowserProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");

  const groupedOptions = useMemo(() => {
    const filtered = searchOptions(options, query);
    return groupOptions(filtered);
  }, [options, query]);

  const selectedOptions = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return options.filter((option) => selectedSet.has(option.id));
  }, [options, selectedIds]);

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
                <button
                  type="button"
                  onClick={() => toggleOption(option)}
                  className="inline-flex items-center gap-2 rounded-full border border-canvas-accent/40 bg-canvas-accent/10 px-3 py-1 text-xs font-semibold text-canvas-accent transition hover:border-canvas-accent hover:bg-canvas-accent/20"
                  title={`${option.label}: ${option.tooltip}`}
                >
                  {option.label}
                  <span aria-hidden="true">×</span>
                </button>
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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cinematic vocabulary"
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
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => toggleOption(option)}
                            className={`rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-canvas-accent ${
                              isSelected
                                ? "border-canvas-accent bg-canvas-accent/20 text-white"
                                : "border-white/10 bg-slate-950/60 text-slate-100 hover:border-white/20 hover:bg-slate-900"
                            }`}
                            title={option.tooltip}
                          >
                            <span className="font-semibold">{option.label}</span>
                            <span className="mt-1 block text-xs text-slate-300">
                              {option.tooltip}
                            </span>
                          </button>
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

function formatSettingLabel(label: string): string {
  const cleaned = label.replace(/[_-]+/g, " ").trim();
  if (!cleaned) {
    return label;
  }

  return cleaned
    .split(/\s+/)
    .map((word) =>
      word.length <= 3 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function buildVisionSeedText(state: VisionSeedState): string[] {
  return VISION_SEED_FIELDS.reduce<string[]>((segments, field) => {
    const value = state[field.id].trim();
    if (value) {
      segments.push(`${field.label}: ${value}`);
    }
    return segments;
  }, []);
}

function buildSelectedOptions(state: SelectionState): SelectedOptionPayload[] {
  return OPTION_SECTIONS.flatMap((section) =>
    findVisualSnippets(section.options, state[section.id]).map((option) => ({
      id: option.id,
      label: option.label,
      promptSnippet: option.promptSnippet,
      category: section.label,
    }))
  );
}

function parseConstraints(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
