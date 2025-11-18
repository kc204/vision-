import { resolveGeminiApiBaseUrl } from "./geminiApiUrl";

const DEFAULT_GOOGLE_API_URL = resolveGeminiApiBaseUrl(process.env.GEMINI_API_URL);

const entitlementCache = new Map<string, Promise<Set<string>>>();

export function parseModelList(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return [...fallback];
  }

  const entries = value
    .split(/[,\s]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return entries.length > 0 ? entries : [...fallback];
}

export const GEMINI_ALLOWED_MODELS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "imagen-3.0-generate-001",
  "imagen-3.0-fast-generate-001",
] as const;

export const IMAGE_CAPABLE_GEMINI_MODELS = [
  "imagen-3.0-generate-001",
  "imagen-3.0-fast-generate-001",
] as const satisfies readonly GeminiAllowedModel[];

const IMAGE_CAPABLE_MODEL_SET = new Set<string>(IMAGE_CAPABLE_GEMINI_MODELS);

export function assertNoLatestAliases(
  requested: string[],
  options: { context: string; envVar?: string }
): void {
  const flagged = requested.filter((model) => /-latest$/i.test(model));
  if (flagged.length === 0) {
    return;
  }

  const source = options.envVar ?? "Gemini model configuration";
  const hint =
    flagged.length === 1
      ? "Use an explicit model ID such as gemini-2.5-flash."
      : "Use explicit model IDs such as gemini-2.5-flash.";
  throw new Error(
    `[Gemini] ${source} for ${options.context} cannot use \"*-latest\" aliases (${flagged.join(", ")}). ${hint}`
  );
}

export type GeminiAllowedModel = (typeof GEMINI_ALLOWED_MODELS)[number];

export function isImageCapableGeminiModel(model: string): model is GeminiAllowedModel {
  return IMAGE_CAPABLE_MODEL_SET.has(model);
}

export function enforceAllowedGeminiModels(
  requested: string[],
  options: { fallback: readonly GeminiAllowedModel[]; context: string; envVar?: string }
): GeminiAllowedModel[] {
  const allowedSet = new Set<string>(GEMINI_ALLOWED_MODELS);
  const valid = requested.filter((model) => allowedSet.has(model)) as GeminiAllowedModel[];
  const invalid = requested.filter((model) => !allowedSet.has(model));

  if (invalid.length > 0) {
    const aliasExamples = invalid.filter((model) => model.endsWith("-latest"));
    const aliasHint =
      aliasExamples.length > 0
        ? ` Aliases such as "${aliasExamples.join(", ")}" are not supported; configure an explicit model ID.`
        : "";
    const source = options.envVar ? `${options.envVar}` : "Gemini model configuration";
    console.error(
      `[Gemini] Unsupported ${options.context} model(s) in ${source}: ${invalid.join(", ")}.${aliasHint} Allowed models: ${GEMINI_ALLOWED_MODELS.join(", ")}.`
    );
  }

  if (valid.length > 0) {
    return valid;
  }

  const fallback = options.fallback.filter((model) => allowedSet.has(model)) as GeminiAllowedModel[];
  if (fallback.length === 0) {
    throw new Error(
      `[Gemini] Unable to determine a valid ${options.context} model. Provide one of: ${GEMINI_ALLOWED_MODELS.join(", ")}.`
    );
  }

  console.warn(
    `[Gemini] Falling back to default ${options.context} models: ${fallback.join(", ")}.`
  );
  return [...fallback];
}

export function ensureImageCapableGeminiModels(
  models: GeminiAllowedModel[],
  fallback: readonly GeminiAllowedModel[]
): GeminiAllowedModel[] {
  if (models.some(isImageCapableGeminiModel)) {
    return models;
  }

  const fallbackImage = fallback.find(isImageCapableGeminiModel);
  if (fallbackImage) {
    console.warn(
      `[Gemini] No image-capable models configured. Falling back to ${fallbackImage} for image prompts.`
    );
    return [fallbackImage, ...models];
  }

  throw new Error(
    `[Gemini] Unable to determine an image-capable model for image prompts. Add one of: ${IMAGE_CAPABLE_GEMINI_MODELS.join(", ")}.`
  );
}

export async function resolveGoogleModel(
  accessToken: string,
  candidates: string[],
  apiUrl: string = DEFAULT_GOOGLE_API_URL
): Promise<string | null> {
  if (candidates.length === 0) {
    return null;
  }

  const available = await listGoogleModels(accessToken, apiUrl);
  for (const candidate of candidates) {
    if (available.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function listGoogleModels(
  accessToken: string,
  apiUrl: string
): Promise<Set<string>> {
  const cacheKey = `${apiUrl}|${accessToken}`;
  const cached = entitlementCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const loader = (async () => {
    const response = await fetch(`${apiUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Failed to query Google model entitlements (status ${response.status}). ${detail}`.trim()
      );
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const models = new Set<string>();
    const rawModels = (payload as { models?: unknown }).models;
    if (Array.isArray(rawModels)) {
      for (const entry of rawModels as unknown[]) {
        if (isRecord(entry) && typeof entry.name === "string") {
          models.add(entry.name);
          const shortName = entry.name.split("/").pop();
          if (shortName) {
            models.add(shortName);
          }
        }
      }
    }

    return models;
  })();

  entitlementCache.set(cacheKey, loader);

  try {
    const models = await loader;
    return models;
  } catch (error) {
    entitlementCache.delete(cacheKey);
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
