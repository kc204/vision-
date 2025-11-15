"use client";

import { FormEvent, useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";

type VideoPlanRequestPayload = {
  scriptText: string;
  tone: "informative" | "hype" | "calm" | "dark" | "inspirational";
  visualStyle: "realistic" | "stylized" | "anime" | "mixed-media";
  aspectRatio: "16:9" | "9:16";
};

type ContinuityLock = {
  subject_identity: string;
  lighting_and_palette: string;
  camera_grammar: string;
  environment_motif: string;
};

type ScenePlan = {
  segment_title: string;
  scene_description: string;
  main_subject: string;
  camera_movement: string;
  visual_tone: string;
  motion: string;
  mood: string;
  narrative: string;
  sound_suggestion: string;
  text_overlay: string;
  voice_timing_hint: string;
  broll_suggestions: string;
  graphics_callouts: string;
  editor_notes: string;
  continuity_lock: ContinuityLock;
  acceptance_check: string[];
};

type VideoPlanResponse = {
  scenes: ScenePlan[];
  thumbnailConcept: string;
};

const toneOptions: VideoPlanRequestPayload["tone"][] = [
  "informative",
  "hype",
  "calm",
  "dark",
  "inspirational",
];

const styleOptions: VideoPlanRequestPayload["visualStyle"][] = [
  "realistic",
  "stylized",
  "anime",
  "mixed-media",
];

const aspectRatios: VideoPlanRequestPayload["aspectRatio"][] = ["16:9", "9:16"];

export default function VideoPlanPage() {
  const [formValues, setFormValues] = useState<VideoPlanRequestPayload>({
    scriptText: "",
    tone: "informative",
    visualStyle: "realistic",
    aspectRatio: "16:9",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoPlanResponse | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<Record<number, boolean>>({});

  const disableGenerate = useMemo(() => {
    return formValues.scriptText.trim().length === 0 || isLoading;
  }, [formValues.scriptText, isLoading]);

  function updateField<Key extends keyof VideoPlanRequestPayload>(
    key: Key,
    value: VideoPlanRequestPayload[Key]
  ) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disableGenerate) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-video-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValues),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as VideoPlanResponse;
      setResult(data);
      setExpandedScenes({});
    } catch (requestError) {
      console.error(requestError);
      setError(
        "Something went wrong generating your video plan. Please try again or simplify your script."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function toggleScene(index: number) {
    setExpandedScenes((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  const jsonPayload = result
    ? JSON.stringify(
        {
          thumbnailConcept: result.thumbnailConcept,
          scenes: result.scenes,
        },
        null,
        2
      )
    : "";

  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <div>
          <h1 className="text-3xl font-semibold text-white">
            Turn your script into cinematic scenes
          </h1>
          <label className="mt-4 block text-sm font-medium text-slate-200">
            Paste your script or narration
          </label>
          <p className="mt-1 text-xs text-slate-400">
            This can be the full YouTube script, a voiceover, or bullet points.
          </p>
          <textarea
            value={formValues.scriptText}
            onChange={(event) => updateField("scriptText", event.target.value)}
            rows={8}
            className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder="Opening hook, key talking points, and closing CTA..."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Video tone"
            options={toneOptions}
            value={formValues.tone}
            onChange={(value) => updateField("tone", value)}
          />
          <SelectField
            label="Visual style"
            options={styleOptions}
            value={formValues.visualStyle}
            onChange={(value) => updateField("visualStyle", value)}
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-200">Aspect ratio</span>
          <div className="mt-2 inline-flex rounded-lg border border-white/10 bg-slate-950/30 p-1">
            {aspectRatios.map((ratio) => {
              const isActive = formValues.aspectRatio === ratio;
              return (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => updateField("aspectRatio", ratio)}
                  className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-canvas-accent text-white shadow"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {ratio === "16:9" ? "16:9 (YouTube)" : "9:16 (Shorts)"}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={disableGenerate}
          className="w-full rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isLoading ? "Generating…" : "Generate Video Plan"}
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
            Your scene-by-scene plan will appear here after you generate.
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <header className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Thumbnail concept
                </h2>
                <CopyButton text={result.thumbnailConcept} label="Copy thumbnail idea" />
              </header>
              <p className="mt-3 text-sm leading-6 text-slate-100">
                {result.thumbnailConcept}
              </p>
            </article>

            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Scene breakdown
              </h2>
              <CopyButton text={jsonPayload} label="Copy JSON" />
            </div>

            <div className="space-y-4">
              {result.scenes.map((scene, index) => {
                const isExpanded = expandedScenes[index];
                return (
                  <article
                    key={scene.segment_title + index}
                    className="rounded-2xl border border-white/10 bg-slate-950/40"
                  >
                    <button
                      type="button"
                      onClick={() => toggleScene(index)}
                      className="flex w-full items-center justify-between gap-4 rounded-t-2xl px-5 py-4 text-left"
                    >
                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {scene.segment_title}
                        </h3>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                          {scene.mood} · {scene.camera_movement}
                        </p>
                      </div>
                      <span className="text-sm text-slate-400">
                        {isExpanded ? "Hide details" : "More details"}
                      </span>
                    </button>
                    <div className="space-y-4 border-t border-white/10 px-5 py-4 text-sm text-slate-100">
                      <Description label="Scene description" value={scene.scene_description} />
                      <Description label="Main subject" value={scene.main_subject} />
                      <Description label="Visual tone" value={scene.visual_tone} />
                      <Description label="Editor notes" value={scene.editor_notes} />
                      {isExpanded && (
                        <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/60 p-4">
                          <Description label="Motion" value={scene.motion} />
                          <Description label="Narrative" value={scene.narrative} />
                          <Description label="Sound suggestion" value={scene.sound_suggestion} />
                          <Description label="Text overlay" value={scene.text_overlay} />
                          <Description label="Voice timing hint" value={scene.voice_timing_hint} />
                          <Description label="B-roll suggestions" value={scene.broll_suggestions} />
                          <Description label="Graphics callouts" value={scene.graphics_callouts} />
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                            Continuity lock
                          </h4>
                          <ul className="space-y-2 text-xs text-slate-300">
                            <li>
                              <strong className="text-slate-200">Subject identity:</strong> {" "}
                              {scene.continuity_lock.subject_identity}
                            </li>
                            <li>
                              <strong className="text-slate-200">Lighting & palette:</strong> {" "}
                              {scene.continuity_lock.lighting_and_palette}
                            </li>
                            <li>
                              <strong className="text-slate-200">Camera grammar:</strong> {" "}
                              {scene.continuity_lock.camera_grammar}
                            </li>
                            <li>
                              <strong className="text-slate-200">Environment motif:</strong> {" "}
                              {scene.continuity_lock.environment_motif}
                            </li>
                          </ul>
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                              Acceptance check
                            </h4>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-300">
                              {scene.acceptance_check.map((item, bulletIndex) => (
                                <li key={bulletIndex}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            Something went wrong generating your video plan. Please try again or simplify your script.
          </div>
        )}
      </aside>
    </section>
  );
}

type SelectFieldProps<Value extends string> = {
  label: string;
  options: readonly Value[];
  value: Value;
  onChange: (value: Value) => void;
};

function SelectField<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SelectFieldProps<Value>) {
  return (
    <label className="block text-sm">
      <span className="mb-1 font-medium text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
        className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
      >
        {options.map((option) => (
          <option key={option} value={option} className="text-slate-900">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type DescriptionProps = {
  label: string;
  value: string;
};

function Description({ label, value }: DescriptionProps) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </h4>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-100">
        {value || "—"}
      </p>
    </div>
  );
}
