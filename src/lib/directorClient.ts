import { DIRECTOR_CORE_SYSTEM_PROMPT } from "./prompts/directorCore";
import type {
  DirectorCoreOptions,
  DirectorCoreResult,
  DirectorRequest,
  DirectorCoreErrorCode,
} from "./directorTypes";

export class DirectorCoreError extends Error {
  readonly code: DirectorCoreErrorCode;
  readonly status: number;
  readonly details?: unknown;
  readonly fallbackResult?: DirectorCoreResult;

  constructor(
    message: string,
    options?: {
      code?: DirectorCoreErrorCode;
      status?: number;
      details?: unknown;
      cause?: unknown;
      fallbackResult?: DirectorCoreResult;
    }
  ) {
    super(message);
    this.name = "DirectorCoreError";
    this.code = options?.code ?? "UNKNOWN";
    this.status = options?.status ?? 500;
    this.details = options?.details;
    this.fallbackResult = options?.fallbackResult;
    if (options?.cause) {
      // Preserve the underlying error for debugging while keeping the response sanitized.
      this.cause = options.cause;
    }
  }
}

// TODO: Replace this placeholder implementation with Gemini API calls.
// When wiring up Gemini, use the official `@google/generative-ai` client and send the
// DIRECTOR_CORE_SYSTEM_PROMPT as the system message alongside the serialized DirectorRequest.
// Example sketch:
// const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
// const model = client.getGenerativeModel({ model: "gemini-1.5-pro" });
// const result = await model.generateContent([
//   { role: "user", parts: [{ text: DIRECTOR_CORE_SYSTEM_PROMPT }] },
//   { role: "user", parts: [{ text: JSON.stringify(req) }] }
// ]);
// return result.response.text();

export async function callDirectorCore(
  _req: DirectorRequest,
  _options?: DirectorCoreOptions
): Promise<DirectorCoreResult> {
  void DIRECTOR_CORE_SYSTEM_PROMPT;
  throw new DirectorCoreError(
    "callDirectorCore is not yet implemented with Gemini. Wire this to Gemini text models.",
    { code: "UNIMPLEMENTED", status: 501 }
  );
}
