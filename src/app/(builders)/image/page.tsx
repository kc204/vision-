"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ImageDropzone } from "@/components/ImageDropzone";
import { GeneratedMediaGallery } from "@/components/GeneratedMediaGallery";
import { PromptOutput } from "@/components/PromptOutput";
import { Tooltip } from "@/components/Tooltip";
import { ServerCredentialNotice } from "@/components/ServerCredentialNotice";
import { ProviderApiKeyInput } from "@/components/ProviderApiKeyInput";
import type {
  DirectorMediaAsset,
  DirectorRequest,
  DirectorResponse,
  ImagePromptPayload,
} from "@/lib/directorTypes";
import { encodeFiles } from "@/lib/encodeFiles";
import {
  atmosphere,
  cameraAngles,
  cameraMovement,
  colorPalettes,
  composition,
  findVisualSnippets,
  lightingStyles,
  shotSizes,
  type VisualOption,
} from "@/lib/visualOptions";

type SeedResponses = {
  subjectFocus: string;
  environment: string;
  compositionNotes: string;
  lightingNotes: string;
  styleNotes: string;
  symbolismNotes: string;
  atmosphereNotes: string;
  outputIntent: string;
  constraints: string;
  moodProfile: string;
};

const SAMPLE_IMAGE_SELECTIONS: Readonly<ImagePromptPayload["selectedOptions"]> = {
  cameraAngles: ["low_angle"],
  shotSizes: ["medium"],
  composition: ["rule_of_thirds"],
  cameraMovement: ["steady_push"],
  lightingStyles: ["split"],
  colorPalettes: ["vaporwave"],
  atmosphere: ["urban_noir_rain"],
};

const SAMPLE_IMAGE_SEED: Readonly<{
  subjectFocus: string;
  environment: string;
  compositionNotes: string;
  lightingNotes: string;
  styleNotes: string;
  symbolismNotes: string;
  atmosphereNotes: string;
  outputIntent: string;
  constraints: string;
  moodProfile: string;
  model: ImagePromptPayload["model"];
}> = {
  subjectFocus:
    "Weathered detective gripping an encrypted data shard, eyes locked with determination.",
  environment:
    "Rain-slicked megacity alley, neon kanji reflecting off puddles beside humming vending drones.",
  compositionNotes:
    "Low three-quarter composition with lens flare cutting diagonally, subject framed on the left third.",
  lightingNotes:
    "Split lighting from magenta signage versus teal taxi glow, rimmed with cool backlight mist.",
  styleNotes:
    "Photoreal cinematic still rendered in Flux, with subtle film grain and anamorphic bokeh.",
  symbolismNotes:
    "Data shard glows like a heart, signaling fragile hope amid corporate oppression.",
  atmosphereNotes:
    "City steam, distant siren haze, rain streaks tracking down chrome surfaces.",
  outputIntent: "Streaming series key art poster for episode reveal night.",
  constraints:
    "Keep composition printable in 24x36 poster ratio, maintain SFW wardrobe details.",
  moodProfile:
    "Neo-noir resilience with melancholic optimism, neon palette anchored by muted shadows.",
  model: "flux",
};

const modelOptions: Array<{ value: ImagePromptPayload["model"]; label: string }> = [
  { value: "sdxl", label: "SDXL" },
  { value: "flux", label: "Flux" },
  { value: "illustrious", label: "Illustrious (Anime)" },
];

function createEmptySelectedOptions(): ImagePromptPayload["selectedOptions"] {
  return {
    cameraAngles: [],
    shotSizes: [],
    composition: [],
    cameraMovement: [],
    lightingStyles: [],
    colorPalettes: [],
    atmosphere: [],
  };
}

type PromptSections = {
  positive: string;
  negative: string;
  settings: string;
};

type ImageGenerationResult = {
  sections: PromptSections | null;
  fallbackText: string | null;
  media: DirectorMediaAsset[];
};

const optionGroups: Array<{
  key: keyof ImagePromptPayload["selectedOptions"];
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

const visualOptionLists: Record<
  keyof ImagePromptPayload["selectedOptions"],
  VisualOption[]
> = {
  cameraAngles,
  shotSizes,
  composition,
  cameraMovement,
  lightingStyles,
  colorPalettes,
  atmosphere,
};

function toGlossaryEntries(options: VisualOption[]) {
  return options.map(({ id, label, tooltip, promptSnippet }) => ({
    id,
    label,
    tooltip,
    promptSnippet,
  }));
}

const visualGlossary = (Object.keys(visualOptionLists) as Array<
  keyof typeof visualOptionLists
>).reduce<ImagePromptPayload["glossary"]>((acc, key) => {
  acc[key] = toGlossaryEntries(visualOptionLists[key]);
  return acc;
}, {} as ImagePromptPayload["glossary"]);

function createSeedResponses(initialSubject: string): SeedResponses {
  return {
    subjectFocus: initialSubject,
    environment: "",
    compositionNotes: "",
    lightingNotes: "",
    styleNotes: "",
    symbolismNotes: "",
    atmosphereNotes: "",
    outputIntent: "",
    constraints: "",
    moodProfile: "",
  };
}

export default function ImageBuilderPage() {
  const [seedResponses, setSeedResponses] = useState<SeedResponses>(() =>
    createSeedResponses("")
  );
  const [selectedOptions, setSelectedOptions] = useState<
    ImagePromptPayload["selectedOptions"]
  >(() => createEmptySelectedOptions());
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImageGenerationResult | null>(null);
  const [providerApiKey, setProviderApiKey] = useState("");
  const [model, setModel] = useState<ImagePromptPayload["model"]>("sdxl");
  const [conversationStage, setConversationStage] =
    useState<ConversationStage>("collecting");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [pendingInput, setPendingInput] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [refinementNotes, setRefinementNotes] = useState("");
  const [confirmedRefinement, setConfirmedRefinement] = useState("");
  const [moodMemory, setMoodMemory] = useState("");
  const messageCounterRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const nextMessageId = useCallback(() => {
    messageCounterRef.current += 1;
    return `msg-${messageCounterRef.current}`;
  }, []);

  const selectedVisualOptions = useMemo(() => {
    return (Object.entries(selectedOptions) as Array<
      [keyof ImagePromptPayload["selectedOptions"], string[]]
    >).flatMap(([key, ids]) => findVisualSnippets(visualOptionLists[key], ids));
  }, [selectedOptions]);

  const structuredControlText = useMemo(() => {
    if (!selectedVisualOptions.length) {
      return "";
    }

    return selectedVisualOptions
      .map((option) => `${option.label}: ${option.promptSnippet}`)
      .join("\n");
  }, [selectedVisualOptions]);

  const trimmedManualVisionSeedText = useMemo(
    () => manualVisionSeedText.trim(),
    [manualVisionSeedText]
  );

  const visionSeedText = useMemo(() => {
    const mergedSections = [trimmedManualVisionSeedText, structuredControlText]
      .map((section) => section.trim())
      .filter((section) => section.length > 0);

    if (mergedSections.length > 0) {
      return mergedSections.join("\n\n");
    }

    return files.length > 0
      ? "Vision Seed references provided via attached images."
      : "";
  }, [files, structuredControlText, trimmedManualVisionSeedText]);

  function advanceConversation(nextIndex: number, responses: SeedResponses) {
    if (nextIndex >= seedTopics.length) {
      finalizeSummary(responses);
      return;
    }

    const promptText = getQuestionPrompt(nextIndex);
    setCurrentQuestionIndex(nextIndex);
    setConversationStage("collecting");
    setMessages((previous) => [
      ...previous,
      { id: nextMessageId(), role: "assistant", content: promptText },
    ]);

    const nextTopic = seedTopics[nextIndex];
    const existingAnswer = responses[nextTopic.key]?.trim() ?? "";
    if (existingAnswer.length > 0) {
      setPendingInput(existingAnswer);
    } else if (nextTopic.key === "moodProfile" && moodMemory.trim().length > 0) {
      setPendingInput(moodMemory);
    } else {
      setPendingInput("");
    }
  }

  function finalizeSummary(responses: SeedResponses) {
    const summary = buildVisionSeedText(responses);
    setSummaryText(summary);
    setConversationStage("summary");
    setCurrentQuestionIndex(seedTopics.length);
    setMessages((previous) => [
      ...previous,
      {
        id: nextMessageId(),
        role: "assistant",
        content:
          "Here's how I'm interpreting your Vision Seed:\n" +
          (summary.length ? summary : "(no details captured yet)") +
          "\n\nNeed any targeted refinements before we choose a model?",
      },
    ]);
  }

  function handleSeedSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (conversationStage !== "collecting") {
      return;
    }

    const topic = seedTopics[currentQuestionIndex];
    if (!topic) {
      return;
    }

    const trimmed = pendingInput.trim();
    if (!trimmed.length) {
      return;
    }

    const updatedResponses: SeedResponses = {
      ...seedResponses,
      [topic.key]: trimmed,
    } as SeedResponses;
    setSeedResponses(updatedResponses);
    if (topic.key === "moodProfile") {
      setMoodMemory(trimmed);
    }

    setMessages((previous) => [
      ...previous,
      { id: nextMessageId(), role: "user", content: trimmed },
    ]);
    setPendingInput("");

    advanceConversation(currentQuestionIndex + 1, updatedResponses);
  }

  function handleSkipQuestion() {
    if (conversationStage !== "collecting") {
      return;
    }
    const topic = seedTopics[currentQuestionIndex];
    if (!topic) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        id: nextMessageId(),
        role: "user",
        content: `Let's revisit ${topic.label.toLowerCase()} later.`,
      },
    ]);
    setPendingInput("");
    advanceConversation(currentQuestionIndex + 1, seedResponses);
  }

  function handleConfirmSummary() {
    if (conversationStage !== "summary") {
      return;
    }

    const trimmedRefinement = refinementNotes.trim();
    setConfirmedRefinement(trimmedRefinement);

    setMessages((previous) => {
      const updates = [...previous];
      if (trimmedRefinement.length) {
        updates.push({
          id: nextMessageId(),
          role: "user",
          content: trimmedRefinement,
        });
      } else {
        updates.push({
          id: nextMessageId(),
          role: "user",
          content: "Summary looks good — let's pick a model.",
        });
      }
      updates.push({
        id: nextMessageId(),
        role: "assistant",
        content: "Which model should we use (SDXL, Flux, or Illustrious)?",
      });
      return updates;
    });

    setRefinementNotes("");
    setConversationStage("model_select");
  }

  function handleModelSelection(value: ImagePromptPayload["model"]) {
    if (conversationStage !== "model_select" || isSubmitting) {
      return;
    }

    const modelLabel = modelOptions.find((option) => option.value === value)?.label ?? value;
    setModel(value);
    setMessages((previous) => [
      ...previous,
      { id: nextMessageId(), role: "user", content: `Use ${modelLabel}.` },
    ]);

    void submitToDirector(value, modelLabel);
  }

  async function submitToDirector(
    chosenModel: ImagePromptPayload["model"],
    modelLabel: string
  ) {
    if (isSubmitting) {
      return;
    }

    const trimmedMoodProfile = moodMemory.trim().length
      ? moodMemory.trim()
      : null;

    if (
      !visionSeedText.trim().length &&
      !selectedVisualOptions.length &&
      files.length === 0
    ) {
      setError("Share at least one Vision Seed detail, control, or reference image before generating.");
      return;
    }

    setIsSubmitting(true);
    setConversationStage("generating");
    setError(null);
    setResult(null);
    setMessages((previous) => [
      ...previous,
      {
        id: nextMessageId(),
        role: "assistant",
        content: `Composing a ${modelLabel} prompt…`,
      },
    ]);

    try {
      const images = await encodeFiles(files);
      const payload: ImagePromptPayload = {
        vision_seed_text: visionSeedText,
        model: chosenModel,
        selectedOptions,
        glossary: visualGlossary,
        mood_profile: moodProfile.trim().length ? moodProfile.trim() : null,
        constraints: constraints.trim().length ? constraints.trim() : null,
      };

      const requestPayload: DirectorRequest = {
        mode: "image_prompt",
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

      if (responseJson.mode !== "image_prompt") {
        throw new Error("Director Core returned non-image data");
      }

      const promptText =
        responseJson.text ?? responseJson.fallbackText ?? null;
      let promptSections: PromptSections | null = null;

      if (promptText) {
        promptSections = parsePromptSections(promptText);
      }

      setResult({
        sections: promptSections,
        fallbackText: promptText,
        media: responseJson.media ?? [],
      });
      setConversationStage("complete");
      setMessages((previous) => [
        ...previous,
        {
          id: nextMessageId(),
          role: "assistant",
          content:
            "Prompt delivered. Restart the Vision Seed interview anytime to iterate again.",
        },
      ]);
    } catch (submissionError) {
      console.error(submissionError);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Failed to generate prompt"
      );
      setConversationStage("model_select");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleLoadSampleSeed() {
    const sampleResponses: SeedResponses = {
      subjectFocus: SAMPLE_IMAGE_SEED.subjectFocus,
      environment: SAMPLE_IMAGE_SEED.environment,
      compositionNotes: SAMPLE_IMAGE_SEED.compositionNotes,
      lightingNotes: SAMPLE_IMAGE_SEED.lightingNotes,
      styleNotes: SAMPLE_IMAGE_SEED.styleNotes,
      symbolismNotes: SAMPLE_IMAGE_SEED.symbolismNotes,
      atmosphereNotes: SAMPLE_IMAGE_SEED.atmosphereNotes,
      outputIntent: SAMPLE_IMAGE_SEED.outputIntent,
      constraints: SAMPLE_IMAGE_SEED.constraints,
      moodProfile: SAMPLE_IMAGE_SEED.moodProfile,
    };

    setMoodMemory(SAMPLE_IMAGE_SEED.moodProfile);
    setSeedResponses(sampleResponses);
    setSelectedOptions({
      cameraAngles: [...SAMPLE_IMAGE_SELECTIONS.cameraAngles],
      shotSizes: [...SAMPLE_IMAGE_SELECTIONS.shotSizes],
      composition: [...SAMPLE_IMAGE_SELECTIONS.composition],
      cameraMovement: [...SAMPLE_IMAGE_SELECTIONS.cameraMovement],
      lightingStyles: [...SAMPLE_IMAGE_SELECTIONS.lightingStyles],
      colorPalettes: [...SAMPLE_IMAGE_SELECTIONS.colorPalettes],
      atmosphere: [...SAMPLE_IMAGE_SELECTIONS.atmosphere],
    });
    setFiles([]);
    setModel(SAMPLE_IMAGE_SEED.model);
    setSummaryText(buildVisionSeedText(sampleResponses));
    setRefinementNotes("");
    setConfirmedRefinement("");
    setConversationStage("summary");
    setCurrentQuestionIndex(seedTopics.length);
    setError(null);
    setResult(null);
    messageCounterRef.current = 0;

    setMessages(() => {
      const transcript: ConversationMessage[] = [];
      seedTopicOrder.forEach((key, index) => {
        const prompt = getQuestionPrompt(index);
        transcript.push({
          id: nextMessageId(),
          role: "assistant",
          content: prompt,
        });
        const value = sampleResponses[key as SeedTopicKey];
        if (value) {
          transcript.push({
            id: nextMessageId(),
            role: "user",
            content: value,
          });
        }
      });
      transcript.push({
        id: nextMessageId(),
        role: "assistant",
        content:
          "Here's how I'm interpreting your Vision Seed:\n" +
          buildVisionSeedText(sampleResponses) +
          "\n\nNeed any targeted refinements before we choose a model?",
      });
      return transcript;
    });
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
            Vision Architect
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Multi-turn Vision Seed interview
          </h1>
          <p className="text-sm text-slate-300">
            Chat through each part of your Vision Seed, confirm the summary, pick a
            model, and then let Director Core compose the cinematic SDXL, Flux, or
            Illustrious prompt.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => resetConversation()}
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-white/40"
          >
            Restart Vision Seed
          </button>
          <button
            type="button"
            onClick={handleLoadSampleSeed}
            className="rounded-full border border-canvas-accent/40 bg-canvas-accent/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-canvas-accent"
          >
            Load sample Vision Seed
          </button>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/40 p-5">
          <div
            ref={scrollContainerRef}
            className={`space-y-3 overflow-y-auto ${messageContainerHeight}`}
            aria-live="polite"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "assistant"
                      ? "bg-white/10 text-white"
                      : "bg-canvas-accent/20 text-white"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          {conversationStage === "collecting" ? (
            <form onSubmit={handleSeedSubmit} className="space-y-3">
              <label className="block text-sm font-semibold text-slate-200">
                {seedTopics[currentQuestionIndex]?.label}
              </label>
              <textarea
                value={pendingInput}
                onChange={(event) => setPendingInput(event.target.value)}
                rows={3}
                placeholder={seedTopics[currentQuestionIndex]?.placeholder}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-canvas-accent px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-indigo-500/30"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={handleSkipQuestion}
                  className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200"
                >
                  Skip for now
                </button>
              </div>
            </form>
          ) : null}

          {conversationStage === "summary" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-white">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Vision Seed interpretation
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-100">
                  {summaryText || "(no details captured yet)"}
                </p>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-200">
                  Targeted refinement note (optional)
                </span>
                <textarea
                  value={refinementNotes}
                  onChange={(event) => setRefinementNotes(event.target.value)}
                  rows={3}
                  placeholder="Call out palette nudges, symbolism, or constraints you want emphasized."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleConfirmSummary}
                  className="rounded-full bg-canvas-accent px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-indigo-500/30"
                >
                  Confirm & choose model
                </button>
                <button
                  type="button"
                  onClick={() => resetConversation(seedResponses)}
                  className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200"
                >
                  Re-run interview
                </button>
              </div>
            </div>
          ) : null}

          {conversationStage === "model_select" ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-200">
                Which model should bring this to life?
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {modelOptions.map((option) => {
                  const isActive = option.value === model;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleModelSelection(option.value)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-canvas-accent bg-canvas-accent/20 text-white"
                          : "border-white/10 bg-slate-900/50 text-slate-200 hover:border-white/20"
                      } ${isSubmitting ? "opacity-60" : ""}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {conversationStage === "generating" ? (
            <p className="text-sm text-slate-300">
              Crafting the Director Core prompt…
            </p>
          ) : null}

          {conversationStage === "complete" ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => resetConversation()}
                className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200"
              >
                Start another Vision Seed
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="space-y-6">
        <ImageDropzone
          files={files}
          onFilesChange={setFiles}
          label="Vision Seed images"
          description="Drop PNG, JPG, or WEBP references to anchor the vibe."
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

        <ProviderApiKeyInput
          value={providerApiKey}
          onChange={setProviderApiKey}
          description="Optional: route this session through your own Gemini image key."
          helperText="Provided keys live only in this browser session and are forwarded via x-provider-api-key."
        />

        <ServerCredentialNotice
          description="Director Core uses managed credentials for Gemini image and chat calls."
          helperText="No Google AI Studio key or browser storage is required."
        />

        {!result && !error ? (
          <div className="min-h-[320px] rounded-3xl border border-dashed border-white/10 bg-slate-950/40 p-6 text-sm text-slate-400">
            Prompt results will appear here after generation.
          </div>
        ) : null}

        {result?.media.length ? (
          <GeneratedMediaGallery assets={result.media} />
        ) : null}

        {result?.sections ? (
          <div className="space-y-4">
            <PromptOutput
              label="Positive prompt"
              value={result.sections.positive}
              copyLabel="Copy positive"
            />
            <PromptOutput
              label="Negative prompt"
              value={result.sections.negative}
              copyLabel="Copy negative"
            />
            <PromptOutput
              label="Suggested settings"
              value={result.sections.settings}
              copyLabel="Copy settings"
            />
          </div>
        ) : null}

        {!result?.sections && result?.fallbackText ? (
          <PromptOutput
            label="Generation response"
            value={result.fallbackText}
            copyLabel="Copy response"
          />
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
  return list.includes(id) ? list.filter((value) => value !== id) : [...list, id];
}

function parsePromptSections(text: string): PromptSections {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return {
    positive: blocks[0] ?? "",
    negative: blocks[1] ?? "",
    settings: blocks.slice(2).join("\n\n"),
  };
}
