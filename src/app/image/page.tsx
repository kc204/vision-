"use client";

import { FormEvent, useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import {
  cameraAngles,
  shotSizes,
  lightingStyles,
  colorPalettes,
  VisualOption,
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
  settings: {
    model: string;
    resolution: string;
    sampler: string;
    steps: number;
    cfg: number;
    seed: string;
  };
};

export default function ImagePromptBuilderPage() {
  const [visionSeedText, setVisionSeedText] = useState("");
  const [modelChoice, setModelChoice] = useState<ModelChoice>("sdxl");
  const [cameraAngleId, setCameraAngleId] = useState<string>("");
  const [shotSizeId, setShotSizeId] = useState<string>("");
  const [lightingStyleId, setLightingStyleId] = useState<string>("");
  const [colorPaletteId, setColorPaletteId] = useState<string>("");
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
      const response = await fetch("/api/generate-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visionSeedText,
          modelChoice,
          cameraAngleId: cameraAngleId || undefined,
          shotSizeId: shotSizeId || undefined,
          lightingStyleId: lightingStyleId || undefined,
          colorPaletteId: colorPaletteId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as ImagePromptResponse;
      setResult(data);
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
          <VisualSelect
            label="Camera angle"
            options={cameraAngles}
            value={cameraAngleId}
            onChange={setCameraAngleId}
          />
          <VisualSelect
            label="Shot size / framing"
            options={shotSizes}
            value={shotSizeId}
            onChange={setShotSizeId}
          />
          <VisualSelect
            label="Lighting style"
            options={lightingStyles}
            value={lightingStyleId}
            onChange={setLightingStyleId}
          />
          <VisualSelect
            label="Color mood / palette"
            options={colorPalettes}
            value={colorPaletteId}
            onChange={setColorPaletteId}
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

type VisualSelectProps = {
  label: string;
  options: VisualOption[];
  value: string;
  onChange: (value: string) => void;
};

function VisualSelect({ label, options, value, onChange }: VisualSelectProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1 inline-flex items-center gap-2 font-medium text-slate-200">
        {label}
        <span className="text-xs font-normal text-slate-400">(optional)</span>
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
      >
        <option value="" className="text-slate-900">
          No preference
        </option>
        {options.map((option) => (
          <option key={option.id} value={option.id} title={option.tooltip} className="text-slate-900">
            {option.label}
          </option>
        ))}
      </select>
      {value && (
        <p className="mt-1 text-xs text-slate-400">
          {options.find((option) => option.id === value)?.tooltip}
        </p>
      )}
    </label>
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
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Suggested settings
        </h2>
        <CopyButton text={settingsText} label="Copy settings" />
      </header>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-200 sm:grid-cols-2">
        <Setting label="Model" value={settings.model} />
        <Setting label="Resolution" value={settings.resolution} />
        <Setting label="Sampler" value={settings.sampler} />
        <Setting label="Steps" value={settings.steps.toString()} />
        <Setting label="CFG" value={settings.cfg.toString()} />
        <Setting label="Seed" value={settings.seed} />
      </dl>
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
