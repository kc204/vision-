"use client";

import { useEffect, useMemo, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { GeneratedMediaGallery } from "@/components/GeneratedMediaGallery";
import { ImageDropzone } from "@/components/ImageDropzone";
import { PromptOutput } from "@/components/PromptOutput";
import { Tooltip } from "@/components/Tooltip";
import type {
  DirectorMediaAsset,
  DirectorRequest,
  DirectorResponse,
  VideoPlanPayload,
  VideoPlanResponse,
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
import { encodeFiles } from "@/lib/encodeFiles";

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

const SAMPLE_VIDEO_PLAN: {
  vision_seed_text: string;
  script_text: string;
  tone: VideoPlanPayload["tone"];
  visual_style: VideoPlanPayload["visual_style"];
  aspect_ratio: VideoPlanPayload["aspect_ratio"];
  mood_profile: string;
  api_key: string;
  cinematic_control_options: {
    cameraAngles: string[];
    shotSizes: string[];
    cameraMovement: string[];
    lightingStyles: string[];
    composition: string[];
    colorPalettes: string[];
    atmosphere: string[];
  };
} = {
  vision_seed_text:
    "Neon-drenched, rain-soaked city rooftops where a lone skater threads between holographic billboards, synthwave pulses, and misty skyline vistas.",
  script_text:
    "Tonight we chase the storm, ride the hum of midnight rails, and spark a revolution beneath the violet glow of the megacity.",
  tone: "hype",
  visual_style: "stylized",
  aspect_ratio: "9:16",
  mood_profile:
    "Keep the rebellious optimism, glistening reflections, and glitch-chic overlays consistent across every sequence.",
  api_key: "sk-demo-vision-seed-1234",
  cinematic_control_options: {
    cameraAngles: ["low_angle"],
    shotSizes: ["medium"],
    cameraMovement: ["steady_push"],
    lightingStyles: ["split"],
    composition: ["leading_lines"],
    colorPalettes: ["vaporwave"],
    atmosphere: ["urban_noir_rain"],
  },
};

const INITIAL_FORM_STATE = {
  vision_seed_text: "",
  script_text: "",
  tone: "informative" as VideoPlanPayload["tone"],
  visual_style: "realistic" as VideoPlanPayload["visual_style"],
  aspect_ratio: "16:9" as VideoPlanPayload["aspect_ratio"],
  mood_profile: "",
  api_key: "",
  cinematic_control_options: {
    cameraAngles: [] as string[],
    shotSizes: [] as string[],
    cameraMovement: [] as string[],
    lightingStyles: [] as string[],
    composition: [] as string[],
    colorPalettes: [] as string[],
    atmosphere: [] as string[],
  },
};

type VideoPlanResult = VideoPlanResponse;

type SceneCardProps = {
  index: number;
  scene: VideoPlanResponse["scenes"][number];
};

export default function VideoBuilderPage() {
  const [visionSeedText, setVisionSeedText] = useState(
    INITIAL_FORM_STATE.vision_seed_text
  );
  const [scriptText, setScriptText] = useState(INITIAL_FORM_STATE.script_text);
  const [tone, setTone] = useState<VideoPlanPayload["tone"]>(
    INITIAL_FORM_STATE.tone
  );
  const [visualStyle, setVisualStyle] = useState<VideoPlanPayload["visual_style"]>(
    INITIAL_FORM_STATE.visual_style
  );
  const [aspectRatio, setAspectRatio] = useState<VideoPlanPayload["aspect_ratio"]>(
    INITIAL_FORM_STATE.aspect_ratio
  );
  const [cameraAngleSelection, setCameraAngleSelection] = useState<string[]>(
    INITIAL_FORM_STATE.cinematic_control_options.cameraAngles
  );
  const [shotSizeSelection, setShotSizeSelection] = useState<string[]>(
    INITIAL_FORM_STATE.cinematic_control_options.shotSizes
  );
  const [cameraMovementSelection, setCameraMovementSelection] = useState<string[]>(
    INITIAL_FORM_STATE.cinematic_control_options.cameraMovement
  );
  const [lightingSelection, setLightingSelection] = useState<string[]>(
    INITIAL_FORM_STATE.cinematic_control_options.lightingStyles
  );
  const [compositionSelection, setCompositionSelection] = useState<string[]>(
    INITIAL_FORM_STATE.cinematic_control_options.composition
  );
  const [colorPaletteSelection, setColorPaletteSelection] = useState<string[]>(
    INITIAL_FORM_STATE.cinematic_control_options.colorPalettes
  );
  const [atmosphereSelection, setAtmosphereSelection] = useState<string[]>(
    INITIAL_FORM_STATE.cinematic_control_options.atmosphere
  );
  const [moodProfile, setMoodProfile] = useState(INITIAL_FORM_STATE.mood_profile);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VideoPlanResult | null>(null);
  const [mediaAssets, setMediaAssets] = useState<DirectorMediaAsset[]>([]);
  const [apiKey, setApiKey] = useState(INITIAL_FORM_STATE.api_key);
  const [rawPlanText, setRawPlanText] = useState<string | null>(null);
  const [useSamplePlan, setUseSamplePlan] = useState(false);

  useEffect(() => {
    const activePlan = useSamplePlan ? SAMPLE_VIDEO_PLAN : INITIAL_FORM_STATE;

    setVisionSeedText(activePlan.vision_seed_text);
    setScriptText(activePlan.script_text);
    setTone(activePlan.tone);
    setVisualStyle(activePlan.visual_style);
    setAspectRatio(activePlan.aspect_ratio);
    setMoodProfile(activePlan.mood_profile);
    setCameraAngleSelection([
      ...activePlan.cinematic_control_options.cameraAngles,
    ]);
    setShotSizeSelection([
      ...activePlan.cinematic_control_options.shotSizes,
    ]);
    setCameraMovementSelection([
      ...activePlan.cinematic_control_options.cameraMovement,
    ]);
    setLightingSelection([
      ...activePlan.cinematic_control_options.lightingStyles,
    ]);
    setCompositionSelection([
      ...activePlan.cinematic_control_options.composition,
    ]);
    setColorPaletteSelection([
      ...activePlan.cinematic_control_options.colorPalettes,
    ]);
    setAtmosphereSelection([
      ...activePlan.cinematic_control_options.atmosphere,
    ]);

    setFiles([]);
    setResult(null);
    setMediaAssets([]);
    setRawPlanText(null);
    setError(null);
  }, [useSamplePlan]);

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
    setMediaAssets([]);
    setRawPlanText(null);

    try {
      const images = await encodeFiles(files);
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
        images: images.length ? images : undefined,
      };

      const headers: HeadersInit = { "Content-Type": "application/json" };
      const trimmedKey = apiKey.trim();
      if (trimmedKey.length) {
        headers["x-provider-api-key"] = trimmedKey;
      }

      const response = await fetch("/api/director", {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload),
      });

      const responseJson = (await response.json().catch(() => null)) as
        | DirectorResponse<VideoPlanResponse | string>
        | null;

      if (!response.ok) {
        const message = (responseJson as { error?: string } | null)?.error;
        throw new Error(message ?? "Failed to generate video plan");
      }

      if (!responseJson) {
        throw new Error("Empty response from director");
      }

      const candidateText =
        (typeof responseJson.result === "string"
          ? responseJson.result
          : null) ?? responseJson.text ?? responseJson.fallbackText ?? null;

      let parsedPlan: VideoPlanResponse | null = null;

      if (responseJson.result && typeof responseJson.result !== "string") {
        parsedPlan = responseJson.result as VideoPlanResponse;
      } else if (candidateText) {
        try {
          parsedPlan = JSON.parse(candidateText) as VideoPlanResponse;
        } catch (parseError) {
          console.warn("Unable to parse plan JSON", parseError);
        }
      }

      if (!parsedPlan) {
        setRawPlanText(candidateText);
        throw new Error("Unexpected response format from director");
      }

      setRawPlanText(candidateText ?? JSON.stringify(parsedPlan, null, 2));
      setResult(parsedPlan);
      setMediaAssets(responseJson.media ?? []);
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
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
              YouTube Cinematic Director
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Turn your script into a Veo-ready plan
            </h1>
            <p className="text-sm text-slate-300">
              Paste your narration, set the tone, and the Director Core will deliver a scene-by-scene plan with continuity locks and thumbnail guidance.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <input
              type="checkbox"
              checked={useSamplePlan}
              onChange={(event) => setUseSamplePlan(event.target.checked)}
              className="h-4 w-4 rounded border border-white/20 bg-slate-900/70 text-canvas-accent focus:ring-canvas-accent"
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

        <ImageDropzone
          files={files}
          onFilesChange={setFiles}
          label="Vision Seed images"
          description="Drop PNG, JPG, or WEBP frames to ground your plan."
          maxFiles={6}
        />

        <div className="space-y-2">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-200">
              Provider API key (optional)
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Gemini, OpenAI, etc."
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            />
          </label>
          <p className="text-xs text-slate-400">
            Used only for this browser session and attached to your request payload.
          </p>
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

        {mediaAssets.length ? (
          <GeneratedMediaGallery assets={mediaAssets} />
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

        {rawPlanText && (
          <PromptOutput
            label="Generation response"
            value={rawPlanText}
            copyLabel="Copy response"
            isCode
          />
        )}

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
