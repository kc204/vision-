import assert from "node:assert/strict";
import test from "node:test";
import {
  extractSection,
  parseSettings,
  parseStructuredText,
} from "./imagePromptParser";

const SAMPLE_RESPONSE = `Summary:
A quick synopsis of the envisioned artwork.

Positive Prompt:
Ultra-detailed hero shot
Model: digital painting with volumetric lighting
Lighting: Cinematic glow with rim lights

Negative Prompt:
Blurry, low detail, double faces

Settings:
- Model: Flux Pro
- Resolution: 1024x1024
- Sampler: Euler a
Steps: 35
CFG: 7
Seed: 123456`;

test("extractSection keeps colon-prefixed lines inside sections", () => {
  const positive = extractSection(SAMPLE_RESPONSE, "Positive Prompt");
  assert.ok(positive, "expected positive prompt content");
  assert.ok(
    positive?.includes("Model: digital painting with volumetric lighting"),
    "positive prompt should retain inline model line"
  );
  assert.ok(
    positive?.includes("Lighting: Cinematic glow with rim lights"),
    "positive prompt should retain inline lighting line"
  );
});

test("parseSettings captures every provided entry", () => {
  const settings = parseSettings(extractSection(SAMPLE_RESPONSE, "Settings"));
  assert.deepStrictEqual(settings, {
    Model: "Flux Pro",
    Resolution: "1024x1024",
    Sampler: "Euler a",
    Steps: "35",
    CFG: "7",
    Seed: "123456",
  });
});

test("parseStructuredText yields a complete fallback response", () => {
  const parsed = parseStructuredText(SAMPLE_RESPONSE);
  assert.ok(parsed, "expected structured text result");
  assert.equal(parsed?.summary, "A quick synopsis of the envisioned artwork.");
  assert.equal(parsed?.negativePrompt, "Blurry, low detail, double faces");
  assert.equal(parsed?.settings.Seed, "123456");
});
