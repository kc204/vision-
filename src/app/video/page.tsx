"use client";

import { FormEvent, useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";

type AspectRatio = "16:9" | "9:16";

type VisionSeedFormValues = {
  scriptText: string;
  tone: string;
  palette: string;
  references: string;
  aspectRatio: AspectRatio;
};

type SceneDraft = {
  id: string;
  title: string;
  summary: string;
  question: string;
};

type SceneAnswerPayload = {
  sceneId: string;
  answer: string;
};

type ContinuityLock = {
  subject_identity: string;
  lighting_and_palette: string;
  camera_grammar: string;
  environment_motif: string;
};

type FinalScenePlan = {
  id: string;
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
  followup_answer: string;
};

type TransitionPlan = {
  from_scene_id: string;
  to_scene_id: string;
  style: string;
  description: string;
  motion_design: string;
  audio_bridge: string;
};

type ThumbnailConcept = {
  logline: string;
  composition: string;
  color_notes: string;
  typography: string;
};

type VisionSeedSummary = {
  hook: string;
  story_summary: string;
  tone_directives: string;
  palette_notes: string;
  reference_synthesis: string;
  aspectRatio: AspectRatio;
};

type CollectDetailsResponse = {
  stage: "collect_details";
  visionSeed: VisionSeedSummary;
  segmentation: SceneDraft[];
};

type ExportPayload = {
  version: string;
  aspectRatio: AspectRatio;
  tone: string;
  palette: string;
  references: string[];
  scenes: FinalScenePlan[];
  transitions: TransitionPlan[];
  thumbnailConcept: ThumbnailConcept;
};

type RenderJob = {
  id: string;
  status: string;
  etaSeconds?: number | null;
};

type CompletePlanResponse = {
  stage: "complete";
  visionSeed: VisionSeedSummary;
  scenes: FinalScenePlan[];
  transitions: TransitionPlan[];
  thumbnailConcept: ThumbnailConcept;
  exportPayload: ExportPayload;
  renderJob?: RenderJob & { raw?: unknown };
};

type Stage = "seed" | "questions" | "complete";

const aspectRatioOptions: AspectRatio[] = ["16:9", "9:16"];

export default function VideoPlanPage() {
  const [formValues, setFormValues] = useState<VisionSeedFormValues>({
    scriptText: "",
    tone: "",
    palette: "",
    references: "",
    aspectRatio: "16:9",
  });
  const [collectResult, setCollectResult] = useState<CollectDetailsResponse | null>(null);
  const [sceneAnswers, setSceneAnswers] = useState<Record<string, string>>({});
  const [finalPlan, setFinalPlan] = useState<CompletePlanResponse | null>(null);
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmittingSeed, setIsSubmittingSeed] = useState(false);
  const [isFinalizingPlan, setIsFinalizingPlan] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const stage: Stage = finalPlan ? "complete" : collectResult ? "questions" : "seed";

  const disableSeedSubmit = useMemo(() => {
    return (
      isSubmittingSeed ||
      formValues.scriptText.trim().length === 0 ||
      formValues.tone.trim().length === 0 ||
      formValues.palette.trim().length === 0
    );
  }, [formValues.palette, formValues.scriptText, formValues.tone, isSubmittingSeed]);

  const disableFinalize = useMemo(() => {
    if (!collectResult) return true;
    const unanswered = collectResult.segmentation.some(
      (scene) => (sceneAnswers[scene.id] ?? "").trim().length === 0
    );
    return unanswered || isFinalizingPlan;
  }, [collectResult, sceneAnswers, isFinalizingPlan]);

  const disableRender = useMemo(() => {
    if (!finalPlan) return true;
    return isRendering;
  }, [finalPlan, isRendering]);

  function updateForm<Key extends keyof VisionSeedFormValues>(
    key: Key,
    value: VisionSeedFormValues[Key]
  ) {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }

  function resetFlow() {
    setCollectResult(null);
    setSceneAnswers({});
    setFinalPlan(null);
    setRenderJob(null);
    setExpandedScenes({});
  }

  async function submitVisionSeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disableSeedSubmit) return;

    setIsSubmittingSeed(true);
    setError(null);
    resetFlow();

    try {
      const response = await fetch("/api/generate-video-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visionSeed: {
            scriptText: formValues.scriptText,
            tone: formValues.tone,
            palette: formValues.palette,
            references: parseReferences(formValues.references),
            aspectRatio: formValues.aspectRatio,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as CollectDetailsResponse;
      setCollectResult(data);
      const defaultAnswers = Object.fromEntries(
        data.segmentation.map((scene) => [scene.id, ""])
      );
      setSceneAnswers(defaultAnswers);
    } catch (requestError) {
      console.error(requestError);
      setError(
        "Unable to run the Vision Seed intake. Check your inputs and try again."
      );
    } finally {
      setIsSubmittingSeed(false);
    }
  }

  async function finalizePlan(directRender = false, useExistingPlan = false) {
    if (!collectResult) return;
    if (directRender && useExistingPlan && finalPlan) {
      return triggerRenderWithOverride(finalPlan);
    }

    const answersPayload: SceneAnswerPayload[] = collectResult.segmentation.map(
      (scene) => ({
        sceneId: scene.id,
        answer: (sceneAnswers[scene.id] ?? "").trim(),
      })
    );

    const payload = {
      visionSeed: {
        scriptText: formValues.scriptText,
        tone: formValues.tone,
        palette: formValues.palette,
        references: parseReferences(formValues.references),
        aspectRatio: formValues.aspectRatio,
      },
      segmentation: collectResult.segmentation,
      sceneAnswers: answersPayload,
      directRender,
    };

    setError(null);

    if (directRender) {
      setIsRendering(true);
    } else {
      setIsFinalizingPlan(true);
    }

    try {
      const response = await fetch("/api/generate-video-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as CompletePlanResponse;
      setFinalPlan(data);
      setRenderJob(data.renderJob ?? null);
      setExpandedScenes({});
    } catch (requestError) {
      console.error(requestError);
      setError(
        directRender
          ? "Gemini render request failed. Review the plan or try again later."
          : "Unable to generate the scene blueprint. Please refine your answers and try again."
      );
    } finally {
      setIsFinalizingPlan(false);
      setIsRendering(false);
    }
  }

  async function triggerRenderWithOverride(plan: CompletePlanResponse) {
    if (!collectResult) return;
    setIsRendering(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-video-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as CompletePlanResponse;
      setFinalPlan(data);
      setRenderJob(data.renderJob ?? null);
    } catch (requestError) {
      console.error(requestError);
      setError("Gemini render request failed. Try again later.");
    } finally {
      setIsRendering(false);
    }
  }

  function handleAnswerChange(sceneId: string, value: string) {
    setSceneAnswers((prev) => ({ ...prev, [sceneId]: value }));
  }

  function toggleScene(sceneId: string) {
    setExpandedScenes((prev) => ({ ...prev, [sceneId]: !prev[sceneId] }));
  }

  const exportJson = finalPlan
    ? JSON.stringify(finalPlan.exportPayload, null, 2)
    : "";

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <form
        onSubmit={submitVisionSeed}
        className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
      >
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">
            Orchestrate your Gemini video blueprint
          </h1>
          <p className="text-sm text-slate-300">
            Feed the Vision Seed with story tone, palette, and references. We will stage-gate the plan before triggering Gemini render jobs.
          </p>
        </header>

        <div>
          <label className="mt-2 block text-sm font-medium text-slate-200">
            Script or narration
          </label>
          <textarea
            value={formValues.scriptText}
            onChange={(event) => updateForm("scriptText", event.target.value)}
            rows={8}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder="Opening hook, main beats, CTA..."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Tone directives"
            value={formValues.tone}
            placeholder="e.g. urgent, investigative, cinematic"
            onChange={(value) => updateForm("tone", value)}
          />
          <TextField
            label="Color palette & texture"
            value={formValues.palette}
            placeholder="e.g. neon cyberpunk, warm tungsten, matte blacks"
            onChange={(value) => updateForm("palette", value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Visual references or links
          </label>
          <textarea
            value={formValues.references}
            onChange={(event) => updateForm("references", event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
            placeholder="Separate with commas or new lines."
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-200">Aspect ratio</span>
          <div className="mt-2 inline-flex rounded-lg border border-white/10 bg-slate-950/30 p-1">
            {aspectRatioOptions.map((ratio) => {
              const isActive = formValues.aspectRatio === ratio;
              return (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => updateForm("aspectRatio", ratio)}
                  className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-canvas-accent text-white shadow"
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {ratio === "16:9" ? "16:9 • YouTube" : "9:16 • Shorts"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={disableSeedSubmit}
            className="flex-1 rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            {isSubmittingSeed ? "Running intake…" : "Run Vision Seed intake"}
          </button>
          {stage !== "seed" && (
            <button
              type="button"
              onClick={resetFlow}
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10"
            >
              Reset
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-rose-400" role="alert">
            {error}
          </p>
        )}
      </form>

      <aside className="space-y-6">
        {stage === "seed" && (
          <div className="h-full rounded-3xl border border-dashed border-white/10 bg-slate-950/30 p-6 text-sm text-slate-400">
            The intake orchestrator will segment your script, ask tailored follow-ups for each scene, then assemble transitions and thumbnail concepts ready for Gemini rendering.
          </div>
        )}

        {stage === "questions" && collectResult && (
          <div className="space-y-6">
            <VisionSeedSummaryPanel summary={collectResult.visionSeed} />

            <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
              <header className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Scene follow-ups</h2>
                <p className="text-sm text-slate-300">
                  Answer each question to unlock scripted segmentation refinement.
                </p>
              </header>
              <div className="space-y-6">
                {collectResult.segmentation.map((scene, index) => (
                  <div key={scene.id} className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Scene {index + 1}
                      </p>
                      <h3 className="text-base font-semibold text-white">{scene.title}</h3>
                      <p className="mt-2 text-sm text-slate-300">{scene.summary}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">Question</p>
                      <p className="mt-1 text-sm text-slate-300">{scene.question}</p>
                    </div>
                    <textarea
                      value={sceneAnswers[scene.id] ?? ""}
                      onChange={(event) => handleAnswerChange(scene.id, event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
                      placeholder="Your creative direction, product specifics, or continuity notes"
                    />
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={disableFinalize}
                onClick={() => finalizePlan(false)}
                className="w-full rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:bg-slate-600"
              >
                {isFinalizingPlan ? "Building scene blueprint…" : "Generate scene blueprint"}
              </button>
            </section>
          </div>
        )}

        {stage === "complete" && finalPlan && (
          <div className="space-y-6">
            <VisionSeedSummaryPanel summary={finalPlan.visionSeed} />

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <header className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                    Thumbnail concept
                  </h2>
                  <p className="text-xs text-slate-400">Feed this directly into your design pass.</p>
                </div>
                <CopyButton
                  text={formatThumbnailConcept(finalPlan.thumbnailConcept)}
                  label="Copy concept"
                />
              </header>
              <ThumbnailConceptDetails concept={finalPlan.thumbnailConcept} />
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                    Scene blueprint
                  </h2>
                  <p className="text-xs text-slate-400">Tap each scene for continuity and motion notes.</p>
                </div>
                <CopyButton text={exportJson} label="Copy JSON" />
              </div>

              <div className="mt-5 space-y-4">
                {finalPlan.scenes.map((scene) => {
                  const isExpanded = expandedScenes[scene.id];
                  return (
                    <article
                      key={scene.id}
                      className="rounded-2xl border border-white/10 bg-slate-950/50"
                    >
                      <button
                        type="button"
                        onClick={() => toggleScene(scene.id)}
                        className="flex w-full items-center justify-between gap-4 rounded-t-2xl px-5 py-4 text-left"
                      >
                        <div>
                          <h3 className="text-base font-semibold text-white">{scene.segment_title}</h3>
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
                        <Description label="Narrative" value={scene.narrative} />
                        <Description label="Voice timing" value={scene.voice_timing_hint} />
                        <Description label="Answer applied" value={scene.followup_answer} />
                        {isExpanded && (
                          <div className="space-y-3 rounded-xl border border-white/5 bg-slate-950/60 p-4">
                            <Description label="Motion" value={scene.motion} />
                            <Description label="Sound suggestion" value={scene.sound_suggestion} />
                            <Description label="Text overlay" value={scene.text_overlay} />
                            <Description label="B-roll suggestions" value={scene.broll_suggestions} />
                            <Description label="Graphics callouts" value={scene.graphics_callouts} />
                            <Description label="Editor notes" value={scene.editor_notes} />
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                              Continuity lock
                            </h4>
                            <ul className="space-y-1 text-xs text-slate-300">
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
                                {scene.acceptance_check.map((item, index) => (
                                  <li key={index}>{item}</li>
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
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Transitions
              </h2>
              <div className="mt-4 space-y-4">
                {finalPlan.transitions.map((transition) => (
                  <div
                    key={`${transition.from_scene_id}-${transition.to_scene_id}`}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {transition.from_scene_id} → {transition.to_scene_id}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-white">
                      {transition.style}
                    </h3>
                    <p className="mt-2 text-sm text-slate-200">{transition.description}</p>
                    <p className="mt-2 text-xs text-slate-300">
                      <strong className="text-slate-200">Motion design:</strong> {transition.motion_design}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      <strong className="text-slate-200">Audio bridge:</strong> {transition.audio_bridge}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                    Automation exports
                  </h2>
                  <p className="text-xs text-slate-400">
                    Download or hand off JSON to your automation stack.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={exportJson} label="Copy JSON" />
                  <button
                    type="button"
                    onClick={() => downloadJson(finalPlan.exportPayload)}
                    className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                  >
                    Download JSON
                  </button>
                </div>
              </header>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={disableRender}
                  onClick={() => finalizePlan(true, Boolean(finalPlan))}
                  className="rounded-xl bg-canvas-accent px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:bg-slate-600"
                >
                  {isRendering ? "Requesting Gemini render…" : "Render with Gemini"}
                </button>
                {renderJob && (
                  <p className="text-sm text-slate-200">
                    Job {renderJob.id} • {renderJob.status}
                    {typeof renderJob.etaSeconds === "number" && renderJob.etaSeconds > 0
                      ? ` • ETA ${Math.round(renderJob.etaSeconds)}s`
                      : ""}
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </aside>
    </section>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

function TextField({ label, value, placeholder, onChange }: TextFieldProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1 font-medium text-slate-200">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
      />
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

type VisionSeedSummaryPanelProps = {
  summary: VisionSeedSummary;
};

function VisionSeedSummaryPanel({ summary }: VisionSeedSummaryPanelProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
        Vision Seed synthesis
      </h2>
      <dl className="mt-4 grid gap-3 text-sm text-slate-200">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Hook</dt>
          <dd className="mt-1 text-slate-100">{summary.hook}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Story arc</dt>
          <dd className="mt-1 text-slate-100">{summary.story_summary}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Tone directives</dt>
          <dd className="mt-1 text-slate-100">{summary.tone_directives}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Palette notes</dt>
          <dd className="mt-1 text-slate-100">{summary.palette_notes}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Reference synthesis</dt>
          <dd className="mt-1 text-slate-100">{summary.reference_synthesis}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Aspect ratio</dt>
          <dd className="mt-1 text-slate-100">{summary.aspectRatio}</dd>
        </div>
      </dl>
    </section>
  );
}

type ThumbnailConceptDetailsProps = {
  concept: ThumbnailConcept;
};

function ThumbnailConceptDetails({ concept }: ThumbnailConceptDetailsProps) {
  return (
    <dl className="mt-4 grid gap-3 text-sm text-slate-100">
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-400">Logline</dt>
        <dd className="mt-1 text-slate-100">{concept.logline}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-400">Composition</dt>
        <dd className="mt-1 text-slate-100">{concept.composition}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-400">Color notes</dt>
        <dd className="mt-1 text-slate-100">{concept.color_notes}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-slate-400">Typography</dt>
        <dd className="mt-1 text-slate-100">{concept.typography}</dd>
      </div>
    </dl>
  );
}

function parseReferences(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function downloadJson(payload: ExportPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `gemini-video-plan-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function formatThumbnailConcept(concept: ThumbnailConcept) {
  return `Logline: ${concept.logline}\nComposition: ${concept.composition}\nColor notes: ${concept.color_notes}\nTypography: ${concept.typography}`;
}
