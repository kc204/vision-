"use client";

import { useMemo, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { Tooltip } from "@/components/Tooltip";
import type { DirectorRequest, VideoPlanPayload, VideoPlanResponse } from "@/lib/directorTypes";
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

const toneOptions: VideoPlanPayload["tone"][] = [
  "informative",
  "hype",
  "calm",
  "dark",
  "inspirational",
];

const styleOptions: VideoPlanPayload["visual_style"][] = [
  "realistic",
  "stylized",
  "anime",
  "mixed-media",
];

const aspectRatios: VideoPlanPayload["aspect_ratio"][] = ["16:9", "9:16"];

type VideoPlanResult = VideoPlanResponse;

type SceneCardProps = {
  index: number;
  scene: VideoPlanResponse["scenes"][number];
};

export default function VideoBuilderPage() {
  const [visionSeedText, setVisionSeedText] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [tone, setTone] = useState<VideoPlanPayload["tone"]>("informative");
  const [visualStyle, setVisualStyle] = useState<VideoPlanPayload["visual_style"]>("realistic");
  const [aspectRatio, setAspectRatio] = useState<VideoPlanPayload["aspect_ratio"]>("16:9");
  const [cameraAngleSelection, setCameraAngleSelection] = useState<string[]>([]);
  const [shotSizeSelection, setShotSizeSelection] = useState<string[]>([]);
  const [cameraMovementSelection, setCameraMovementSelection] = useState<string[]>([]);
  const [lightingSelection, setLightingSelection] = useState<string[]>([]);
  const [compositionSelection, setCompositionSelection] = useState<string[]>([]);
  const [colorPaletteSelection, setColorPaletteSelection] = useState<string[]>([]);
  const [atmosphereSelection, setAtmosphereSelection] = useState<string[]>([]);
  const [moodProfile, setMoodProfile] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoPlanResult | null>(null);

  const cinematicControlGroups: Array<{
    label: string;
    options: VisualOption[];
    selected: string[];
    onToggle: (id: string) => void;
  }> = [
    {
      label: "Camera angles",
      options: cameraAngles,
      selected: cameraAngleSelection,
      onToggle: (id) =>
        setCameraAngleSelection((previous) => toggleSelection(previous, id)),
    },
    {
      label: "Shot sizes",
      options: shotSizes,
      selected: shotSizeSelection,
      onToggle: (id) =>
        setShotSizeSelection((previous) => toggleSelection(previous, id)),
    },
    {
      label: "Camera movement",
      options: cameraMovement,
      selected: cameraMovementSelection,
      onToggle: (id) =>
        setCameraMovementSelection((previous) => toggleSelection(previous, id)),
    },
    {
      label: "Lighting presets",
      options: lightingStyles,
      selected: lightingSelection,
      onToggle: (id) =>
        setLightingSelection((previous) => toggleSelection(previous, id)),
    },
    {
      label: "Composition cues",
      options: composition,
      selected: compositionSelection,
      onToggle: (id) =>
        setCompositionSelection((previous) => toggleSelection(previous, id)),
    },
    {
      label: "Color palettes",
      options: colorPalettes,
      selected: colorPaletteSelection,
      onToggle: (id) =>
        setColorPaletteSelection((previous) => toggleSelection(previous, id)),
    },
    {
      label: "Atmosphere & effects",
      options: atmosphere,
      selected: atmosphereSelection,
      onToggle: (id) =>
        setAtmosphereSelection((previous) => toggleSelection(previous, id)),
    },
  ];

  const canSubmit = useMemo(() => {
    return visionSeedText.trim().length > 0 && scriptText.trim().length > 0 && !isSubmitting;
  }, [isSubmitting, scriptText, visionSeedText]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const cinematicControlOptions: NonNullable<
        VideoPlanPayload["cinematic_control_options"]
      > = {};

      if (cameraAngleSelection.length) {
        cinematicControlOptions.cameraAngles = cameraAngleSelection;
      }

      if (shotSizeSelection.length) {
        cinematicControlOptions.shotSizes = shotSizeSelection;
      }

      if (cameraMovementSelection.length) {
        cinematicControlOptions.cameraMovement = cameraMovementSelection;
      }

      if (lightingSelection.length) {
        cinematicControlOptions.lightingStyles = lightingSelection;
      }

      if (compositionSelection.length) {
        cinematicControlOptions.composition = compositionSelection;
      }

      if (colorPaletteSelection.length) {
        cinematicControlOptions.colorPalettes = colorPaletteSelection;
      }

      if (atmosphereSelection.length) {
        cinematicControlOptions.atmosphere = atmosphereSelection;
      }

      const hasCinematicControls =
        Object.keys(cinematicControlOptions).length > 0;

      const payload: VideoPlanPayload = {
        vision_seed_text: visionSeedText.trim(),
        script_text: scriptText.trim(),
        tone,
        visual_style: visualStyle,
        aspect_ratio: aspectRatio,
        mood_profile: moodProfile.trim().length ? moodProfile.trim() : null,
        cinematic_control_options: hasCinematicControls
          ? cinematicControlOptions
          : undefined,
      };

      const requestPayload: DirectorRequest = {
        mode: "video_plan",
        payload,
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
        throw new Error(message?.error ?? "Failed to generate video plan");
      }

      const { text } = (await response.json()) as { text: string };
      const parsed = JSON.parse(text) as VideoPlanResponse;
      setResult(parsed);
    } catch (submissionError) {
      console.error(submissionError);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to generate video plan"
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
            YouTube Cinematic Director
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Turn your script into a Veo-ready plan
          </h1>
          <p className="text-sm text-slate-300">
            Paste your narration, set the tone, and the Director Core will deliver a scene-by-scene plan with continuity locks and thumbnail guidance.
          </p>
        </header>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-200">Vision Seed</span>
          <textarea
            value={visionSeedText}
            onChange={(event) => setVisionSeedText(event.target.value)}
            rows={4}
            placeholder="Theme, palette, references, pacing, hook"
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-200">Script or narration</span>
          <textarea
            value={scriptText}
            onChange={(event) => setScriptText(event.target.value)}
            rows={8}
            placeholder="Paste the full narration or bullet outline"
            className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectorGroup
            label="Tone"
            value={tone}
            onChange={setTone}
            options={toneOptions}
          />
          <SelectorGroup
            label="Visual style"
            value={visualStyle}
            onChange={setVisualStyle}
            options={styleOptions}
          />
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <div>
            <span className="text-sm font-semibold text-slate-200">Aspect ratio</span>
            <div className="mt-2 inline-flex rounded-full border border-white/10 bg-slate-900/50 p-1">
              {aspectRatios.map((ratio) => {
                const isActive = ratio === aspectRatio;
                return (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                      isActive
                        ? "bg-canvas-accent text-white"
                        : "text-slate-200 hover:text-white"
                    }`}
                  >
                    {ratio}
                  </button>
                );
              })}
            </div>
          </div>

          {cinematicControlGroups.map((group) => (
            <VideoOptionMultiSelect
              key={group.label}
              label={group.label}
              options={group.options}
              selected={group.selected}
              onToggle={group.onToggle}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-200">
            Mood profile (optional)
          </label>
          <textarea
            value={moodProfile}
            onChange={(event) => setMoodProfile(event.target.value)}
            rows={3}
            placeholder="Persisted motifs to keep across modules"
            className="min-h-[96px] rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-canvas-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {isSubmitting ? "Generating…" : "Generate video plan"}
        </button>
        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <aside className="space-y-6">
        {!result && !error ? (
          <div className="min-h-[320px] rounded-3xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-sm text-slate-400">
            Veo-ready plans will appear here once generated.
          </div>
        ) : null}

        {result ? (
          <div className="space-y-4">
            <article className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <header className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Thumbnail concept
                </h2>
                <CopyButton
                  text={result.thumbnailConcept}
                  label="Copy thumbnail"
                  className="inline-flex items-center rounded-lg border border-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:border-white/30 hover:bg-white/10"
                />
              </header>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-100">
                {result.thumbnailConcept}
              </p>
            </article>

            <div className="space-y-4">
              {result.scenes.map((scene, index) => (
                <SceneCard key={index} index={index} scene={scene} />
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <CopyButton
                text={JSON.stringify(result, null, 2)}
                label="Copy full JSON"
                className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-white/30 hover:bg-white/10"
              />
              <CopyButton
                text={JSON.stringify(result.scenes, null, 2)}
                label="Copy scenes only"
                className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-white/30 hover:bg-white/10"
              />
              <button
                type="button"
                className="inline-flex items-center rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs font-semibold text-slate-300"
                disabled
              >
                TODO: Veo 3 render hook
              </button>
            </div>
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

function SelectorGroup<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
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

function VideoOptionMultiSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: VisualOption[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-200">{label}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selected.includes(option.id);
          return (
            <Tooltip key={option.id} content={option.tooltip}>
              <button
                type="button"
                onClick={() => onToggle(option.id)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
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
  return list.includes(id) ? list.filter((value) => value !== id) : [...list, id];
}

function SceneCard({ index, scene }: SceneCardProps) {
  return (
    <article className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
            Scene {index + 1}
          </p>
          <h2 className="text-lg font-semibold text-white">{scene.segment_title}</h2>
        </div>
        <CopyButton
          text={JSON.stringify(scene, null, 2)}
          label="Copy scene JSON"
          className="inline-flex items-center rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-white/30 hover:bg-white/10"
        />
      </header>

      <div className="grid gap-3 text-sm text-slate-200">
        <Detail label="Scene description" value={scene.scene_description} />
        <Detail label="Main subject" value={scene.main_subject} />
        <Detail label="Camera movement" value={scene.camera_movement} />
        <Detail label="Visual tone" value={scene.visual_tone} />
        <Detail label="Motion" value={scene.motion} />
        <Detail label="Mood" value={scene.mood} />
        <Detail label="Narrative" value={scene.narrative} />
        {scene.sound_suggestion && (
          <Detail label="Sound suggestion" value={scene.sound_suggestion} />
        )}
        {scene.text_overlay && (
          <Detail label="Text overlay" value={scene.text_overlay} />
        )}
        {scene.voice_timing_hint && (
          <Detail label="Voice timing" value={scene.voice_timing_hint} />
        )}
        {scene.broll_suggestions && (
          <Detail label="B-roll" value={scene.broll_suggestions} />
        )}
        {scene.graphics_callouts && (
          <Detail label="Graphics" value={scene.graphics_callouts} />
        )}
        {scene.editor_notes && <Detail label="Editor notes" value={scene.editor_notes} />}
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
            {scene.continuity_lock.subject_identity}
          </li>
          <li className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <strong className="block text-xs uppercase tracking-wide text-slate-400">
              Lighting & palette
            </strong>
            {scene.continuity_lock.lighting_and_palette}
          </li>
          <li className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <strong className="block text-xs uppercase tracking-wide text-slate-400">
              Camera grammar
            </strong>
            {scene.continuity_lock.camera_grammar}
          </li>
          <li className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
            <strong className="block text-xs uppercase tracking-wide text-slate-400">
              Environment motif
            </strong>
            {scene.continuity_lock.environment_motif}
          </li>
        </ul>
      </section>

      {scene.acceptance_check?.length ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Acceptance check
          </h3>
          <ul className="space-y-1 text-sm text-slate-200">
            {scene.acceptance_check.map((check, idx) => (
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
