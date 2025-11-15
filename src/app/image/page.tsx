"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ImageDropzone } from "@/components/ImageDropzone";
import { PromptOutput } from "@/components/PromptOutput";
import { Tooltip } from "@/components/Tooltip";
import {
  cameraAngles,
  shotSizes,
  colorPalettes,
  composition,
  lightingStyles,
  cameraMovement,
  atmosphere,
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
  const [compositionId, setCompositionId] =
    useState<string>("");
  const [lightingStyleId, setLightingStyleId] = useState<string>("");
  const [colorPaletteId, setColorPaletteId] = useState<string>("");
  const [cameraMovementIds, setCameraMovementIds] = useState<string[]>([]);
  const [atmosphereIds, setAtmosphereIds] = useState<string[]>([]);
  const [visionSeedImages, setVisionSeedImages] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImagePromptResponse | null>(null);

  const disableGenerate = useMemo(() => {
    return visionSeedText.trim().length === 0 || isLoading;
  }, [visionSeedText, isLoading]);

  const selectedOptionIds = useMemo(
    () => ({
      cameraAngles: cameraAngleId ? [cameraAngleId] : [],
      shotSizes: shotSizeId ? [shotSizeId] : [],
      composition: compositionId ? [compositionId] : [],
      cameraMovement: cameraMovementIds,
      lightingStyles: lightingStyleId ? [lightingStyleId] : [],
      colorPalettes: colorPaletteId ? [colorPaletteId] : [],
      atmosphere: atmosphereIds,
    }),
    [
      atmosphereIds,
      cameraAngleId,
      cameraMovementIds,
      colorPaletteId,
      compositionId,
      lightingStyleId,
      shotSizeId,
    ]
  );

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
          selectedOptions: selectedOptionIds,
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
          <ImageDropzone
            files={visionSeedImages}
            onFilesChange={setVisionSeedImages}
            label="Vision Seed reference images (optional)"
            description="Drop PNG, JPG, or WEBP frames to give Director Core visual grounding."
            maxFiles={6}
            className="mt-4"
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
            label="Composition"
            options={composition}
            selectedIds={compositionId ? [compositionId] : []}
            onSelectionChange={(ids) => setCompositionId(ids[0] ?? "")}
            placeholder="Rule of thirds, golden ratio, leading lines..."
            helperText="Define how the frame guides attention."
          />
          <VisualOptionBrowser
            label="Lighting style"
            options={lightingStyles}
            selectedIds={lightingStyleId ? [lightingStyleId] : []}
            onSelectionChange={(ids) => setLightingStyleId(ids[0] ?? "")}
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
            label="Camera movement"
            options={cameraMovement}
            selectedIds={cameraMovementIds}
            onSelectionChange={setCameraMovementIds}
            placeholder="Stack movement ideas (whip pan, parallax...)"
            helperText="Select multiple cues to hint at camera motion."
            multiple
          />
          <VisualOptionBrowser
            label="Atmosphere & setting"
            options={atmosphere}
            selectedIds={atmosphereIds}
            onSelectionChange={setAtmosphereIds}
            placeholder="Search moods like misty forest, skyport, sacred library"
            helperText="Select multiple environments or vibes to steer the scene."
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
            <PromptOutput label="Summary" value={result.summary} />
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
              value={JSON.stringify(result.settings ?? {}, null, 2)}
              isCode
              copyLabel="Copy settings JSON"
            />
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
                )
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

