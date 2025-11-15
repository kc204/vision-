"use client";

import { useMemo, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { ImageDropzone } from "@/components/ImageDropzone";
import type { DirectorRequest, LoopCycleJSON, LoopSequencePayload } from "@/lib/directorTypes";

export default function LoopBuilderPage() {
  const [visionSeedText, setVisionSeedText] = useState("");
  const [startFrameDescription, setStartFrameDescription] = useState("");
  const [loopLength, setLoopLength] = useState<number | null>(4);
  const [moodProfile, setMoodProfile] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycles, setCycles] = useState<LoopCycleJSON[] | null>(null);

  const canSubmit = useMemo(() => {
    return (
      visionSeedText.trim().length > 0 &&
      startFrameDescription.trim().length > 0 &&
      !isSubmitting
    );
  }, [isSubmitting, startFrameDescription, visionSeedText]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setCycles(null);

    try {
      const images = await encodeFiles(files);
      const payload: LoopSequencePayload = {
        vision_seed_text: visionSeedText.trim(),
        start_frame_description: startFrameDescription.trim(),
        loop_length: typeof loopLength === "number" ? loopLength : null,
        mood_profile: moodProfile.trim().length ? moodProfile.trim() : null,
      };

      const requestPayload: DirectorRequest = {
        mode: "loop_sequence",
        payload,
        images: images.length ? images : undefined,
      };

      const response = await fetch("/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const message = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(message?.error ?? "Failed to generate loop plan");
      }

      const { text } = (await response.json()) as { text: string };
      const parsed = JSON.parse(text) as LoopCycleJSON[];
      setCycles(parsed);
    } catch (submissionError) {
      console.error(submissionError);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to generate loop plan"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
            Infinite Cinematic Loop Creator
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Map an endless cinematic loop
          </h1>
          <p className="text-sm text-slate-300">
            Describe the dreamlike loop you want, set the initial frame, and let the Director Core forecast each cycle with continuity locks.
          </p>
        </header>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-200">Vision Seed</span>
          <textarea
            value={visionSeedText}
            onChange={(event) => setVisionSeedText(event.target.value)}
            rows={4}
            placeholder="Theme, mood, palette, motifs, emotional arc"
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-200">Start frame</span>
          <textarea
            value={startFrameDescription}
            onChange={(event) => setStartFrameDescription(event.target.value)}
            rows={4}
            placeholder="Describe the exact frame where the loop begins"
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-200">Loop length</span>
            <input
              type="number"
              min={1}
              value={loopLength ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  setLoopLength(null);
                } else {
                  const parsed = Number.parseInt(value, 10);
                  setLoopLength(Number.isNaN(parsed) ? null : parsed);
                }
              }}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            />
            <span className="text-xs text-slate-400">
              Leave blank for 4–8 cycles. Provide a number to request an exact cycle count.
            </span>
          </label>
        </div>

        <ImageDropzone
          files={files}
          onFilesChange={setFiles}
          label="Vision Seed images"
          description="Drop PNG, JPG, or WEBP frames to influence the loop mood."
          maxFiles={6}
        />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-200">
            Mood profile (optional)
          </label>
          <textarea
            value={moodProfile}
            onChange={(event) => setMoodProfile(event.target.value)}
            rows={3}
            placeholder="Persistent motifs or palette to preserve each cycle"
            className="min-h-[96px] rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-canvas-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isSubmitting ? "Generating…" : "Generate loop plan"}
        </button>
        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <aside className="space-y-6">
        {!cycles && !error ? (
          <div className="min-h-[320px] rounded-3xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-sm text-slate-400">
            Loop cycles will appear here once generated.
          </div>
        ) : null}

        {cycles ? (
          <div className="space-y-4">
            {cycles.map((cycle, index) => (
              <LoopCycleCard key={`${cycle.segment_title}-${index}`} cycle={cycle} />
            ))}
            <CopyButton
              text={JSON.stringify(cycles, null, 2)}
              label="Copy loop JSON"
              className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-white/30 hover:bg-white/10"
            />
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </aside>
    </section>
  );
}

type LoopCycleCardProps = {
  cycle: LoopCycleJSON;
};

function LoopCycleCard({ cycle }: LoopCycleCardProps) {
  return (
    <article className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">Cycle</p>
        <h2 className="text-lg font-semibold text-white">{cycle.segment_title}</h2>
      </header>

      <div className="grid gap-3 text-sm text-slate-200">
        <Detail label="Scene description" value={cycle.scene_description} />
        <Detail label="Main subject" value={cycle.main_subject} />
        <Detail label="Camera movement" value={cycle.camera_movement} />
        <Detail label="Visual tone" value={cycle.visual_tone} />
        <Detail label="Motion" value={cycle.motion} />
        <Detail label="Mood" value={cycle.mood} />
        <Detail label="Narrative" value={cycle.narrative} />
        {cycle.sound_suggestion && (
          <Detail label="Sound suggestion" value={cycle.sound_suggestion} />
        )}
      </div>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Continuity lock
        </h3>
        <ul className="grid gap-2 text-sm text-slate-200">
          <li className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <strong className="block text-xs uppercase tracking-wide text-slate-400">
              Subject identity
            </strong>
            {cycle.continuity_lock.subject_identity}
          </li>
          <li className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <strong className="block text-xs uppercase tracking-wide text-slate-400">
              Lighting & palette
            </strong>
            {cycle.continuity_lock.lighting_and_palette}
          </li>
          <li className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <strong className="block text-xs uppercase tracking-wide text-slate-400">
              Camera grammar
            </strong>
            {cycle.continuity_lock.camera_grammar}
          </li>
          <li className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <strong className="block text-xs uppercase tracking-wide text-slate-400">
              Environment motif
            </strong>
            {cycle.continuity_lock.environment_motif}
          </li>
          <li className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <strong className="block text-xs uppercase tracking-wide text-slate-400">
              Emotional trajectory
            </strong>
            {cycle.continuity_lock.emotional_trajectory}
          </li>
        </ul>
      </section>

      {cycle.acceptance_check?.length ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Acceptance check
          </h3>
          <ul className="space-y-1 text-sm text-slate-200">
            {cycle.acceptance_check.map((check, idx) => (
              <li key={idx} className="rounded-lg border border-white/10 bg-slate-900/60 p-2">
                {check}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <p className="mt-1 whitespace-pre-wrap text-slate-100">{value}</p>
    </div>
  );
}

async function encodeFiles(files: File[]): Promise<string[]> {
  const encodings = await Promise.allSettled(files.map(readFileAsDataUrl));
  return encodings
    .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
    .map((result) => result.value);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to encode file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
