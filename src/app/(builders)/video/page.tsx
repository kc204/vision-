"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CopyButton } from "@/components/copy-button";
import {
  AspectRatioOption,
  DirectorRequest,
  VideoPlanResponse,
  parseVideoPlanResponse,
} from "@/types/director";

const toneOptions = [
  { value: "cinematic", label: "Cinematic" },
  { value: "documentary", label: "Documentary" },
  { value: "playful", label: "Playful" },
  { value: "inspirational", label: "Inspirational" },
] as const;

const styleOptions = [
  { value: "live_action", label: "Live action" },
  { value: "animation", label: "Animation" },
  { value: "mixed_media", label: "Mixed media" },
  { value: "motion_graphics", label: "Motion graphics" },
] as const;

const aspectRatioOptions: AspectRatioOption[] = ["16:9", "9:16", "1:1"];

const lightingOptions = [
  { value: "", label: "No preference" },
  { value: "golden_hour", label: "Golden hour glow" },
  { value: "studio_soft", label: "Soft studio key light" },
  { value: "high_contrast", label: "High-contrast noir" },
] as const;

const compositionOptions = [
  { value: "", label: "No preference" },
  { value: "rule_of_thirds", label: "Rule of thirds" },
  { value: "centered", label: "Centered hero" },
  { value: "leading_lines", label: "Leading lines" },
] as const;

export default function VideoPlanPage() {
  const [visionSeed, setVisionSeed] = useState("");
  const [script, setScript] = useState("");
  const [tone, setTone] = useState<(typeof toneOptions)[number]["value"]>(
    toneOptions[0].value
  );
  const [style, setStyle] = useState<(typeof styleOptions)[number]["value"]>(
    styleOptions[0].value
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>(
    aspectRatioOptions[0]
  );
  const [lighting, setLighting] = useState<(typeof lightingOptions)[number]["value"]>(
    lightingOptions[0].value
  );
  const [composition, setComposition] = useState<
    (typeof compositionOptions)[number]["value"]
  >(compositionOptions[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<VideoPlanResponse | null>(null);

  const latestPlanRef = useRef<VideoPlanResponse | null>(null);

  useEffect(() => {
    latestPlanRef.current = plan;
  }, [plan]);

  const disableSubmit = useMemo(() => {
    return (
      isSubmitting ||
      visionSeed.trim().length === 0 ||
      script.trim().length === 0
    );
  }, [isSubmitting, script, visionSeed]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disableSubmit) return;

    setIsSubmitting(true);
    setError(null);

    const payload: DirectorRequest = {
      mode: "video_plan",
      visionSeed: visionSeed.trim(),
      script: script.trim(),
      tone,
      style,
      aspectRatio,
      ...(lighting && lighting.trim() ? { lighting } : {}),
      ...(composition && composition.trim() ? { composition } : {}),
    };

    try {
      const response = await fetch("/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Director request failed");
      }

      const json = await response.json();
      const parsed = parseVideoPlanResponse(json);

      setPlan(parsed);
      latestPlanRef.current = parsed;
      // TODO: Integrate Veo 3 generation using latestPlanRef.current.
    } catch (requestError) {
      console.error(requestError);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Director request failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const helperText =
    "Write this like you’d text a friend. No art or film jargon needed.";

  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <div>
          <h1 className="text-3xl font-semibold text-white">
            Plan a cinematic video
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {"Describe what you want (Vision Seed)"}
          </p>
          <p className="mt-1 text-xs text-slate-400">{helperText}</p>
          <textarea
            value={visionSeed}
            onChange={(event) => setVisionSeed(event.target.value)}
            rows={5}
            className="mt-4 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder="A weekend travel vlog about discovering hidden ramen spots in Tokyo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Script or beat outline
          </label>
          <textarea
            value={script}
            onChange={(event) => setScript(event.target.value)}
            rows={6}
            className="mt-3 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder="Intro hook, scene breakdowns, call to action…"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Tone
            </label>
            <select
              value={tone}
              onChange={(event) =>
                setTone(event.target.value as (typeof toneOptions)[number]["value"])
              }
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            >
              {toneOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="text-slate-900"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Style
            </label>
            <select
              value={style}
              onChange={(event) =>
                setStyle(
                  event.target.value as (typeof styleOptions)[number]["value"]
                )
              }
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            >
              {styleOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="text-slate-900"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Aspect ratio
            </label>
            <select
              value={aspectRatio}
              onChange={(event) =>
                setAspectRatio(event.target.value as AspectRatioOption)
              }
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            >
              {aspectRatioOptions.map((option) => (
                <option key={option} value={option} className="text-slate-900">
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Lighting
            </label>
            <select
              value={lighting}
              onChange={(event) =>
                setLighting(
                  event.target.value as (typeof lightingOptions)[number]["value"]
                )
              }
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            >
              {lightingOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="text-slate-900"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            Composition
          </label>
          <select
            value={composition}
            onChange={(event) =>
              setComposition(
                event.target.value as (typeof compositionOptions)[number]["value"]
              )
            }
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
          >
            {compositionOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="text-slate-900"
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={disableSubmit}
          className="w-full rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {isSubmitting ? "Planning…" : "Generate video plan"}
        </button>
      </form>

      <aside className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-xl backdrop-blur">
        <div>
          <h2 className="text-2xl font-semibold text-white">Director Core plan</h2>
          <p className="mt-2 text-sm text-slate-300">
            Once generated, your thumbnail concept and scene breakdown will appear
            here.
          </p>
        </div>

        {plan ? (
          <div className="space-y-6">
            <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    Thumbnail concept
                  </h3>
                  {plan.thumbnail.title ? (
                    <p className="mt-1 text-base font-semibold text-white">
                      {plan.thumbnail.title}
                    </p>
                  ) : null}
                  {plan.thumbnail.description ? (
                    <p className="mt-1 text-sm text-slate-300">
                      {plan.thumbnail.description}
                    </p>
                  ) : null}
                </div>
                <CopyButton
                  text={plan.thumbnail.prompt}
                  label="Copy prompt"
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20"
                />
              </div>
              <p className="rounded-xl bg-black/40 p-3 text-xs text-slate-200 whitespace-pre-wrap">
                {plan.thumbnail.prompt}
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Scenes
              </h3>
              {plan.scenes.map((scene) => (
                <article
                  key={scene.id}
                  className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-white">
                        {scene.title}
                      </h4>
                      {scene.summary ? (
                        <p className="mt-1 text-sm text-slate-300">
                          {scene.summary}
                        </p>
                      ) : scene.description ? (
                        <p className="mt-1 text-sm text-slate-300">
                          {scene.description}
                        </p>
                      ) : null}
                      {scene.voiceover ? (
                        <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                          Voiceover
                        </p>
                      ) : null}
                      {scene.voiceover ? (
                        <p className="text-sm text-slate-200 whitespace-pre-wrap">
                          {scene.voiceover}
                        </p>
                      ) : null}
                      {scene.duration ? (
                        <p className="mt-2 text-xs text-slate-400">
                          Suggested duration: {scene.duration}
                        </p>
                      ) : null}
                    </div>
                    <CopyButton
                      text={scene.prompt}
                      label="Copy prompt"
                      className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20"
                    />
                  </div>
                  <p className="rounded-xl bg-black/40 p-3 text-xs text-slate-200 whitespace-pre-wrap">
                    {scene.prompt}
                  </p>
                </article>
              ))}
            </section>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Submit your brief to generate a Director Core plan.
          </p>
        )}
      </aside>
    </section>
  );
}
