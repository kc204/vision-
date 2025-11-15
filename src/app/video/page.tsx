"use client";

import { FormEvent, useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";

type AspectRatio = "16:9" | "9:16";

type VideoPlanPayload = {
  visionSeed: string;
  script: string;
  tone: string;
  style: string;
  aspectRatio: AspectRatio;
  lighting?: string;
  composition?: string;
};

type DirectorRequest = {
  mode: "video_plan";
  payload: VideoPlanPayload;
};

type DirectorError = {
  error: string;
};

type VideoPlanScene = {
  id?: string;
  title?: string;
  summary?: string;
  visuals?: string;
  script?: string;
  audio?: string;
  camera?: string;
  duration?: string;
  raw: Record<string, unknown>;
};

type VideoPlanResponse = {
  thumbnailConcept: Record<string, unknown>;
  scenes: VideoPlanScene[];
  original: Record<string, unknown>;
  scenesOriginal: Record<string, unknown>[];
  planSummary?: string;
  title?: string;
};

const aspectRatioOptions: AspectRatio[] = ["16:9", "9:16"];
const toneOptions = [
  "Playful",
  "Cinematic",
  "Documentary",
  "Inspirational",
  "High energy",
];
const styleOptions = [
  "Live action",
  "Mixed media",
  "Product showcase",
  "Docu-style",
  "Social-first",
];
const lightingOptions = [
  "No preference",
  "Golden hour glow",
  "Soft diffused studio",
  "High-contrast noir",
  "Neon night wash",
];
const compositionOptions = [
  "No preference",
  "Rule of thirds",
  "Centered hero",
  "Symmetrical",
  "Dynamic diagonal",
];

function normalizeVideoPlanResponse(data: unknown): VideoPlanResponse | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  const thumbnail = record.thumbnailConcept;
  const scenes = record.scenes;

  if (!thumbnail || typeof thumbnail !== "object") {
    return null;
  }

  if (!Array.isArray(scenes)) {
    return null;
  }

  const sceneRecords = scenes.filter(
    (scene): scene is Record<string, unknown> =>
      Boolean(scene) && typeof scene === "object"
  );

  const getPlanSummary = () => {
    if (typeof record.planSummary === "string") {
      return record.planSummary;
    }
    if (typeof record.summary === "string") {
      return record.summary;
    }
    if (typeof record.overview === "string") {
      return record.overview;
    }
    return undefined;
  };

  const normalizedScenes = sceneRecords.map((sceneRecord) => {
    const readString = (key: string) => {
      const value = sceneRecord[key];
      return typeof value === "string" ? value : undefined;
    };

    return {
      id: readString("id"),
      title: readString("title"),
      summary: readString("summary") ?? readString("description"),
      visuals: readString("visuals") ?? readString("visual_description"),
      script: readString("script") ?? readString("voiceover"),
      audio: readString("audio") ?? readString("sound"),
      camera: readString("camera") ?? readString("camera_notes"),
      duration: readString("duration") ?? readString("timing"),
      raw: sceneRecord,
    } satisfies VideoPlanScene;
  });

  return {
    thumbnailConcept: thumbnail as Record<string, unknown>,
    scenes: normalizedScenes,
    original: record,
    scenesOriginal: sceneRecords,
    planSummary: getPlanSummary(),
    title: typeof record.title === "string" ? record.title : undefined,
  } satisfies VideoPlanResponse;
}

function extractStringEntries(
  record: Record<string, unknown>
): [string, string][] {
  return Object.entries(record).reduce<[string, string][]>((entries, entry) => {
    const [key, value] = entry;
    if (typeof value === "string" && value.trim().length > 0) {
      entries.push([key, value]);
    }
    return entries;
  }, []);
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function VideoPlanBuilderPage() {
  const [visionSeed, setVisionSeed] = useState("");
  const [script, setScript] = useState("");
  const [tone, setTone] = useState(toneOptions[0]);
  const [style, setStyle] = useState(styleOptions[0]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [lighting, setLighting] = useState(lightingOptions[0]);
  const [composition, setComposition] = useState(compositionOptions[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<VideoPlanResponse | null>(null);

  const disableSubmit = useMemo(() => {
    return (
      isSubmitting ||
      visionSeed.trim().length === 0 ||
      script.trim().length === 0
    );
  }, [isSubmitting, script, visionSeed]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disableSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setPlan(null);

    const payload: VideoPlanPayload = {
      visionSeed: visionSeed.trim(),
      script: script.trim(),
      tone,
      style,
      aspectRatio,
      lighting:
        lighting && lighting !== lightingOptions[0] ? lighting : undefined,
      composition:
        composition && composition !== compositionOptions[0]
          ? composition
          : undefined,
    };

    const requestBody: DirectorRequest = {
      mode: "video_plan",
      payload,
    };

    try {
      const payload: VideoPlanDirectorRequest = {
        mode: "video_plan",
        visionSeed: {
          scriptText: formValues.scriptText,
          tone: formValues.tone,
          palette: formValues.palette,
          references: parseReferences(formValues.references),
          aspectRatio: formValues.aspectRatio,
        },
        segmentation: collectResult.segmentation,
        sceneAnswers: collectResult.segmentation.map((scene) => ({
          sceneId: scene.id,
          answer: sceneAnswers[scene.id] ?? "",
        })),
        directRender: true,
        finalPlanOverride: plan,
      };

      const response = await fetch("/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorPayload = (await response
          .json()
          .catch(() => null)) as DirectorError | null;
        throw new Error(errorPayload?.error ?? "Failed to generate plan");
      }

      const data = await response.json();
      const normalized = normalizeVideoPlanResponse(data);

      if (!normalized) {
        throw new Error("Received malformed plan data");
      }

      setPlan(normalized);
      // TODO: Trigger Veo 3 generation flow with normalized.scenesOriginal once the renderer pipeline is ready.
    } catch (requestError) {
      console.error(requestError);
      setPlan(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to generate plan"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasPlan = plan && plan.scenes.length > 0;

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
            Vision Director
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Shape a video plan in one pass
          </h1>
          <p className="text-sm text-slate-300">
            Drop a vision seed, pair it with script context, and add tone and
            style guidance. The director will map out thumbnail concepts and
            scene beats you can reuse downstream.
          </p>
        </header>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-200">
            Vision Seed
          </label>
          <textarea
            value={visionSeed}
            onChange={(event) => setVisionSeed(event.target.value)}
            rows={5}
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder="We open on a founder walking through a buzzing studio, describing how their product reframes remote collaboration"
          />
          <p className="text-xs text-slate-400">
            A quick vibe check for the plan—describe the feeling, pacing, or
            hook.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-200">
            Script or beats
          </label>
          <textarea
            value={script}
            onChange={(event) => setScript(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder="Intro: We believe meetings should energize teams..."
          />
          <p className="text-xs text-slate-400">
            Paste draft narration or bullet beats—the planner will align scenes
            to this structure.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Tone
            </label>
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            >
              {toneOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Style
            </label>
            <select
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            >
              {styleOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Aspect ratio
            </label>
            <select
              value={aspectRatio}
              onChange={(event) =>
                setAspectRatio(event.target.value as AspectRatio)
              }
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            >
              {aspectRatioOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Lighting preference
            </label>
            <select
              value={lighting}
              onChange={(event) => setLighting(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            >
              {lightingOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Composition focus
            </label>
            <select
              value={composition}
              onChange={(event) => setComposition(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            >
              {compositionOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={disableSubmit}
          className="inline-flex w-full items-center justify-center rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-canvas-accent focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Drafting plan..." : "Generate video plan"}
        </button>

        {error ? (
          <p className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
        ) : null}
      </form>

      <aside className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Plan output</h2>
          <p className="text-sm text-slate-300">
            Review the thumbnail concept and scene breakdown. Copy the full plan
            JSON or just the scenes when you&apos;re ready to prompt downstream
            tools.
          </p>
          {plan ? (
            <div className="flex flex-wrap gap-3">
              <CopyButton
                text={JSON.stringify(plan.original, null, 2)}
                label="Copy full plan"
                className="inline-flex items-center rounded-md bg-canvas-accent px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500/90"
              />
              <CopyButton
                text={JSON.stringify(plan.scenesOriginal, null, 2)}
                label="Copy scenes only"
                className="inline-flex items-center rounded-md bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
              />
            </div>
          ) : null}
        </header>

        {plan ? (
          <div className="space-y-6">
            {plan.title ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-canvas-accent">
                  Working title
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {plan.title}
                </p>
                {plan.planSummary ? (
                  <p className="mt-2 text-sm text-slate-300">{plan.planSummary}</p>
                ) : null}
              </div>
            ) : plan.planSummary ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-canvas-accent">
                  Overview
                </p>
                <p className="mt-2 text-sm text-slate-300">{plan.planSummary}</p>
              </div>
            ) : null}

            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Thumbnail concept</h3>
              <div className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                {extractStringEntries(plan.thumbnailConcept).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs uppercase tracking-[0.2em] text-canvas-accent">
                      {formatLabel(key)}
                    </p>
                    <p className="mt-1 text-sm text-slate-200">{value}</p>
                  </div>
                ))}
                {extractStringEntries(plan.thumbnailConcept).length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No thumbnail notes were provided.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Scenes</h3>
              {hasPlan ? (
                <div className="space-y-4">
                  {plan.scenes.map((scene, index) => {
                    const entries = extractStringEntries(scene.raw).filter(
                      ([key]) => key !== "title"
                    );

                    return (
                      <article
                        key={scene.id ?? scene.title ?? index}
                        className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                      >
                        <header>
                          <p className="text-xs uppercase tracking-[0.2em] text-canvas-accent">
                            Scene {index + 1}
                          </p>
                          <h4 className="mt-1 text-lg font-semibold text-white">
                            {scene.title ?? scene.id ?? `Scene ${index + 1}`}
                          </h4>
                        </header>
                        {scene.summary ? (
                          <p className="text-sm text-slate-200">{scene.summary}</p>
                        ) : null}
                        <dl className="grid gap-3 sm:grid-cols-2">
                          {entries.map(([key, value]) => (
                            <div key={key}>
                              <dt className="text-xs uppercase tracking-[0.2em] text-canvas-accent">
                                {formatLabel(key)}
                              </dt>
                              <dd className="mt-1 text-sm text-slate-200">{value}</dd>
                            </div>
                          ))}
                        </dl>
                        {entries.length === 0 && !scene.summary ? (
                          <p className="text-sm text-slate-400">
                            No additional scene details provided.
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Waiting for plan output. Submit the form to see the scene
                  breakdown.
                </p>
              )}
            </section>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/20 p-6 text-center">
            <p className="text-sm text-slate-400">
              Plan output will appear here after you generate a video plan.
            </p>
          </div>
        )}
      </aside>
    </section>
  );
}
