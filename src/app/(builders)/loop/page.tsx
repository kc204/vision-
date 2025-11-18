"use client";

import { useEffect, useMemo, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { GeneratedMediaGallery } from "@/components/GeneratedMediaGallery";
import { ImageDropzone } from "@/components/ImageDropzone";
import { Tooltip } from "@/components/Tooltip";
import { ServerCredentialNotice } from "@/components/ServerCredentialNotice";
import { ProviderApiKeyInput } from "@/components/ProviderApiKeyInput";
import type {
  DirectorMediaAsset,
  DirectorRequest,
  DirectorResponse,
  DirectorSuccessResponse,
  LoopCycleJSON,
  LoopSequencePayload,
  LoopSequenceResult,
} from "@/lib/directorTypes";
import {
  atmosphere,
  cameraAngles,
  cameraMovement,
  colorPalettes,
  composition,
  lightingStyles,
  shotSizes,
  type VisualOption,
} from "@/lib/visualOptions";

type LoopSelectedOptions = {
  cameraAngles: string[];
  shotSizes: string[];
  composition: string[];
  cameraMovement: string[];
  lightingStyles: string[];
  colorPalettes: string[];
  atmosphere: string[];
};

type LoopSummary = {
  loopLength?: number | null;
  frameRate?: number | null;
};

const optionGroups: Array<{
  key: keyof LoopSelectedOptions;
  label: string;
  options: VisualOption[];
}> = [
  { key: "cameraAngles", label: "Camera angles", options: cameraAngles },
  { key: "shotSizes", label: "Shot sizes", options: shotSizes },
  { key: "composition", label: "Composition", options: composition },
  { key: "cameraMovement", label: "Camera movement", options: cameraMovement },
  { key: "lightingStyles", label: "Lighting styles", options: lightingStyles },
  { key: "colorPalettes", label: "Color palettes", options: colorPalettes },
  { key: "atmosphere", label: "Atmosphere & effects", options: atmosphere },
];

const SAMPLE_LOOP_PLAN: {
  visionSeedText: string;
  startFrameDescription: string;
  loopLength: number;
  moodProfile: string;
  selectedOptions: LoopSelectedOptions;
} = {
  visionSeedText:
    "Synthwave city loop bathed in neon haze, cyclical chase between chrome android courier and drifting police drones.",
  startFrameDescription:
    "Nighttime rain-slick alley, neon billboards reflecting off puddles as the android crouches to launch the delivery cycle.",
  loopLength: 6,
  moodProfile:
    "Keep the vaporwave palette with electric magenta highlights, persistent rainfall shimmer, and a pulse of suspenseful synth bass.",
  selectedOptions: {
    cameraAngles: ["low_angle"],
    shotSizes: ["medium"],
    composition: ["split"],
    cameraMovement: ["steady_push"],
    lightingStyles: ["neon_bounce"],
    colorPalettes: ["vaporwave"],
    atmosphere: ["urban_noir_rain"],
  },
};

export default function LoopBuilderPage() {
  const [visionSeedText, setVisionSeedText] = useState("");
  const [startFrameDescription, setStartFrameDescription] = useState("");
  const [loopLength, setLoopLength] = useState<number | null>(null);
  const [moodProfile, setMoodProfile] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<LoopSelectedOptions>({
    cameraAngles: [],
    shotSizes: [],
    composition: [],
    cameraMovement: [],
    lightingStyles: [],
    colorPalettes: [],
    atmosphere: [],
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cycles, setCycles] = useState<LoopCycleJSON[] | null>(null);
  const [loopMediaAssets, setLoopMediaAssets] = useState<DirectorMediaAsset[]>([]);
  const [loopSummary, setLoopSummary] = useState<LoopSummary | null>(null);
  const [useSampleLoop, setUseSampleLoop] = useState(false);
  const [providerApiKey, setProviderApiKey] = useState("");

  useEffect(() => {
    if (useSampleLoop) {
      setVisionSeedText(SAMPLE_LOOP_PLAN.visionSeedText);
      setStartFrameDescription(SAMPLE_LOOP_PLAN.startFrameDescription);
      setLoopLength(SAMPLE_LOOP_PLAN.loopLength);
      setMoodProfile(SAMPLE_LOOP_PLAN.moodProfile);
      setSelectedOptions({
        cameraAngles: [...SAMPLE_LOOP_PLAN.selectedOptions.cameraAngles],
        shotSizes: [...SAMPLE_LOOP_PLAN.selectedOptions.shotSizes],
        composition: [...SAMPLE_LOOP_PLAN.selectedOptions.composition],
        cameraMovement: [...SAMPLE_LOOP_PLAN.selectedOptions.cameraMovement],
        lightingStyles: [...SAMPLE_LOOP_PLAN.selectedOptions.lightingStyles],
        colorPalettes: [...SAMPLE_LOOP_PLAN.selectedOptions.colorPalettes],
        atmosphere: [...SAMPLE_LOOP_PLAN.selectedOptions.atmosphere],
      });
    } else {
      setVisionSeedText("");
      setStartFrameDescription("");
      setLoopLength(null);
      setMoodProfile("");
      setSelectedOptions({
        cameraAngles: [],
        shotSizes: [],
        composition: [],
        cameraMovement: [],
        lightingStyles: [],
        colorPalettes: [],
        atmosphere: [],
      });
    }

    setFiles([]);
    setCycles(null);
    setLoopMediaAssets([]);
    setLoopSummary(null);
    setError(null);
  }, [useSampleLoop]);

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
    setLoopMediaAssets([]);
    setLoopSummary(null);

    try {
      const images = await encodeFiles(files);
      const payload: LoopSequencePayload = {
        vision_seed_text: visionSeedText.trim(),
        start_frame_description: startFrameDescription.trim(),
        loop_length: typeof loopLength === "number" ? loopLength : null,
        mood_profile: moodProfile.trim().length ? moodProfile.trim() : null,
      };

      if (selectedOptions.cameraAngles.length > 0) {
        payload.cameraAngles = selectedOptions.cameraAngles;
      }
      if (selectedOptions.shotSizes.length > 0) {
        payload.shotSizes = selectedOptions.shotSizes;
      }
      if (selectedOptions.composition.length > 0) {
        payload.composition = selectedOptions.composition;
      }
      if (selectedOptions.cameraMovement.length > 0) {
        payload.cameraMovement = selectedOptions.cameraMovement;
      }
      if (selectedOptions.lightingStyles.length > 0) {
        payload.lightingStyles = selectedOptions.lightingStyles;
      }
      if (selectedOptions.colorPalettes.length > 0) {
        payload.colorPalettes = selectedOptions.colorPalettes;
      }
      if (selectedOptions.atmosphere.length > 0) {
        payload.atmosphere = selectedOptions.atmosphere;
      }

      const requestPayload: DirectorRequest = {
        mode: "loop_sequence",
        payload,
        images: images.length ? images : undefined,
      };

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (providerApiKey.trim().length > 0) {
        headers["x-provider-api-key"] = providerApiKey.trim();
      }

      const response = await fetch("/api/director", {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload),
      });

      const rawResponseJson = (await response.json().catch(() => null)) as
        | DirectorResponse
        | null;

      if (
        !rawResponseJson ||
        typeof rawResponseJson !== "object" ||
        !("success" in rawResponseJson)
      ) {
        throw new Error("Director Core returned an empty response");
      }

      if (rawResponseJson.success !== true) {
        throw new Error(formatDirectorError(rawResponseJson));
      }

      if (!isLoopSequenceSuccess(rawResponseJson)) {
        throw new Error("Director Core responded with an unexpected payload");
      }

      const loopResult = getLoopSequenceResult(rawResponseJson);

      if (!loopResult) {
        const fallbackCycles = extractFallbackLoopCycles(rawResponseJson);
        if (fallbackCycles?.length) {
          setCycles(fallbackCycles);
          return;
        }

        throw new Error("Director Core response did not include loop data");
      }

      const loopCycles = extractLoopCyclesFromLoop(loopResult);
      setCycles(loopCycles.length ? loopCycles : null);
      setLoopMediaAssets(rawResponseJson.media ?? []);
      setLoopSummary(extractLoopSummary(loopResult));
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
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
              Infinite Cinematic Loop Creator
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Map an endless cinematic loop
            </h1>
            <p className="text-sm text-slate-300">
              Describe the dreamlike loop you want, set the initial frame, and let the Director Core forecast each cycle with continuity locks.
            </p>
          </div>
          <label className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-200">
            <input
              type="checkbox"
              checked={useSampleLoop}
              onChange={(event) => setUseSampleLoop(event.target.checked)}
              className="h-4 w-4 rounded border border-white/20 bg-slate-900/60 text-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            />
            Use sample data
          </label>
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

        <ProviderApiKeyInput
          value={providerApiKey}
          onChange={setProviderApiKey}
          description="Optional: paste a Gemini key to run this loop builder against your own quota."
          helperText="Keys never leave this browser except as an x-provider-api-key header on Director requests."
        />

        <ServerCredentialNotice
          description="Loop synthesis routes through the server's Gemini access."
          helperText="Predictive loop cycles are authenticated automatically—no provider keys to manage."
        />

        <ImageDropzone
          files={files}
          onFilesChange={setFiles}
          label="Vision Seed images"
          description="Drop PNG, JPG, or WEBP frames to influence the loop mood."
          maxFiles={6}
        />

        <fieldset className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Cinematic controls
          </legend>
          {optionGroups.map((group) => (
            <OptionGrid
              key={group.key}
              label={group.label}
              options={group.options}
              selectedIds={selectedOptions[group.key]}
              onToggle={(id) =>
                setSelectedOptions((previous) => ({
                  ...previous,
                  [group.key]: toggleSelection(previous[group.key], id),
                }))
              }
            />
          ))}
        </fieldset>

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
        {!cycles && !loopMediaAssets.length && !error ? (
          <div className="min-h-[320px] rounded-3xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-sm text-slate-400">
            Loop cycles and frames will appear here once generated.
          </div>
        ) : null}

        {loopSummary ? <LoopMetadataCard summary={loopSummary} /> : null}

        <GeneratedMediaGallery assets={loopMediaAssets} title="Loop frames" />

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

type LoopMetadataCardProps = {
  summary: LoopSummary;
};

function LoopMetadataCard({ summary }: LoopMetadataCardProps) {
  const loopLengthLabel =
    typeof summary.loopLength === "number"
      ? `${summary.loopLength} cycle${summary.loopLength === 1 ? "" : "s"}`
      : "Not provided";
  const frameRateLabel =
    typeof summary.frameRate === "number"
      ? `${summary.frameRate} fps`
      : "Not provided";

  return (
    <article className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">Loop metadata</p>
      <dl className="grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Loop length</dt>
          <dd className="text-lg font-semibold text-white">{loopLengthLabel}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Frame rate</dt>
          <dd className="text-lg font-semibold text-white">{frameRateLabel}</dd>
        </div>
      </dl>
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

function OptionGrid({
  label,
  options,
  selectedIds,
  onToggle,
}: {
  label: string;
  options: VisualOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-200">{label}</h2>
        <Tooltip content="Hover each option to learn how it shapes the shot.">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-slate-900/60 text-[10px] font-semibold text-slate-200">
            ?
          </span>
        </Tooltip>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selectedIds.includes(option.id);
          return (
            <Tooltip key={option.id} content={option.tooltip}>
              <button
                type="button"
                onClick={() => onToggle(option.id)}
                className={`group relative rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "border-canvas-accent bg-canvas-accent/20 text-white"
                    : "border-white/10 bg-slate-900/50 text-slate-200 hover:border-white/20"
                }`}
              >
                {option.label}
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function toggleSelection(list: string[], id: string): string[] {
  return list.includes(id)
    ? list.filter((value) => value !== id)
    : [...list, id];
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

type LoopSequenceSuccess = Extract<
  DirectorSuccessResponse,
  { mode: "loop_sequence" }
>;

type DirectorErrorResponse = Extract<DirectorResponse, { success: false }>;

function isLoopSequenceSuccess(
  result: DirectorResponse
): result is LoopSequenceSuccess {
  return result.success === true && result.mode === "loop_sequence";
}

function getLoopSequenceResult(
  result: LoopSequenceSuccess
): LoopSequenceResult | null {
  const candidate = result.result;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  if (!Array.isArray((candidate as LoopSequenceResult).frames)) {
    return null;
  }

  return candidate as LoopSequenceResult;
}

function formatDirectorError(result: DirectorErrorResponse): string {
  const details: string[] = [result.error];
  if (result.provider) {
    details.push(`provider: ${result.provider}`);
  }
  if (typeof result.status === "number") {
    details.push(`status: ${result.status}`);
  }
  return details.join(" · ");
}

function extractLoopSummary(loop: LoopSequenceResult | null | undefined): LoopSummary | null {
  if (!loop) {
    return null;
  }
  const hasLoopLength = typeof loop.loopLength === "number";
  const hasFrameRate = typeof loop.frameRate === "number";

  if (!hasLoopLength && !hasFrameRate) {
    return null;
  }

  return {
    loopLength: hasLoopLength ? loop.loopLength : null,
    frameRate: hasFrameRate ? loop.frameRate : null,
  };
}

function extractLoopCyclesFromLoop(loop: LoopSequenceResult | null | undefined): LoopCycleJSON[] {
  if (!loop) {
    return [];
  }

  const metadataCycles = parseLoopCyclesFromMetadata(loop.metadata);
  if (metadataCycles.length) {
    return metadataCycles;
  }

  return parseLoopCyclesFromFrames(loop.frames);
}

function parseLoopCyclesFromMetadata(
  metadata: LoopSequenceResult["metadata"]
): LoopCycleJSON[] {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const candidateKeys = [
    "loop_cycles",
    "loopCycles",
    "loop_plan",
    "loopPlan",
    "cycles",
    "sequence",
  ];

  for (const key of candidateKeys) {
    if (key in metadata) {
      const normalized = normalizeLoopCycleEntry(
        (metadata as Record<string, unknown>)[key]
      );
      if (normalized.length) {
        return normalized;
      }
    }
  }

  return [];
}

function parseLoopCyclesFromFrames(frames: LoopSequenceResult["frames"]): LoopCycleJSON[] {
  const cycles: LoopCycleJSON[] = [];
  for (const frame of frames) {
    if (!frame.altText) {
      continue;
    }
    const parsed = normalizeLoopCycleEntry(frame.altText);
    if (parsed.length) {
      cycles.push(...parsed);
    }
  }
  return cycles;
}

function extractFallbackLoopCycles(
  result: LoopSequenceSuccess
): LoopCycleJSON[] | null {
  const legacyText = getLegacyLoopText(result);
  if (!legacyText) {
    return null;
  }
  return parseLoopCyclesFromJsonString(legacyText);
}

function getLegacyLoopText(result: LoopSequenceSuccess): string | null {
  const textCandidates = [result.text, result.fallbackText];
  for (const candidate of textCandidates) {
    if (typeof candidate === "string" && candidate.trim().length) {
      return candidate;
    }
  }

  const loopMetadata = getLoopSequenceResult(result)?.metadata;
  const metadata = loopMetadata && typeof loopMetadata === "object"
    ? (loopMetadata as Record<string, unknown>)
    : (isRecord(result.metadata) ? result.metadata : null);

  if (metadata) {
    const keys = ["rawText", "raw_text", "text", "loop_json", "loopJson"];
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim().length) {
        return value;
      }
    }
  }

  return null;
}

function parseLoopCyclesFromJsonString(text: string): LoopCycleJSON[] | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed);
    const normalized = normalizeLoopCycleEntry(parsed);
    return normalized.length ? normalized : null;
  } catch {
    return null;
  }
}

function normalizeLoopCycleEntry(source: unknown): LoopCycleJSON[] {
  if (!source) {
    return [];
  }

  if (Array.isArray(source)) {
    return source.flatMap((entry) => normalizeLoopCycleEntry(entry));
  }

  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed);
      return normalizeLoopCycleEntry(parsed);
    } catch {
      return [];
    }
  }

  if (isLoopCycleJSON(source)) {
    return [source];
  }

  if (isRecord(source)) {
    const recordSource = source as Record<string, unknown>;
    const nestedKeys = ["loop_cycle", "loopCycle", "cycle", "value", "data"];
    for (const key of nestedKeys) {
      if (key in recordSource) {
        const nested = normalizeLoopCycleEntry(recordSource[key]);
        if (nested.length) {
          return nested;
        }
      }
    }

    if (Array.isArray(recordSource.cycles)) {
      const nested = recordSource.cycles.flatMap((entry) => normalizeLoopCycleEntry(entry));
      if (nested.length) {
        return nested;
      }
    }
  }

  return [];
}

function isLoopCycleJSON(value: unknown): value is LoopCycleJSON {
  if (!isRecord(value)) {
    return false;
  }

  const recordValue = value as Record<string, unknown>;
  const requiredFields: Array<keyof LoopCycleJSON> = [
    "segment_title",
    "scene_description",
    "main_subject",
    "camera_movement",
    "visual_tone",
    "motion",
    "mood",
    "narrative",
  ];

  if (
    !requiredFields.every((field) => typeof recordValue[field] === "string")
  ) {
    return false;
  }

  if (
    !Array.isArray(recordValue.acceptance_check) ||
    !recordValue.acceptance_check.every((entry) => typeof entry === "string")
  ) {
    return false;
  }

  const continuity = recordValue.continuity_lock;
  if (!isRecord(continuity)) {
    return false;
  }

  const continuityRecord = continuity as Record<string, unknown>;
  const continuityFields = [
    "subject_identity",
    "lighting_and_palette",
    "camera_grammar",
    "environment_motif",
    "emotional_trajectory",
  ];

  if (
    !continuityFields.every((field) => typeof continuityRecord[field] === "string")
  ) {
    return false;
  }

  if (
    recordValue.sound_suggestion !== undefined &&
    typeof recordValue.sound_suggestion !== "string"
  ) {
    return false;
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
