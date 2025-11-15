import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  cameraAngles,
  shotSizes,
  lightingStyles,
  colorPalettes,
  findVisualSnippet,
} from "@/lib/visualOptions";

type ModelChoice = "sdxl" | "flux" | "illustrious";

type SeedRequest = {
  stage: "seed";
  visionSeedText: string;
  modelChoice: ModelChoice;
  cameraAngleId?: string;
  shotSizeId?: string;
  lightingStyleId?: string;
  colorPaletteId?: string;
};

type ConfirmRequest = {
  stage: "confirm";
  confirmed: boolean;
  feedback?: string;
};

type RefineRequest = {
  stage: "refine";
  refinementCommands: string[];
  moodMemory?: string;
};

type GenerateRequest = {
  stage: "generate";
};

type ImagePromptRequest =
  | SeedRequest
  | ConfirmRequest
  | RefineRequest
  | GenerateRequest;

type ConversationContext = {
  visionSeedText?: string;
  modelChoice?: ModelChoice;
  cameraSnippet?: string;
  shotSnippet?: string;
  lightingSnippet?: string;
  colorSnippet?: string;
  summary?: string;
  summaryConfirmed?: boolean;
  refinementCommands: string[];
  moodMemory?: string;
  positivePrompt?: string;
  negativePrompt?: string;
  settings?: Record<string, string>;
};

type SeedResponseBody = {
  stage: "seed";
  summary: string;
  moodMemory: string;
  summaryConfirmed: boolean;
};

type ConfirmResponseBody = {
  stage: "confirm";
  summary: string;
  moodMemory: string;
  summaryConfirmed: boolean;
};

type RefineResponseBody = {
  stage: "refine";
  summary: string;
  moodMemory: string;
  summaryConfirmed: boolean;
  refinementCommands: string[];
};

type GenerateResponseBody = {
  stage: "generate";
  summary: string;
  moodMemory: string;
  refinementCommands: string[];
  positivePrompt: string;
  negativePrompt: string;
  settings: Record<string, string>;
};

type ImagePromptResponse =
  | SeedResponseBody
  | ConfirmResponseBody
  | RefineResponseBody
  | GenerateResponseBody;

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const CONTEXT_COOKIE_NAME = "vision_context";
const CONTEXT_TTL_SECONDS = 60 * 60 * 12; // 12 hours

const SUPER_PROMPT = `You are Vision Architect — Autonomous Image Composer (ComfyUI Edition).
You support a multi-step workflow that begins with a Vision Seed questionnaire, produces a concise summary for confirmation, ingests refinement commands, and finally outputs image prompts with settings.
You ALWAYS respond in plain text with the headings requested in the user message. Never return JSON, markdown code fences, or bullet list prefixes.

Stage guidance:
- When STAGE is "seed":
  1. Read the Vision Seed text and optional visual preferences.
  2. Produce a "Summary:" section with 2-3 sentences capturing the cinematic intent in approachable language.
  3. Produce a "Mood Memory:" section with a short evocative phrase (<=8 words) that can remind you of the emotional tone later.
  4. Do not emit prompts, settings, or recommendations at this stage.
- When STAGE is "confirm":
  1. You will receive the prior summary plus feedback.
  2. Rewrite the "Summary:" section to reflect the feedback while staying faithful to the Vision Seed.
  3. Optionally refresh "Mood Memory:" if the tone changes.
  4. Output ONLY "Summary:" and "Mood Memory:" sections.
- When STAGE is "generate":
  1. Use the confirmed summary, stored refinement commands, mood memory, and visual preferences to craft polished prompts.
  2. For modelChoice of "illustrious", lean on Danbooru-style tags. For "sdxl" and "flux", use vivid cinematic prose.
  3. Provide smart negatives covering quality, anatomy, watermarks, extra limbs, and unwanted text.
  4. Supply a "Positive Prompt:" section, then a "Negative Prompt:" section, then a "Settings:" section containing key-value pairs on individual lines (e.g., Model: SDXL). Close with updated "Summary:" and "Mood Memory:" sections to confirm alignment.

Global reminders:
- Translate casual language into professional, production-ready phrasing without adding extra scenes.
- Assume the user has no art jargon expertise; do not ask questions back.
- Keep all responses under 400 words.`;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("Missing OPENAI_API_KEY env variable");
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as ImagePromptRequest;
    const cookieStore = cookies();
    let context = readContext(cookieStore);

    let responseBody: ImagePromptResponse | { error: string };

    switch (body.stage) {
      case "seed": {
        if (!body.visionSeedText?.trim() || !body.modelChoice) {
          return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
          );
        }

        const cameraSnippet = findVisualSnippet(
          cameraAngles,
          body.cameraAngleId
        )?.promptSnippet;
        const shotSnippet = findVisualSnippet(shotSizes, body.shotSizeId)?.promptSnippet;
        const lightingSnippet = findVisualSnippet(
          lightingStyles,
          body.lightingStyleId
        )?.promptSnippet;
        const colorSnippet = findVisualSnippet(
          colorPalettes,
          body.colorPaletteId
        )?.promptSnippet;

        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: SUPER_PROMPT },
            {
              role: "user",
              content: buildSeedUserPrompt({
                visionSeedText: body.visionSeedText,
                modelChoice: body.modelChoice,
                cameraSnippet,
                shotSnippet,
                lightingSnippet,
                colorSnippet,
              }),
            },
          ],
        });

        const content = completion.choices[0]?.message?.content ?? "";
        const summary = extractSection(content, "Summary");
        const moodMemory = extractSection(content, "Mood Memory") ?? "";

        if (!summary) {
          console.error("Missing summary in seed stage response", content);
          return NextResponse.json(
            { error: "Failed to generate summary" },
            { status: 500 }
          );
        }

        context = {
          visionSeedText: body.visionSeedText,
          modelChoice: body.modelChoice,
          cameraSnippet,
          shotSnippet,
          lightingSnippet,
          colorSnippet,
          summary,
          summaryConfirmed: false,
          refinementCommands: [],
          moodMemory,
        };

        responseBody = {
          stage: "seed",
          summary,
          moodMemory,
          summaryConfirmed: false,
        };
        break;
      }
      case "confirm": {
        if (!context.summary) {
          return NextResponse.json(
            { error: "No summary to confirm" },
            { status: 400 }
          );
        }

        if (body.confirmed) {
          context.summaryConfirmed = true;
          responseBody = {
            stage: "confirm",
            summary: context.summary,
            moodMemory: context.moodMemory ?? "",
            summaryConfirmed: true,
          };
          break;
        }

        if (!body.feedback?.trim()) {
          return NextResponse.json(
            { error: "Feedback is required to revise the summary" },
            { status: 400 }
          );
        }

        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: SUPER_PROMPT },
            {
              role: "user",
              content: buildConfirmUserPrompt({
                visionSeedText: context.visionSeedText ?? "",
                modelChoice: context.modelChoice,
                currentSummary: context.summary,
                feedback: body.feedback,
                cameraSnippet: context.cameraSnippet,
                shotSnippet: context.shotSnippet,
                lightingSnippet: context.lightingSnippet,
                colorSnippet: context.colorSnippet,
              }),
            },
          ],
        });

        const content = completion.choices[0]?.message?.content ?? "";
        const summary = extractSection(content, "Summary");
        const moodMemory = extractSection(content, "Mood Memory") ?? context.moodMemory ?? "";

        if (!summary) {
          console.error("Missing summary in confirm stage response", content);
          return NextResponse.json(
            { error: "Failed to refine summary" },
            { status: 500 }
          );
        }

        context.summary = summary;
        context.summaryConfirmed = false;
        context.moodMemory = moodMemory;

        responseBody = {
          stage: "confirm",
          summary,
          moodMemory,
          summaryConfirmed: false,
        };
        break;
      }
      case "refine": {
        if (!context.summary) {
          return NextResponse.json(
            { error: "No active conversation" },
            { status: 400 }
          );
        }

        const cleanedCommands = (body.refinementCommands ?? [])
          .map((command) => command.trim())
          .filter((command) => command.length > 0);

        context.refinementCommands = cleanedCommands;
        if (body.moodMemory && body.moodMemory.trim().length > 0) {
          context.moodMemory = body.moodMemory.trim();
        }

        responseBody = {
          stage: "refine",
          summary: context.summary,
          moodMemory: context.moodMemory ?? "",
          summaryConfirmed: Boolean(context.summaryConfirmed),
          refinementCommands: context.refinementCommands,
        };
        break;
      }
      case "generate": {
        if (!context.summary || !context.modelChoice || !context.visionSeedText) {
          return NextResponse.json(
            { error: "Missing required context to generate prompts" },
            { status: 400 }
          );
        }

        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: SUPER_PROMPT },
            {
              role: "user",
              content: buildGenerateUserPrompt({
                modelChoice: context.modelChoice,
                visionSeedText: context.visionSeedText,
                summary: context.summary,
                moodMemory: context.moodMemory,
                refinementCommands: context.refinementCommands,
                cameraSnippet: context.cameraSnippet,
                shotSnippet: context.shotSnippet,
                lightingSnippet: context.lightingSnippet,
                colorSnippet: context.colorSnippet,
              }),
            },
          ],
        });

        const content = completion.choices[0]?.message?.content ?? "";
        const positivePrompt = extractSection(content, "Positive Prompt");
        const negativePrompt = extractSection(content, "Negative Prompt");
        const settingsSection = extractSection(content, "Settings");
        const summary = extractSection(content, "Summary") ?? context.summary;
        const moodMemory = extractSection(content, "Mood Memory") ?? context.moodMemory ?? "";

        if (!positivePrompt || !negativePrompt || !settingsSection) {
          console.error("Incomplete generate stage response", content);
          return NextResponse.json(
            { error: "Failed to generate image prompt" },
            { status: 500 }
          );
        }

        const settings = parseSettings(settingsSection);

        context.positivePrompt = positivePrompt;
        context.negativePrompt = negativePrompt;
        context.settings = settings;
        context.summary = summary;
        context.moodMemory = moodMemory;

        responseBody = {
          stage: "generate",
          summary,
          moodMemory,
          refinementCommands: context.refinementCommands,
          positivePrompt,
          negativePrompt,
          settings,
        };
        break;
      }
      default: {
        return NextResponse.json({ error: "Unsupported stage" }, { status: 400 });
      }
    }

    const response = NextResponse.json(responseBody);
    persistContext(response, context);
    return response;
  } catch (error) {
    console.error("Unhandled error generating image prompt", error);
    return NextResponse.json(
      { error: "Failed to generate image prompt" },
      { status: 500 }
    );
  }
}

function buildSeedUserPrompt({
  visionSeedText,
  modelChoice,
  cameraSnippet,
  shotSnippet,
  lightingSnippet,
  colorSnippet,
}: {
  visionSeedText: string;
  modelChoice: ModelChoice;
  cameraSnippet?: string;
  shotSnippet?: string;
  lightingSnippet?: string;
  colorSnippet?: string;
}) {
  return [
    "STAGE: seed",
    `MODEL CHOICE: ${modelChoice}`,
    "VISION SEED:",
    visionSeedText,
    "VISUAL PREFERENCES:",
    `Camera angle: ${cameraSnippet ?? "none specified"}`,
    `Shot size: ${shotSnippet ?? "none specified"}`,
    `Lighting: ${lightingSnippet ?? "none specified"}`,
    `Color palette: ${colorSnippet ?? "none specified"}`,
    "Remember to respond with Summary: and Mood Memory: sections only.",
  ].join("\n\n");
}

function buildConfirmUserPrompt({
  visionSeedText,
  modelChoice,
  currentSummary,
  feedback,
  cameraSnippet,
  shotSnippet,
  lightingSnippet,
  colorSnippet,
}: {
  visionSeedText: string;
  modelChoice?: ModelChoice;
  currentSummary: string;
  feedback: string;
  cameraSnippet?: string;
  shotSnippet?: string;
  lightingSnippet?: string;
  colorSnippet?: string;
}) {
  return [
    "STAGE: confirm",
    modelChoice ? `MODEL CHOICE: ${modelChoice}` : undefined,
    "VISION SEED:",
    visionSeedText,
    "CURRENT SUMMARY:",
    currentSummary,
    "FEEDBACK:",
    feedback,
    "VISUAL PREFERENCES:",
    `Camera angle: ${cameraSnippet ?? "none specified"}`,
    `Shot size: ${shotSnippet ?? "none specified"}`,
    `Lighting: ${lightingSnippet ?? "none specified"}`,
    `Color palette: ${colorSnippet ?? "none specified"}`,
    "Return only Summary: and Mood Memory: sections.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildGenerateUserPrompt({
  modelChoice,
  visionSeedText,
  summary,
  moodMemory,
  refinementCommands,
  cameraSnippet,
  shotSnippet,
  lightingSnippet,
  colorSnippet,
}: {
  modelChoice: ModelChoice;
  visionSeedText: string;
  summary: string;
  moodMemory?: string;
  refinementCommands: string[];
  cameraSnippet?: string;
  shotSnippet?: string;
  lightingSnippet?: string;
  colorSnippet?: string;
}) {
  const refinementBlock =
    refinementCommands.length > 0
      ? refinementCommands.map((command, index) => `${index + 1}. ${command}`).join("\n")
      : "None provided";

  return [
    "STAGE: generate",
    `MODEL CHOICE: ${modelChoice}`,
    "VISION SEED:",
    visionSeedText,
    "CONFIRMED SUMMARY:",
    summary,
    "MOOD MEMORY:",
    moodMemory ?? "",
    "REFINEMENT COMMANDS:",
    refinementBlock,
    "VISUAL PREFERENCES:",
    `Camera angle: ${cameraSnippet ?? "none specified"}`,
    `Shot size: ${shotSnippet ?? "none specified"}`,
    `Lighting: ${lightingSnippet ?? "none specified"}`,
    `Color palette: ${colorSnippet ?? "none specified"}`,
    "Respond with sections in this order: Positive Prompt:, Negative Prompt:, Settings:, Summary:, Mood Memory:. Each section must begin with that exact heading.",
  ].join("\n\n");
}

function extractSection(content: string, heading: string) {
  const pattern = new RegExp(`${heading}:(?:\n+|\s+)([\s\S]*?)(?=\n[A-Z][^:\n]*:|$)`, "i");
  const match = content.match(pattern);
  return match ? match[1].trim() : null;
}

function parseSettings(section: string) {
  const settings: Record<string, string> = {};
  section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const [key, ...rest] = line.split(":");
      if (!key || rest.length === 0) {
        return;
      }
      settings[key.trim()] = rest.join(":").trim();
    });
  return settings;
}

function readContext(cookieStore: ReturnType<typeof cookies>): ConversationContext {
  const cookie = cookieStore.get(CONTEXT_COOKIE_NAME);
  if (!cookie?.value) {
    return { refinementCommands: [] };
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(cookie.value)) as ConversationContext;
    return {
      refinementCommands: [],
      ...parsed,
      refinementCommands: parsed.refinementCommands ?? [],
    };
  } catch (error) {
    console.warn("Failed to parse conversation context cookie", error);
    return { refinementCommands: [] };
  }
}

function persistContext(response: NextResponse, context: ConversationContext) {
  const value = base64UrlEncode(JSON.stringify(context));
  response.cookies.set({
    name: CONTEXT_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: "lax",
    maxAge: CONTEXT_TTL_SECONDS,
    path: "/",
  });
}

function base64UrlEncode(input: string) {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(input: string) {
  let normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  while (normalized.length % 4) {
    normalized += "=";
  }
  return Buffer.from(normalized, "base64").toString("utf-8");
}
