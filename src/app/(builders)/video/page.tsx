"use client";

import { useEffect, useMemo, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { ImageDropzone } from "@/components/ImageDropzone";
import { PromptOutput } from "@/components/PromptOutput";
import { Tooltip } from "@/components/Tooltip";
import { ServerCredentialNotice } from "@/components/ServerCredentialNotice";
import { ProviderApiKeyInput } from "@/components/ProviderApiKeyInput";
import type {
  DirectorRequest,
  DirectorResponse,
  DirectorSuccessResponse,
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

type DirectorCoreErrorResult = Extract<DirectorCoreResult, { success: false }>;

type SceneCardProps = {
  index: number;
  scene: VideoPlanResponse["scenes"][number];
};

type EnergyLevel = "grounded" | "rising" | "surge";

type PlannerQuestion = {
  id: string;
  prompt: string;
  answer: string;
};

type PlannerBeat = {
  id: string;
  order: number;
  title: string;
  excerpt: string;
  energyLevel: EnergyLevel;
  energyScore: number;
  questions: PlannerQuestion[];
};

const ENERGY_LABELS: Record<EnergyLevel, string> = {
  grounded: "Grounded",
  rising: "Building",
  surge: "Peak",
};

const ENERGY_BADGE_STYLES: Record<EnergyLevel, string> = {
  grounded: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  rising: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  surge: "border-rose-500/40 bg-rose-500/10 text-rose-200",
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
  const [rawPlanText, setRawPlanText] = useState<string | null>(null);
  const [storyboardMetadata, setStoryboardMetadata] = useState<string | null>(
    null
  );
  const [plannerBeats, setPlannerBeats] = useState<PlannerBeat[]>([]);
  const [energyCurveSummary, setEnergyCurveSummary] = useState<string | null>(
    null
  );
  const [energyCurveApproved, setEnergyCurveApproved] = useState(false);
  const [lastSegmentedScript, setLastSegmentedScript] = useState<string | null>(
    null
  );
  const [useSamplePlan, setUseSamplePlan] = useState(false);
  const [providerApiKey, setProviderApiKey] = useState("");

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
    setRawPlanText(null);
    setStoryboardMetadata(null);
    setError(null);
    setPlannerBeats([]);
    setEnergyCurveSummary(null);
    setEnergyCurveApproved(false);
    setLastSegmentedScript(null);
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

  const trimmedVisionSeed = visionSeedText.trim();
  const trimmedScript = scriptText.trim();

  const scriptRequiresResegment =
    !lastSegmentedScript || lastSegmentedScript !== trimmedScript;

  const allQuestionsAnswered = useMemo(() => {
    if (!plannerBeats.length) {
      return false;
    }

    return plannerBeats.every((beat) =>
      beat.questions.every((question) => question.answer.trim().length > 0)
    );
  }, [plannerBeats]);

  const plannerReady =
    plannerBeats.length > 0 &&
    energyCurveApproved &&
    allQuestionsAnswered &&
    !scriptRequiresResegment;

  const canSubmit = useMemo(() => {
    return (
      trimmedVisionSeed.length > 0 &&
      trimmedScript.length > 0 &&
      plannerReady &&
      !isSubmitting
    );
  }, [trimmedVisionSeed.length, trimmedScript.length, plannerReady, isSubmitting]);

  const pendingQuestionCount = useMemo(() => {
    if (!plannerBeats.length) {
      return 0;
    }

    return plannerBeats.reduce((count, beat) => {
      return (
        count +
        beat.questions.filter((question) => !question.answer.trim().length)
          .length
      );
    }, 0);
  }, [plannerBeats]);

  const questionContextMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    const answeredTrail: string[] = [];

    plannerBeats.forEach((beat) => {
      map[beat.id] = [...answeredTrail];

      beat.questions.forEach((question) => {
        if (question.answer.trim().length) {
          answeredTrail.push(
            `Scene ${beat.order}: ${question.answer.trim().slice(0, 220)}`
          );
        }
      });
    });

    return map;
  }, [plannerBeats]);

  const canKickoffPlanner =
    trimmedVisionSeed.length > 0 && trimmedScript.length > 0 && !isSubmitting;

  const plannerBlockingMessage = useMemo(() => {
    if (!plannerBeats.length) {
      return "Segment the script to unlock the clarifying loop.";
    }

    if (scriptRequiresResegment) {
      return "Re-run segmentation because the script changed.";
    }

    if (!energyCurveApproved) {
      return "Approve the energy-curve summary to continue.";
    }

    if (!allQuestionsAnswered) {
      return `Answer the remaining ${pendingQuestionCount} clarifying question(s).`;
    }

    return null;
  }, [
    plannerBeats.length,
    scriptRequiresResegment,
    energyCurveApproved,
    allQuestionsAnswered,
    pendingQuestionCount,
  ]);

  function handlePlannerKickoff() {
    if (!canKickoffPlanner) {
      setError("Add a Vision Seed and script before segmenting into beats.");
      return;
    }

    const beats = segmentScriptIntoBeats(trimmedScript);

    if (!beats.length) {
      setError("Unable to segment the script. Add more narrative detail.");
      return;
    }

    setPlannerBeats(beats);
    setEnergyCurveSummary(generateEnergyCurveSummary(beats, tone));
    setEnergyCurveApproved(false);
    setLastSegmentedScript(trimmedScript);
    setResult(null);
    setMediaAssets([]);
    setRawPlanText(null);
    setStoryboardMetadata(null);
    setError(null);
  }

  function handleQuestionAnswer(
    beatId: string,
    questionId: string,
    answer: string
  ) {
    setPlannerBeats((previous) =>
      previous.map((beat) =>
        beat.id === beatId
          ? {
              ...beat,
              questions: beat.questions.map((question) =>
                question.id === questionId ? { ...question, answer } : question
              ),
            }
          : beat
      )
    );
  }

  async function handleGeneratePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    if (!plannerReady) {
      setError("Complete the clarifying loop before requesting the plan.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);
      setRawPlanText(null);
      setStoryboardMetadata(null);

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

      const plannerContext = buildPlannerContextSummary(
        plannerBeats,
        energyCurveSummary,
        energyCurveApproved
      );

      const payload: VideoPlanPayload = {
        vision_seed_text: trimmedVisionSeed,
        script_text: trimmedScript,
        tone,
        visual_style: visualStyle,
        aspect_ratio: aspectRatio,
        mood_profile: moodProfile.trim().length ? moodProfile.trim() : null,
        planner_context: plannerContext,
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
      if (providerApiKey.trim().length > 0) {
        headers["x-provider-api-key"] = providerApiKey.trim();
      }

      const response = await fetch("/api/director", {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload),
      });

      const responseClone = response.clone();
      let rawBodyText: string | null = null;
      const rawResponseJson = (await response
        .json()
        .catch(async (parseError) => {
          rawBodyText = await responseClone.text().catch(() => null);
          console.error(
            "Failed to parse director response JSON",
            parseError,
            rawBodyText
          );
          return null;
        })) as DirectorResponse | { error?: string } | null;

      if (!response.ok) {
        rawBodyText ??= await responseClone.text().catch(() => null);

        const message =
          (rawResponseJson as { error?: string } | null)?.error ??
          (rawBodyText
            ? `HTTP ${response.status}: ${rawBodyText}`
            : `HTTP ${response.status} error`);
        throw new Error(message);
      }

      if (
        !rawResponseJson ||
        typeof rawResponseJson !== "object" ||
        !("success" in rawResponseJson)
      ) {
        const bodySummary =
          rawBodyText ??
          (rawResponseJson ? JSON.stringify(rawResponseJson) : null) ??
          "No response body returned";
        throw new Error(
          `Invalid response format (HTTP ${response.status}). Raw response: ${bodySummary}`
        );
      }

      const responseJson: DirectorResponse = rawResponseJson;

      if (responseJson.success !== true) {
        throw new Error(
          (responseJson as { error?: string }).error ??
            "Director Core returned an unexpected payload"
        );
      }

      if (responseJson.mode !== "video_plan") {
        throw new Error("Director Core returned non-video data");
      }

      const { plan, rawText } = extractVideoPlan(responseJson);

      if (!plan) {
        setRawPlanText(rawText ?? null);
        throw new Error("Director Core did not return a video plan");
      }

      setRawPlanText(rawText ?? JSON.stringify(plan, null, 2));
      setResult(plan);
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
        onSubmit={handleGeneratePlan}
        className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
              YouTube Cinematic Director
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Turn your script into a Gemini storyboard
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

        <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-canvas-accent">
            Step 1 · Vision Seed handshake
          </p>
          <p className="mt-2 text-slate-300">
            Greet the Director Core with your Vision Seed, tone, and cinematic controls. This anchors the tone mapper before we auto-plan beats and clarifying questions.
          </p>
        </div>

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

        <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-canvas-accent">
                Step 2 · Auto-segment planner
              </p>
              <p className="text-sm text-slate-300">
                We'll slice the script into beats, surface energy, and draft clarifying questions per scene.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePlannerKickoff}
              disabled={!canKickoffPlanner}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:border-white/20 disabled:text-slate-400"
            >
              {plannerBeats.length ? "Re-run segmentation" : "Segment script"}
            </button>
          </div>
          {plannerBeats.length ? (
            <div className="mt-3 text-sm text-slate-300">
              {plannerBeats.length} beat(s) detected · {pendingQuestionCount} clarifying question(s) open
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              Provide a Vision Seed + script, then segment to unlock the planner.
            </p>
          )}
          {scriptRequiresResegment && plannerBeats.length ? (
            <p className="mt-2 text-xs text-amber-200">
              Script changed since the last segmentation. Re-run to refresh the beats and questions.
            </p>
          ) : null}
        </div>

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

        {plannerBeats.length ? (
          <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/50 p-5">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-canvas-accent">
                Step 3 · Clarifying loop
              </p>
              <p className="text-sm text-slate-300">
                Answer 1-2 questions per beat so the tone mapper can lock transitions, continuity, and acceptance checks.
              </p>
            </header>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">Energy curve summary</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {energyCurveSummary ?? "Energy curve pending"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnergyCurveApproved((previous) => !previous)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    energyCurveApproved
                      ? "bg-emerald-500/20 text-emerald-200"
                      : "bg-white/5 text-white hover:bg-white/10"
                  }`}
                >
                  {energyCurveApproved ? "Energy curve approved" : "Approve energy curve"}
                </button>
              </div>
              {!energyCurveApproved ? (
                <p className="mt-2 text-xs text-amber-200">
                  Approval required before the master JSON can be requested.
                </p>
              ) : null}
            </div>

            <div className="space-y-4">
              {plannerBeats.map((beat) => (
                <BeatPlannerCard
                  key={beat.id}
                  beat={beat}
                  contextTrail={questionContextMap[beat.id] ?? []}
                  onAnswerChange={(questionId, answer) =>
                    handleQuestionAnswer(beat.id, questionId, answer)
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        <ImageDropzone
          files={files}
          onFilesChange={setFiles}
          label="Vision Seed images"
          description="Drop PNG, JPG, or WEBP frames to ground your plan."
          maxFiles={6}
        />

        <ProviderApiKeyInput
          value={providerApiKey}
          onChange={setProviderApiKey}
          description="Optional: override the managed key with your own Gemini access for this browser session."
          helperText="If provided, the key is sent with each Director Core request via x-provider-api-key."
        />

        <ServerCredentialNotice
          description="Director Core keeps Gemini access configured on the server."
          helperText="You can focus on planning—no local API keys are needed."
        />

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
          {isSubmitting
            ? "Generating…"
            : plannerReady
            ? "Request Veo-ready JSON"
            : "Complete planner to enable JSON"}
        </button>
        {!plannerReady && !isSubmitting && plannerBlockingMessage ? (
          <p className="text-xs text-amber-200">{plannerBlockingMessage}</p>
        ) : null}
        {error ? (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <aside className="space-y-6">
        {!result && !error ? (
          <div className="min-h-[320px] rounded-3xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-sm text-slate-400">
            Gemini-ready plans will appear here once generated.
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
                  TODO: Gemini render hook
                </button>
            </div>
          </div>
        ) : null}

        {storyboardMetadata && (
          <PromptOutput
            label="Storyboard metadata"
            value={storyboardMetadata}
            copyLabel="Copy storyboard"
            isCode
          />
        )}

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

function BeatPlannerCard({
  beat,
  contextTrail,
  onAnswerChange,
}: {
  beat: PlannerBeat;
  contextTrail: string[];
  onAnswerChange: (questionId: string, answer: string) => void;
}) {
  const recentContext = contextTrail.slice(-3);

  return (
    <article className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
            Scene {beat.order}
          </p>
          <h3 className="text-lg font-semibold text-white">{beat.title}</h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            ENERGY_BADGE_STYLES[beat.energyLevel]
          }`}
        >
          {ENERGY_LABELS[beat.energyLevel]} energy
        </span>
      </header>

      <p className="text-sm text-slate-300">{beat.excerpt}</p>

      {recentContext.length ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            Context from prior answers
          </p>
          <ul className="mt-2 space-y-1 text-xs text-slate-100">
            {recentContext.map((answer, index) => (
              <li
                key={`${beat.id}-context-${index}`}
                className="rounded-md bg-slate-950/40 px-2 py-1"
              >
                {answer}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-4">
        {beat.questions.map((question) => (
          <label key={question.id} className="block space-y-2">
            <span className="text-sm font-semibold text-slate-200">
              {question.prompt}
            </span>
            <textarea
              value={question.answer}
              onChange={(event) => onAnswerChange(question.id, event.target.value)}
              rows={3}
              placeholder="Answer with tone, continuity, or transition notes"
              className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            />
          </label>
        ))}
      </div>
    </article>
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

type VideoPlanSuccess = Extract<DirectorSuccessResponse, { mode: "video_plan" }>;

function extractVideoPlan(result: VideoPlanSuccess): {
  plan: VideoPlanResponse | null;
  rawText: string | null;
} {
  const candidates: unknown[] = [];

  if (result.result !== undefined && result.result !== null) {
    candidates.push(result.result);
  }

  if (result.metadata && typeof result.metadata === "object") {
    const metadata = result.metadata as Record<string, unknown>;
    const metadataKeys = [
      "storyboard",
      "plan",
      "plan_json",
      "planJson",
      "videoPlan",
      "video_plan",
      "response",
      "text",
    ];
    for (const key of metadataKeys) {
      if (metadata[key] !== undefined) {
        candidates.push(metadata[key]);
      }
    }
  }

  const textCandidates = [result.text, result.fallbackText];
  for (const text of textCandidates) {
    if (typeof text === "string" && text.trim().length) {
      candidates.push(text);
    }
  }

  for (const candidate of candidates) {
    const parsed = parseVideoPlanCandidate(candidate);
    if (parsed) {
      const rawText =
        typeof candidate === "string"
          ? candidate
          : JSON.stringify(candidate, null, 2);
      return { plan: parsed, rawText };
    }
  }

  const fallbackCandidate = candidates.find(
    (candidate): candidate is string => typeof candidate === "string"
  );

  return {
    plan: null,
    rawText:
      fallbackCandidate ??
      (candidates.length ? JSON.stringify(candidates[0], null, 2) : null),
  };
}

function parseVideoPlanCandidate(candidate: unknown): VideoPlanResponse | null {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === "string") {
    try {
      const parsed = JSON.parse(candidate);
      return parseVideoPlanCandidate(parsed);
    } catch {
      return null;
    }
  }

  if (typeof candidate !== "object") {
    return null;
  }

  const record = candidate as Record<string, unknown>;
  const scenesCandidate =
    Array.isArray(record.scenes)
      ? record.scenes
      : Array.isArray(record.storyboard)
      ? record.storyboard
      : undefined;

  if (!Array.isArray(scenesCandidate)) {
    return null;
  }

  const thumbnailConcept =
    typeof record.thumbnailConcept === "string"
      ? record.thumbnailConcept
      : typeof record.thumbnail_concept === "string"
      ? record.thumbnail_concept
      : undefined;

  return {
    scenes: scenesCandidate as VideoPlanResponse["scenes"],
    thumbnailConcept: thumbnailConcept ?? "Thumbnail concept pending",
  };
}

function segmentScriptIntoBeats(script: string): PlannerBeat[] {
  const normalized = script.replace(/\r\n?/g, "\n").trim();

  if (!normalized) {
    return [];
  }

  let segments = normalized
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 4) {
    const sentences = normalized
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    const target = Math.min(8, Math.max(4, sentences.length || 1));
    const groupSize = Math.max(1, Math.ceil(sentences.length / target));
    const grouped: string[] = [];
    for (let index = 0; index < sentences.length; index += groupSize) {
      grouped.push(sentences.slice(index, index + groupSize).join(" "));
    }
    segments = grouped.filter(Boolean);
  }

  while (segments.length > 10) {
    let mergeIndex = 0;
    let shortest = Number.POSITIVE_INFINITY;

    for (let index = 0; index < segments.length - 1; index++) {
      const combinedLength = segments[index].length + segments[index + 1].length;
      if (combinedLength < shortest) {
        shortest = combinedLength;
        mergeIndex = index;
      }
    }

    const merged = `${segments[mergeIndex]} ${segments[mergeIndex + 1]}`.trim();
    segments.splice(mergeIndex, 2, merged);
  }

  const averageWords =
    segments.reduce((sum, segment) => sum + wordCount(segment), 0) /
      segments.length || 1;

  return segments.map((segment, index) => {
    const energyScore = computeEnergyScore(segment, averageWords);
    return {
      id: `beat-${index}-${Math.random().toString(36).slice(2, 9)}`,
      order: index + 1,
      title: deriveBeatTitle(segment, index),
      excerpt: segment.length > 280 ? `${segment.slice(0, 277)}…` : segment,
      energyLevel: classifyEnergyLevel(energyScore),
      energyScore,
      questions: generateClarifyingQuestionsForBeat(segment, index, segments.length),
    };
  });
}

function generateEnergyCurveSummary(
  beats: PlannerBeat[],
  tone: VideoPlanPayload["tone"]
): string {
  if (!beats.length) {
    return "Energy curve pending user approval.";
  }

  const energyPath = beats
    .map(
      (beat) =>
        `${beat.order}. ${beat.title} (${ENERGY_LABELS[beat.energyLevel].toLowerCase()})`
    )
    .join(" → ");

  return `Energy arc (${tone} tone): ${energyPath}. Hold the ${ENERGY_LABELS[beats[0].energyLevel].toLowerCase()} entry, build through the middle beats, and land with the ${ENERGY_LABELS[beats[beats.length - 1].energyLevel].toLowerCase()} resolution.`;
}

function buildPlannerContextSummary(
  beats: PlannerBeat[],
  energySummary: string | null,
  approved: boolean
): string {
  const header = `Energy curve (${approved ? "approved" : "pending"}): ${
    energySummary ?? "Not provided"
  }`;

  const clarifications = beats
    .map((beat) => {
      const answers = beat.questions
        .filter((question) => question.answer.trim().length)
        .map(
          (question) => `Q: ${question.prompt}\nA: ${question.answer.trim()}`
        );
      return `Scene ${beat.order} - ${beat.title}\n${
        answers.length ? answers.join("\n") : "No clarifications provided"
      }`;
    })
    .join("\n\n");

  return `${header}\n\nClarifications\n${clarifications}`;
}

function computeEnergyScore(segment: string, averageWords: number): number {
  const words = wordCount(segment);
  const normalized = averageWords ? words / averageWords : 1;
  const exclamationBoost = (segment.match(/[!?]/g)?.length ?? 0) * 0.1;
  const momentumBoost = /(surge|rush|race|storm|climax|urgent|crescendo|drop)/i.test(
    segment
  )
    ? 0.2
    : 0;
  return normalized + exclamationBoost + momentumBoost;
}

function classifyEnergyLevel(score: number): EnergyLevel {
  if (score < 0.9) {
    return "grounded";
  }
  if (score > 1.3) {
    return "surge";
  }
  return "rising";
}

function deriveBeatTitle(segment: string, index: number): string {
  const firstSentence = segment.split(/(?<=[.!?])\s+/)[0] ?? "";
  const trimmed = firstSentence || segment.split(" ").slice(0, 8).join(" ");
  const title = trimmed.trim().length ? trimmed.trim() : `Beat ${index + 1}`;
  return title.length > 64 ? `${title.slice(0, 61)}…` : title;
}

function generateClarifyingQuestionsForBeat(
  segment: string,
  index: number,
  total: number
): PlannerQuestion[] {
  const sceneLabel = `Scene ${index + 1}`;
  const summary = segment.split(/(?<=[.!?])\s+/)[0] ?? "this beat";
  const questions: PlannerQuestion[] = [
    {
      id: `${sceneLabel}-q1-${Math.random().toString(36).slice(2, 8)}`,
      prompt: `What visual motif or palette should anchor ${sceneLabel} ("${summary}")?`,
      answer: "",
    },
  ];

  if (total > 1) {
    const nextLabel = index + 1 < total ? `Scene ${index + 2}` : "the resolution";
    questions.push({
      id: `${sceneLabel}-q2-${Math.random().toString(36).slice(2, 8)}`,
      prompt: `How should the transition into ${nextLabel} feel, and what continuity lock must we carry over?`,
      answer: "",
    });
  }

  return questions;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
