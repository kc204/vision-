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

type Stage = "seed" | "confirm" | "refine" | "result";

type SettingsMap = Record<string, string>;

type SeedResponse = {
  stage: "seed";
  summary: string;
  moodMemory: string;
  summaryConfirmed: boolean;
};

type ConfirmResponse = {
  stage: "confirm";
  summary: string;
  moodMemory: string;
  summaryConfirmed: boolean;
};

type RefineResponse = {
  stage: "refine";
  summary: string;
  moodMemory: string;
  summaryConfirmed: boolean;
  refinementCommands: string[];
};

type GenerateResponse = {
  stage: "generate";
  summary: string;
  moodMemory: string;
  refinementCommands: string[];
  positivePrompt: string;
  negativePrompt: string;
  settings: SettingsMap;
};

type ApiResponse = SeedResponse | ConfirmResponse | RefineResponse | GenerateResponse;

type SeedRequestPayload = {
  stage: "seed";
  visionSeedText: string;
  modelChoice: ModelChoice;
  cameraAngleId?: string;
  shotSizeId?: string;
  lightingStyleId?: string;
  colorPaletteId?: string;
};

type ConfirmRequestPayload = {
  stage: "confirm";
  confirmed: boolean;
  feedback?: string;
};

type RefineRequestPayload = {
  stage: "refine";
  refinementCommands: string[];
  moodMemory?: string;
};

type GenerateRequestPayload = {
  stage: "generate";
};

type ImagePromptRequestPayload =
  | SeedRequestPayload
  | ConfirmRequestPayload
  | RefineRequestPayload
  | GenerateRequestPayload;

type FinalResult = {
  summary: string;
  moodMemory: string;
  positivePrompt: string;
  negativePrompt: string;
  settings: SettingsMap;
  refinementCommands: string[];
};

export default function ImagePromptBuilderPage() {
  const [stage, setStage] = useState<Stage>("seed");
  const [visionSeedText, setVisionSeedText] = useState("");
  const [modelChoice, setModelChoice] = useState<ModelChoice>("sdxl");
  const [cameraAngleId, setCameraAngleId] = useState<string>("");
  const [shotSizeId, setShotSizeId] = useState<string>("");
  const [lightingStyleId, setLightingStyleId] = useState<string>("");
  const [colorPaletteId, setColorPaletteId] = useState<string>("");
  const [summary, setSummary] = useState("");
  const [summaryFeedback, setSummaryFeedback] = useState("");
  const [moodMemory, setMoodMemory] = useState("");
  const [refinementText, setRefinementText] = useState("");
  const [refinementCommands, setRefinementCommands] = useState<string[]>([]);
  const [result, setResult] = useState<FinalResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disableSeed = useMemo(() => {
    return stage !== "seed" || visionSeedText.trim().length === 0 || isLoading;
  }, [stage, visionSeedText, isLoading]);

  const helperText = "Write this like you’d text a friend. No art or film jargon needed.";

  function resetConversation() {
    setStage("seed");
    setVisionSeedText("");
    setModelChoice("sdxl");
    setCameraAngleId("");
    setShotSizeId("");
    setLightingStyleId("");
    setColorPaletteId("");
    setSummary("");
    setSummaryFeedback("");
    setMoodMemory("");
    setRefinementText("");
    setRefinementCommands([]);
    setResult(null);
    setError(null);
  }

  async function postToApi(payload: ImagePromptRequestPayload) {
    const response = await fetch("/api/generate-image-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage =
        (typeof data?.error === "string" && data.error.trim().length > 0
          ? data.error
          : "Request failed");
      throw new Error(errorMessage);
    }

    return data as ApiResponse;
  }

  async function handleSeedSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disableSeed) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await postToApi({
        stage: "seed",
        visionSeedText,
        modelChoice,
        cameraAngleId: cameraAngleId || undefined,
        shotSizeId: shotSizeId || undefined,
        lightingStyleId: lightingStyleId || undefined,
        colorPaletteId: colorPaletteId || undefined,
      });

      if (data.stage !== "seed") {
        throw new Error("Unexpected response stage");
      }

      setSummary(data.summary);
      setMoodMemory(data.moodMemory);
      setStage("confirm");
      setSummaryFeedback("");
      setRefinementText("");
      setRefinementCommands([]);
      setResult(null);
    } catch (requestError) {
      console.error(requestError);
      const fallback =
        "Something went wrong while drafting your summary. Please try again.";
      const message =
        requestError instanceof Error &&
        requestError.message &&
        requestError.message !== "Request failed"
          ? requestError.message
          : fallback;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSummaryConfirm() {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await postToApi({ stage: "confirm", confirmed: true });

      if (data.stage !== "confirm") {
        throw new Error("Unexpected response stage");
      }

      setSummary(data.summary);
      setMoodMemory(data.moodMemory);
      setStage("refine");
      setSummaryFeedback("");
    } catch (requestError) {
      console.error(requestError);
      const fallback = "We couldn’t confirm the summary. Please try again.";
      const message =
        requestError instanceof Error &&
        requestError.message &&
        requestError.message !== "Request failed"
          ? requestError.message
          : fallback;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSummaryRevision() {
    if (isLoading || summaryFeedback.trim().length === 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await postToApi({
        stage: "confirm",
        confirmed: false,
        feedback: summaryFeedback,
      });

      if (data.stage !== "confirm") {
        throw new Error("Unexpected response stage");
      }

      setSummary(data.summary);
      setMoodMemory(data.moodMemory);
      setSummaryFeedback("");
    } catch (requestError) {
      console.error(requestError);
      const fallback = "We couldn’t revise the summary. Please try again.";
      const message =
        requestError instanceof Error &&
        requestError.message &&
        requestError.message !== "Request failed"
          ? requestError.message
          : fallback;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const commands = refinementText
        .split(/\r?\n/)
        .map((command) => command.trim())
        .filter((command) => command.length > 0);

      const refineResponse = await postToApi({
        stage: "refine",
        refinementCommands: commands,
        moodMemory: moodMemory.trim() ? moodMemory.trim() : undefined,
      });

      if (refineResponse.stage !== "refine") {
        throw new Error("Unexpected response stage");
      }

      setSummary(refineResponse.summary);
      setMoodMemory(refineResponse.moodMemory);
      setRefinementCommands(refineResponse.refinementCommands);
      setRefinementText(refineResponse.refinementCommands.join("\n"));

      const generateResponse = await postToApi({ stage: "generate" });

      if (generateResponse.stage !== "generate") {
        throw new Error("Unexpected response stage");
      }

      const finalResult: FinalResult = {
        summary: generateResponse.summary,
        moodMemory: generateResponse.moodMemory,
        positivePrompt: generateResponse.positivePrompt,
        negativePrompt: generateResponse.negativePrompt,
        settings: generateResponse.settings,
        refinementCommands: generateResponse.refinementCommands,
      };

      setSummary(finalResult.summary);
      setMoodMemory(finalResult.moodMemory);
      setRefinementCommands(finalResult.refinementCommands);
      setRefinementText(finalResult.refinementCommands.join("\n"));
      setResult(finalResult);
      setStage("result");
    } catch (requestError) {
      console.error(requestError);
      const fallback =
        "Something went wrong generating your image prompt. Please try again.";
      const message =
        requestError instanceof Error &&
        requestError.message &&
        requestError.message !== "Request failed"
          ? requestError.message
          : fallback;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  const refinementsText = useMemo(() => {
    if (refinementCommands.length === 0) {
      return "";
    }
    return refinementCommands.map((command) => `• ${command}`).join("\n");
  }, [refinementCommands]);

  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        {stage === "seed" && (
          <form
            onSubmit={handleSeedSubmit}
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
              disabled={disableSeed}
              className="w-full rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {isLoading ? "Drafting summary…" : "Draft summary"}
            </button>

            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}
          </form>
        )}

        {stage === "confirm" && (
          <section className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <header className="space-y-1">
              <h2 className="text-2xl font-semibold text-white">Review the summary</h2>
              <p className="text-sm text-slate-300">
                Make sure the summary captures your idea before we move on to refinements.
              </p>
            </header>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-sm leading-6 text-slate-100">{summary}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Want adjustments? Tell us what to fix
              </label>
              <textarea
                value={summaryFeedback}
                onChange={(event) => setSummaryFeedback(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
                placeholder="Lean more into the mystery and mention the glowing flora."
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleSummaryConfirm}
                disabled={isLoading}
                className="flex-1 rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                {isLoading ? "Confirming…" : "Looks good"}
              </button>
              <button
                type="button"
                onClick={handleSummaryRevision}
                disabled={isLoading || summaryFeedback.trim().length === 0}
                className="flex-1 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/90 backdrop-blur disabled:cursor-not-allowed disabled:border-white/10 disabled:text-slate-400"
              >
                {isLoading ? "Sending…" : "Request revision"}
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetConversation}
                disabled={isLoading}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 disabled:cursor-not-allowed disabled:text-slate-500"
              >
                Start over
              </button>
            </div>
            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}
          </section>
        )}

        {stage === "refine" && (
          <form
            onSubmit={handleGenerate}
            className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
          >
            <header className="space-y-1">
              <h2 className="text-2xl font-semibold text-white">Refine the shot</h2>
              <p className="text-sm text-slate-300">
                Add concise commands—one per line—to guide composition, lighting, or details.
              </p>
            </header>
            <textarea
              value={refinementText}
              onChange={(event) => setRefinementText(event.target.value)}
              rows={5}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
              placeholder={`Example:\nCenter the child in frame\nAdd bioluminescent spores in the air`}
            />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Mood memory (optional)
              </label>
              <input
                value={moodMemory}
                onChange={(event) => setMoodMemory(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
                placeholder="Tender cosmic wonder"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-600"
            >
              {isLoading ? "Generating…" : "Generate final prompt"}
            </button>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetConversation}
                disabled={isLoading}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 disabled:cursor-not-allowed disabled:text-slate-500"
              >
                Start over
              </button>
            </div>
            {error && (
              <p className="text-sm text-rose-400" role="alert">
                {error}
              </p>
            )}
          </form>
        )}

        {stage === "result" && result && (
          <section className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
            <header className="space-y-1">
              <h2 className="text-2xl font-semibold text-white">Prompts ready</h2>
              <p className="text-sm text-slate-300">
                Copy your prompts below or jump back to refinements to keep iterating.
              </p>
            </header>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setStage("refine");
                  setError(null);
                }}
                className="flex-1 rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30"
              >
                Add more refinements
              </button>
              <button
                type="button"
                onClick={resetConversation}
                className="flex-1 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/90 backdrop-blur"
              >
                Start a new idea
              </button>
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-4">
        {!summary && !result && !error && (
          <div className="h-full rounded-3xl border border-dashed border-white/10 bg-slate-950/30 p-6 text-center text-sm text-slate-400">
            Work through the steps on the left. Your summary, refinements, and prompts will appear here as you go.
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            <ResultCard title="Summary" description={summary} />
            {moodMemory && (
              <ResultCard title="Mood memory" description={moodMemory} />
            )}
            {refinementsText && (
              <ResultCard title="Refinement commands" description={refinementsText} />
            )}
          </div>
        )}

        {result && (
          <div className="space-y-6">
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
            {error}
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
  settings: SettingsMap;
};

function SettingsCard({ settings }: SettingsCardProps) {
  const entries = Object.entries(settings);

  if (entries.length === 0) {
    return null;
  }

  const settingsText = entries.map(([key, value]) => `${key}: ${value}`).join("\n");

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Suggested settings
        </h2>
        <CopyButton text={settingsText} label="Copy settings" />
      </header>
      <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-200 sm:grid-cols-2">
        {entries.map(([label, value]) => (
          <Setting key={label} label={label} value={value} />
        ))}
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
