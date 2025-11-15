"use client";

import { useEffect, useMemo, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { ImageDropzone } from "@/components/ImageDropzone";
import { encodeFiles } from "@/lib/encodeFiles";
import { useProviderApiKey } from "@/hooks/useProviderApiKey";

type LoopAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

type LoopAssistantHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

type LoopAssistantResponse =
  | { message?: string; reply?: string; text?: string }
  | string;

type ParsedStorybeat = {
  raw: string;
};

const STORYBEAT_CODE_BLOCK_REGEX = /```json\s*([\s\S]*?)```/gi;
const STORYBEAT_INLINE_REGEX = /(\{[\s\S]*?"storybeat"[\s\S]*?\})/gi;

const SAMPLE_LOOP_ASSISTANT = {
  startFrameDescription:
    "A moody twilight establishing frame of a rain-slicked city rooftop, neon signage flickering against low clouds.",
  messageInput:
    "Can you draft a looping beat that keeps the camera orbiting our protagonist while the neon reflections pulse?",
};

export default function LoopAssistantPage() {
  const [startFrameDescription, setStartFrameDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<LoopAssistantMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useSampleAssistant, setUseSampleAssistant] = useState(false);
  const [providerApiKey, setProviderApiKey] = useProviderApiKey();

  useEffect(() => {
    if (useSampleAssistant) {
      setStartFrameDescription(SAMPLE_LOOP_ASSISTANT.startFrameDescription);
      setMessageInput(SAMPLE_LOOP_ASSISTANT.messageInput);
      setFiles([]);
      return;
    }

    setStartFrameDescription("");
    setMessageInput("");
    setFiles([]);
  }, [useSampleAssistant]);

  useEffect(() => {
    if (messages.length > 0) {
      return;
    }

    let isActive = true;

    async function bootstrapConversation() {
      setIsRequesting(true);
      setError(null);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        const trimmedKey = providerApiKey.trim();
        if (trimmedKey) {
          headers["x-provider-api-key"] = trimmedKey;
        }

        const response = await fetch("/api/loop-assistant", {
          method: "POST",
          headers,
          body: JSON.stringify({ history: [] as LoopAssistantHistoryEntry[] }),
        });

        if (!response.ok) {
          throw new Error("Failed to load loop assistant");
        }

        const data = (await response.json()) as LoopAssistantResponse;
        const assistantMessage = normaliseAssistantMessage(data);

        if (assistantMessage.trim().length === 0) {
          return;
        }

        if (isActive) {
          setMessages([{ role: "assistant", content: assistantMessage }]);
        }
      } catch (initialisationError) {
        if (!isActive) return;
        console.error(initialisationError);
        setError(
          initialisationError instanceof Error
            ? initialisationError.message
            : "Unable to reach the loop assistant"
        );
      } finally {
        if (isActive) {
          setIsRequesting(false);
        }
      }
    }

    void bootstrapConversation();

    return () => {
      isActive = false;
    };
  }, [messages.length, providerApiKey]);

  const storybeat = useMemo(() => parseLatestStorybeat(messages), [messages]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = messageInput.trim();
    if (trimmed.length === 0 || isRequesting) {
      return;
    }

    const userMessage: LoopAssistantMessage = {
      role: "user",
      content: trimmed,
    };

    const historyForRequest = [...messages, userMessage];

    setMessageInput("");
    setMessages(historyForRequest);
    setError(null);
    setIsRequesting(true);

    try {
      const encodedImages = await encodeFiles(files);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const trimmedKey = providerApiKey.trim();
      if (trimmedKey) {
        headers["x-provider-api-key"] = trimmedKey;
      }

      const response = await fetch("/api/loop-assistant", {
        method: "POST",
        headers,
        body: JSON.stringify({
          history: historyForRequest.map<LoopAssistantHistoryEntry>((entry) => ({
            role: entry.role,
            content: entry.content,
          })),
          startFrameDescription:
            startFrameDescription.trim().length > 0
              ? startFrameDescription.trim()
              : null,
          referenceImages: encodedImages.length > 0 ? encodedImages : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Loop assistant request failed");
      }

      const data = (await response.json()) as LoopAssistantResponse;
      const assistantMessage = normaliseAssistantMessage(data);

      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: assistantMessage },
      ]);
    } catch (submissionError) {
      console.error(submissionError);
      if (submissionError instanceof Error) {
        setError(submissionError.message);
      } else {
        setError("Loop assistant request failed");
      }
    } finally {
      setIsRequesting(false);
    }
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
              Loop Assistant
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Collaborate on cinematic story loops
            </h1>
            <p className="text-sm text-slate-300">
              Set the opening frame, drop in optional visual references, and
              chat with the assistant to co-develop evolving loop storybeats.
            </p>
          </div>
          <label className="flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 shadow-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-white/20 bg-slate-900 text-canvas-accent focus:ring-canvas-accent"
              checked={useSampleAssistant}
              onChange={(event) => setUseSampleAssistant(event.target.checked)}
            />
            Use sample data
          </label>
        </header>

        <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
          <div>
            <label
              htmlFor="start-frame-description"
              className="text-sm font-medium text-slate-200"
            >
              Start frame description
            </label>
            <textarea
              id="start-frame-description"
              value={startFrameDescription}
              onChange={(event) => setStartFrameDescription(event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none"
              placeholder="Describe the precise opening moment we should build from."
            />
            <p className="mt-2 text-xs text-slate-400">
              This description grounds the assistant&apos;s understanding of your
              loop&apos;s anchor frame.
            </p>
          </div>

          <ImageDropzone
            files={files}
            onFilesChange={setFiles}
            label="Reference images (optional)"
            description="Drop in PNG, JPG, or WEBP frames that inform the loop&apos;s tone and composition."
          />

          <div className="space-y-2">
            <label className="block space-y-1" htmlFor="loop-provider-api-key">
              <span className="text-sm font-semibold text-slate-200">
                Provider API key (optional)
              </span>
              <input
                id="loop-provider-api-key"
                type="password"
                value={providerApiKey}
                onChange={(event) => setProviderApiKey(event.target.value)}
                placeholder="Gemini, OpenAI, etc."
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
              />
            </label>
            <p className="text-xs text-slate-400">
              Stored only in this session and forwarded with your generation request.
            </p>
          </div>

          <div className="space-y-4">
            <div className="max-h-[28rem] space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-400">
                  The assistant will greet you with an opening question. Share
                  your ideas to iterate on loop beats together.
                </p>
              ) : (
                <ul className="space-y-4">
                  {messages.map((message, index) => (
                    <li key={`${message.role}-${index}`} className="space-y-1">
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {message.role === "assistant" ? "Assistant" : "You"}
                      </span>
                      <p className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
                        {message.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <label htmlFor="loop-assistant-message" className="sr-only">
                Message the loop assistant
              </label>
              <textarea
                id="loop-assistant-message"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none"
                placeholder="Ask a follow-up question, request revisions, or add new guidance."
              />
              <div className="flex items-center justify-between gap-3">
                {error ? (
                  <p className="text-xs text-rose-400" role="alert">
                    {error}
                  </p>
                ) : (
                  <span className="text-xs text-slate-400">
                    {isRequesting
                      ? "Waiting for the assistant..."
                      : "Share your direction to keep iterating."}
                  </span>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center rounded-xl bg-canvas-accent px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={
                    isRequesting ||
                    messageInput.trim().length === 0
                  }
                >
                  {isRequesting ? "Sending" : "Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <aside className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
            Latest storybeat
          </p>
          <h2 className="text-2xl font-semibold text-white">Structured loop beat</h2>
          <p className="text-sm text-slate-300">
            Whenever the assistant shares a JSON storybeat, it will appear here
            for quick reference.
          </p>
        </header>

        {storybeat ? (
          <div className="space-y-3">
            <CopyButton
              text={storybeat.raw}
              label="Copy storybeat JSON"
              className="inline-flex items-center rounded-xl bg-canvas-accent px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
            />
            <pre className="max-h-[32rem] overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-xs text-slate-100">
              {storybeat.raw}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Continue chatting with the assistant to surface structured
            storybeats. They&apos;ll be captured here once detected.
          </p>
        )}
      </aside>
    </section>
  );
}

function normaliseAssistantMessage(response: LoopAssistantResponse): string {
  if (typeof response === "string") {
    return response;
  }

  if (response?.message && typeof response.message === "string") {
    return response.message;
  }

  if (response?.reply && typeof response.reply === "string") {
    return response.reply;
  }

  if (response?.text && typeof response.text === "string") {
    return response.text;
  }

  return "";
}

function parseLatestStorybeat(
  messages: LoopAssistantMessage[]
): ParsedStorybeat | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") {
      continue;
    }

    const blockMatches = Array.from(
      message.content.matchAll(STORYBEAT_CODE_BLOCK_REGEX)
    );

    for (let blockIndex = blockMatches.length - 1; blockIndex >= 0; blockIndex -= 1) {
      const block = blockMatches[blockIndex];
      const candidate = block[1]?.trim() ?? "";
      const parsed = tryParseJson(candidate);
      if (parsed && typeof parsed === "object" && parsed !== null) {
        if ("storybeat" in parsed) {
          const raw = JSON.stringify(parsed, null, 2);
          return { raw };
        }
      }
    }

    const inlineMatches = Array.from(
      message.content.matchAll(STORYBEAT_INLINE_REGEX)
    );

    for (let inlineIndex = inlineMatches.length - 1; inlineIndex >= 0; inlineIndex -= 1) {
      const inline = inlineMatches[inlineIndex];
      const candidate = inline[1]?.trim() ?? "";
      const parsed = tryParseJson(candidate);
      if (parsed && typeof parsed === "object" && parsed !== null) {
        if ("storybeat" in parsed) {
          const raw = JSON.stringify(parsed, null, 2);
          return { raw };
        }
      }
    }
  }

  return null;
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}
