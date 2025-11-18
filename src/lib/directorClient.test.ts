import assert from "node:assert/strict";
import test from "node:test";

import { buildVeoVideoRequestPayload } from "./directorClient";
import type { VideoPlanPayload } from "./directorTypes";

test("buildVeoVideoRequestPayload forwards planner_context", () => {
  const payload: VideoPlanPayload = {
    vision_seed_text: "Neon skyline",
    script_text: "A hero surveys the city.",
    tone: "hype",
    visual_style: "stylized",
    aspect_ratio: "16:9",
    mood_profile: null,
    planner_context: "Energy curve: approved",
  };

  const result = buildVeoVideoRequestPayload(payload);

  assert.equal(result.ok, true);
  assert.equal(result.value.prompt.planner_context, payload.planner_context);
});
