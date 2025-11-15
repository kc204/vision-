import { DIRECTOR_CORE_SYSTEM_PROMPT } from "./prompts/directorCore";
import type { DirectorRequest } from "./directorTypes";

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

export async function callDirectorCore(_req: DirectorRequest): Promise<string> {
  void DIRECTOR_CORE_SYSTEM_PROMPT;
  throw new Error(
    "callDirectorCore is not yet implemented with Gemini. Wire this to Gemini text models."
  );
}
