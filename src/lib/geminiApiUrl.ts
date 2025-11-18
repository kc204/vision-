export const GEMINI_V1BETA_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

export function resolveGeminiApiBaseUrl(value?: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  const base = trimmed.length > 0 ? trimmed : GEMINI_V1BETA_BASE_URL;
  return base.replace(/\/+$/, "");
}

export function logGenerativeClientTarget({
  provider,
  context,
  baseUrl,
  model,
  requireBeta = true,
}: {
  provider: string;
  context: string;
  baseUrl: string;
  model: string;
  requireBeta?: boolean;
}): void {
  const normalizedUrl = baseUrl.replace(/\/+$/, "");
  console.info(
    `[${provider}] ${context} client targeting ${normalizedUrl} with model ${model}.`
  );

  if (requireBeta && !normalizedUrl.endsWith("/v1beta")) {
    console.warn(
      `[${provider}] ${context} client is not using the /v1beta endpoint (${normalizedUrl}). ` +
        "system_instruction payloads are unsupported on /v1."
    );
  }
}
