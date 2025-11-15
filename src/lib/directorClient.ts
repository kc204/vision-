import { DIRECTOR_CORE_SYSTEM_PROMPT } from "./prompts/directorCore";
import { DirectorRequest } from "./directorTypes";

/**
 * Placeholder Gemini client for the Director Core orchestration model.
 *
 * Once Gemini integration is wired up, this helper should:
 * 1. Instantiate a GenerativeModel client that targets the Director Core model.
 * 2. Send the DIRECTOR_CORE_SYSTEM_PROMPT as the system instruction and the
 *    serialized {@link DirectorRequest} as the user content.
 * 3. Return the model text output as a plain string.
 *
 * Until that work is completed we throw so callers know the backend still needs
 * to be connected to the new service layer.
 */
export async function callDirectorCore(_request: DirectorRequest): Promise<string> {
  void DIRECTOR_CORE_SYSTEM_PROMPT;
  throw new Error("Director Core integration not yet implemented");
}
