"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CopyButton } from "@/components/copy-button";
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
} from "@/lib/visualOptions";

const models = [
  { value: "sdxl", label: "SDXL" },
  { value: "flux", label: "Flux" },
  { value: "illustrious", label: "Illustrious (anime)" },
] as const;

type ModelChoice = (typeof models)[number]["value"];

type ImagePromptResponse = {
  positivePrompt: string;
  negativePrompt: string;
  summary: string;
  settings: Record<string, string | number>;
  moodMemory?: string;
};

export default function ImagePromptBuilderPage() {
  const [visionSeedText, setVisionSeedText] = useState("");
  const [modelChoice, setModelChoice] = useState<ModelChoice>("sdxl");
  const [cameraAngleId, setCameraAngleId] = useState<string>("");
  const [shotSizeId, setShotSizeId] = useState<string>("");
  const [compositionTechniqueId, setCompositionTechniqueId] =
    useState<string>("");
  const [lightingVocabularyId, setLightingVocabularyId] = useState<string>("");
  const [colorPaletteId, setColorPaletteId] = useState<string>("");
  const [motionCueIds, setMotionCueIds] = useState<string[]>([]);
  const [stylePackIds, setStylePackIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImagePromptResponse | null>(null);

  const disableGenerate = useMemo(() => {
    return visionSeedText.trim().length === 0 || isLoading;
  }, [visionSeedText, isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disableGenerate) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "image_prompt" as const,
          visionSeedText,
          modelChoice,
          cameraAngleId: cameraAngleId || undefined,
          shotSizeId: shotSizeId || undefined,
          compositionTechniqueId:
            compositionTechniqueId || undefined,
          lightingVocabularyId: lightingVocabularyId || undefined,
          colorPaletteId: colorPaletteId || undefined,
          motionCueIds: motionCueIds.length ? motionCueIds : undefined,
          stylePackIds: stylePackIds.length ? stylePackIds : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const { text } = (await response.json()) as { text: string };
      try {
        const parsed = JSON.parse(text) as ImagePromptResponse;
        setResult(parsed);
      } catch (parseError) {
        console.error("Invalid director response", parseError, text);
        throw new Error("Invalid director response");
      }
    } catch (requestError) {
      console.error(requestError);
      setError(
        "Something went wrong generating your image prompt. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const helperText = "Write this like you’d text a friend. No art or film jargon needed.";

  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <div>
          <h1 className="text-3xl font-semibold text-white">
            Create a cinematic image
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {"Describe what you want (Vision Seed)"}
          </p>
          <p className="mt-1 text-xs text-slate-400">{helperText}</p>
          <textarea
            value={visionSeedText}
            onChange={(event) => setVisionSeedText(event.target.value)}
            rows={6}
            className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder="A kid astronaut discovering a glowing forest on an alien planet"
          />
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
              <option key={model.value} value={model.value} className="text-slate-900">
                {model.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Optional: Help me dial in the shot
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
          {isLoading ? "Generating…" : "Generate Image Prompt"}
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
            Your prompt will appear here after you generate.
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <ResultCard title="Summary" description={result.summary} />
            <ResultCard
              title="Positive prompt"
              description={result.positivePrompt}
              withCopy
              copyLabel="Copy positive prompt"
            />
            <ResultCard
              title="Negative prompt"
              description={result.negativePrompt}
              withCopy
              copyLabel="Copy negative prompt"
            />
            <SettingsCard settings={result.settings} />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            Something went wrong generating your image prompt. Please try again.
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
              groupedOptions.map((group) => (
                group.options.length > 0 && (
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
                )
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ResultCardProps = {
  title: string;
  description: string;
  withCopy?: boolean;
  copyLabel?: string;
};

function ResultCard({ title, description, withCopy, copyLabel }: ResultCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          {title}
        </h2>
        {withCopy && copyLabel ? (
          <CopyButton text={description} label={copyLabel} />
        ) : null}
      </header>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-100">
        {description}
      </p>
    </article>
  );
}

type SettingsCardProps = {
  settings: ImagePromptResponse["settings"];
};

function SettingsCard({ settings }: SettingsCardProps) {
  const settingsText = JSON.stringify(settings, null, 2);
  const entries = Object.entries(settings ?? {});
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Suggested settings
        </h2>
        <CopyButton text={settingsText} label="Copy settings" />
      </header>
      {entries.length > 0 ? (
        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-200 sm:grid-cols-2">
          {entries.map(([label, value]) => (
            <Setting
              key={label}
              label={formatSettingLabel(label)}
              value={String(value)}
            />
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-slate-300">No settings provided.</p>
      )}
    </article>
  );
}

type SettingProps = {
  label: string;
  value: string;
};

function Setting({ label, value }: SettingProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3">
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 font-medium text-white">{value}</dd>
    </div>
  );
}

function formatSettingLabel(label: string): string {
  const cleaned = label.replace(/[_-]+/g, " ").trim();
  if (!cleaned) {
    return label;
  }

  const words = cleaned.split(/\s+/);
  return words
    .map((word) => {
      if (word.length <= 3) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
