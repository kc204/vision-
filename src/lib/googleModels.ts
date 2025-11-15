const DEFAULT_GOOGLE_API_URL =
  process.env.GEMINI_API_URL ?? "https://generativelanguage.googleapis.com/v1beta";

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
