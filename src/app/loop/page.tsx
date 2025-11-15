"use client";

import { FormEvent, useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";

type ContinuityLock = {
  subject_identity: string;
  lighting_and_palette: string;
  camera_grammar: string;
  environment_motif: string;
};

type LoopStoryBeat = {
  title: string;
  summary: string;
  continuity_lock: ContinuityLock;
  acceptance_check: string[];
};

type LoopEndFrame = {
  frame_prompt: string;
  motion_guidance: string;
  transition_signal: string;
};

type LoopCycle = {
  cycle: number;
  storyBeat: LoopStoryBeat;
  endFrame: LoopEndFrame;
  autopilot_directive: string;
};

type LoopCycleResponse = LoopCycle;

export default function LoopCreatorPage() {
  const [visionSeed, setVisionSeed] = useState("");
  const [inspirationReferences, setInspirationReferences] = useState("");
  const [startFramesInput, setStartFramesInput] = useState("");
  const [cycles, setCycles] = useState<LoopCycle[]>([]);
  const [isPredictiveMode, setIsPredictiveMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disableGenerate = useMemo(() => {
    return visionSeed.trim().length === 0 || isLoading;
  }, [visionSeed, isLoading]);

  const startFrames = useMemo(() => {
    return startFramesInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }, [startFramesInput]);

  async function runCycle(predictive: boolean) {
    if (disableGenerate) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-loop-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visionSeed,
          inspirationReferences,
          startFrames,
          previousCycles: cycles,
          predictiveMode: predictive,
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as LoopCycleResponse;
      setCycles((prev) => {
        const resolvedCycle = Number.isFinite(data.cycle)
          ? data.cycle
          : prev.length + 1;
        const cycleEntry: LoopCycle = {
          ...data,
          cycle: resolvedCycle,
        };
        return [...prev, cycleEntry];
      });
    } catch (requestError) {
      console.error(requestError);
      setError(
        "We couldn’t generate the next loop cycle. Try adjusting your inputs or wait a moment before retrying."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runCycle(isPredictiveMode);
  }

  function handleTogglePredictiveMode() {
    if (isPredictiveMode) {
      setIsPredictiveMode(false);
      return;
    }

    setIsPredictiveMode(true);

    if (!disableGenerate && cycles.length === 0) {
      void runCycle(true);
    }
  }

  function handleReset() {
    setCycles([]);
    setError(null);
  }

  const latestCycle = cycles[cycles.length - 1];
  const latestCycleJson = latestCycle
    ? JSON.stringify(latestCycle, null, 2)
    : "";

  return (
    <section className="grid gap-8 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <div>
          <h1 className="text-3xl font-semibold text-white">
            Orchestrate an infinite loop
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Feed a Vision Seed, reference inspiration, and hand off start frames
            to let the loop director evolve your scene beat by beat.
          </p>
        </div>

        <label className="block text-sm font-medium text-slate-200">
          Vision Seed
          <textarea
            value={visionSeed}
            onChange={(event) => setVisionSeed(event.target.value)}
            rows={5}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder="A fog-drenched cyberpunk alley where neon koi glide through the air"
          />
        </label>

        <label className="block text-sm font-medium text-slate-200">
          Inspiration references
          <textarea
            value={inspirationReferences}
            onChange={(event) => setInspirationReferences(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder="Blade Runner rain palette, Studio Ghibli whimsy, glitch art overlays"
          />
          <span className="mt-1 block text-xs text-slate-400">
            Drop links, artist names, or visual callouts the loop should honor.
          </span>
        </label>

        <label className="block text-sm font-medium text-slate-200">
          Drop-in start frames
          <textarea
            value={startFramesInput}
            onChange={(event) => setStartFramesInput(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder={"Frame 01 – protagonist silhouetted against neon signage\nFrame 02 – camera drifts up to reveal floating koi"}
          />
          <span className="mt-1 block text-xs text-slate-400">
            One frame per line. The director will treat them as the loop’s
            opening cadence.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={disableGenerate}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            {isLoading ? "Cycling…" : "Generate next cycle"}
          </button>
          <button
            type="button"
            onClick={handleTogglePredictiveMode}
            className={`inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              isPredictiveMode
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                : "border-white/20 text-white hover:border-white/40"
            }`}
          >
            {isPredictiveMode ? "Stop predictive mode" : "Start predictive mode"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-white/40"
          >
            Reset loop
          </button>
        </div>

        {error && (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        )}
      </form>

      <aside className="space-y-6">
        {cycles.length === 0 && !error && (
          <div className="h-full rounded-3xl border border-dashed border-white/10 bg-slate-950/30 p-6 text-sm text-slate-400">
            Your loop storybeats will land here. Kick things off with a Vision
            Seed and the director will return an end-frame plus continuity locks
            for the next cycle.
          </div>
        )}

        {cycles.length > 0 && (
          <div className="space-y-5">
            {cycles.map((cycle) => (
              <article
                key={cycle.cycle}
                className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-5"
              >
                <header className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
                      Cycle {cycle.cycle}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {cycle.storyBeat.title}
                    </h2>
                  </div>
                </header>
                <p className="text-sm text-slate-300">{cycle.storyBeat.summary}</p>
                <section className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    End frame
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    <li>
                      <span className="font-medium text-slate-100">Prompt:</span>{" "}
                      {cycle.endFrame.frame_prompt}
                    </li>
                    <li>
                      <span className="font-medium text-slate-100">Motion:</span>{" "}
                      {cycle.endFrame.motion_guidance}
                    </li>
                    <li>
                      <span className="font-medium text-slate-100">Handoff:</span>{" "}
                      {cycle.endFrame.transition_signal}
                    </li>
                  </ul>
                </section>
                <section className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Continuity lock
                  </h3>
                  <dl className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-400">Subject identity</dt>
                      <dd>{cycle.storyBeat.continuity_lock.subject_identity}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Lighting &amp; palette</dt>
                      <dd>{cycle.storyBeat.continuity_lock.lighting_and_palette}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Camera grammar</dt>
                      <dd>{cycle.storyBeat.continuity_lock.camera_grammar}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Environment motif</dt>
                      <dd>{cycle.storyBeat.continuity_lock.environment_motif}</dd>
                    </div>
                  </dl>
                </section>
                <section className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Acceptance check
                  </h3>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-200">
                    {cycle.storyBeat.acceptance_check.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </section>
                <p className="text-xs text-emerald-300">
                  Autopilot directive: {cycle.autopilot_directive}
                </p>
              </article>
            ))}
          </div>
        )}

        {latestCycle && (
          <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">Latest cycle JSON</h3>
              <CopyButton text={latestCycleJson} label="Copy JSON" />
            </div>
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-300">
              {latestCycleJson}
            </pre>
          </div>
        )}
      </aside>
    </section>
  );
}
