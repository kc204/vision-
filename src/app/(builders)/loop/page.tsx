"use client";

import { FormEvent, useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { ImageDropzone } from "@/components/image-dropzone";
import {
  LoopCycleJSON,
  LoopSequenceDirectorRequest,
} from "@/lib/directorTypes";

type DirectorError = {
  error: string;
};

export default function LoopSequenceBuilderPage() {
  const [visionSeed, setVisionSeed] = useState("");
  const [startFrame, setStartFrame] = useState<number>(0);
  const [loopLength, setLoopLength] = useState<number>(48);
  const [includeMoodProfile, setIncludeMoodProfile] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycles, setCycles] = useState<LoopCycleJSON[] | null>(null);

  const disableSubmit = useMemo(() => {
    return visionSeed.trim().length === 0 || isLoading;
  }, [visionSeed, isLoading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disableSubmit) return;

    setIsLoading(true);
    setError(null);

    try {
      const payload: LoopSequenceDirectorRequest = {
        mode: "loop_sequence",
        visionSeed,
        startFrame,
        loopLength,
        includeMoodProfile,
        images: referenceImage ? [referenceImage] : undefined,
      };

      const response = await fetch("/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as
          | DirectorError
          | null;
        throw new Error(
          errorPayload?.error ?? "Failed to generate loop sequence"
        );
      }

      const data = (await response.json()) as unknown;
      const parsed = normalizeLoopCycles(data);
      if (!parsed) {
        throw new Error("Received malformed loop data");
      }

      setCycles(parsed);
    } catch (requestError) {
      console.error(requestError);
      setCycles(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to generate loop sequence"
      );
    } finally {
      setIsLoading(false);
    }
  }

  const hasResults = Array.isArray(cycles) && cycles.length > 0;

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
            Loop Animator
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Build a seamless loop sequence
          </h1>
          <p className="text-sm text-slate-300">
            Describe the vibe (Vision Seed), pick a starting frame, and set how
            long the loop runs.
          </p>
          <p className="text-xs text-slate-400">
            Write like you’d text a collaborator—the director will translate it
            into production language.
          </p>
        </header>

        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-200">
            Vision Seed
          </label>
          <textarea
            value={visionSeed}
            onChange={(event) => setVisionSeed(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder="A neon-lit ramen stand in the rain, steam swirling into a holographic skyline as the night resets"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Start frame
            </label>
            <input
              type="number"
              value={startFrame}
              min={0}
              onChange={(event) =>
                setStartFrame(Number.parseInt(event.target.value, 10) || 0)
              }
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            />
            <p className="text-xs text-slate-400">
              Frame index where the loop begins (0 = first frame).
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Loop length (frames)
            </label>
            <input
              type="number"
              min={4}
              max={600}
              value={loopLength}
              onChange={(event) =>
                setLoopLength(
                  Math.max(4, Number.parseInt(event.target.value, 10) || 4)
                )
              }
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            />
            <p className="text-xs text-slate-400">
              Total duration of the loop. Most cycles look great between 24-96
              frames.
            </p>
          </div>
        </div>

        <ImageDropzone value={referenceImage} onChange={setReferenceImage} />

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <div>
            <p className="text-sm font-medium text-slate-200">
              Mood profile memory
            </p>
            <p className="text-xs text-slate-400">
              When enabled, the director adds a reusable mood profile to each
              cycle.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIncludeMoodProfile((previous) => !previous)}
            className={`inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs font-semibold transition ${
              includeMoodProfile
                ? "bg-canvas-accent text-white"
                : "bg-slate-900/60 text-slate-200"
            }`}
          >
            {includeMoodProfile ? "Enabled" : "Disabled"}
          </button>
        </div>

        <button
          type="submit"
          disabled={disableSubmit}
          className="w-full rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isLoading ? "Generating…" : "Generate loop cycles"}
        </button>

        {error && (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        )}
      </form>

      <aside className="space-y-4">
        {!hasResults && !error && (
          <div className="h-full min-h-[320px] rounded-3xl border border-dashed border-white/10 bg-slate-950/30 p-6 text-center text-sm text-slate-400">
            Loop plans will appear here once generated.
          </div>
        )}

        {hasResults && cycles && (
          <div className="space-y-6">
            {cycles.map((cycle) => (
              <LoopCycleCard key={cycle.cycle_id} cycle={cycle} />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            Something went wrong generating your loop. Please try again.
          </div>
        )}
      </aside>
    </section>
  );
}

function normalizeLoopCycles(payload: unknown): LoopCycleJSON[] | null {
  if (!payload) return null;
  if (Array.isArray(payload)) {
    return payload.filter(isLoopCycle);
  }

  if (
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as { cycles?: unknown }).cycles)
  ) {
    const cycles = (payload as { cycles: unknown[] }).cycles;
    return cycles.filter(isLoopCycle) as LoopCycleJSON[];
  }

  return null;
}

function isLoopCycle(value: unknown): value is LoopCycleJSON {
  if (!value || typeof value !== "object") return false;
  const cycle = value as Partial<LoopCycleJSON>;
  return (
    typeof cycle.cycle_id === "string" &&
    typeof cycle.prompt === "string" &&
    typeof cycle.start_frame === "number" &&
    typeof cycle.loop_length === "number" &&
    cycle.continuity_lock !== undefined &&
    typeof cycle.continuity_lock === "object"
  );
}

type LoopCycleCardProps = {
  cycle: LoopCycleJSON;
};

function LoopCycleCard({ cycle }: LoopCycleCardProps) {
  return (
    <article className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-lg">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {cycle.title ?? cycle.cycle_id}
          </h2>
          <CopyButton
            text={JSON.stringify(cycle, null, 2)}
            label="Copy JSON"
            className="inline-flex items-center rounded-md bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-inset ring-white/10 hover:bg-slate-900/80"
          />
        </div>
        {cycle.beat_summary && (
          <p className="text-sm text-slate-300">{cycle.beat_summary}</p>
        )}
        <p className="text-xs text-slate-400">
          Start frame {cycle.start_frame} · Loop length {cycle.loop_length}{" "}
          frames
        </p>
      </header>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">Prompt</h3>
        <p className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-sm text-slate-200">
          {cycle.prompt}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">
          Continuity locks
        </h3>
        <dl className="grid gap-2 text-sm text-slate-300">
          <div className="rounded-lg bg-slate-900/50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              Subject identity
            </dt>
            <dd>{cycle.continuity_lock.subject_identity}</dd>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              Lighting & palette
            </dt>
            <dd>{cycle.continuity_lock.lighting_and_palette}</dd>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              Camera grammar
            </dt>
            <dd>{cycle.continuity_lock.camera_grammar}</dd>
          </div>
          <div className="rounded-lg bg-slate-900/50 p-3">
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              Environment motif
            </dt>
            <dd>{cycle.continuity_lock.environment_motif}</dd>
          </div>
        </dl>
      </section>

      {cycle.keyframes && cycle.keyframes.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Keyframes</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {cycle.keyframes.map((keyframe) => (
              <li
                key={`${cycle.cycle_id}-${keyframe.frame}`}
                className="rounded-lg border border-white/5 bg-slate-950/60 p-3"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Frame {keyframe.frame}
                </p>
                <p>{keyframe.description}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                  {keyframe.camera && <span>Camera: {keyframe.camera}</span>}
                  {keyframe.motion && <span>Motion: {keyframe.motion}</span>}
                  {keyframe.lighting && <span>Lighting: {keyframe.lighting}</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cycle.mood_profile && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-200">Mood profile</h3>
          <p className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-sm text-slate-200">
            {cycle.mood_profile}
          </p>
        </section>
      )}
    </article>
  );
}
