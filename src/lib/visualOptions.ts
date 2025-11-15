export type VisualOption = {
  id: string;
  label: string;
  tooltip: string;
  promptSnippet: string;
};

export const cameraAngles: VisualOption[] = [
  {
    id: "eye_level",
    label: "Eye-level",
    tooltip: "Camera is at the subject’s eye height; feels neutral and natural.",
    promptSnippet: "eye-level angle, neutral and natural perspective",
  },
  {
    id: "low_angle",
    label: "Low angle",
    tooltip: "Camera is below the subject looking up; makes them feel powerful or imposing.",
    promptSnippet: "low angle shot, camera looking up, subject appears powerful and imposing",
  },
  {
    id: "high_angle",
    label: "High angle",
    tooltip: "Camera looks down from above; creates vulnerability or overview.",
    promptSnippet: "high angle view, camera looking down for a vulnerable perspective",
  },
  {
    id: "overhead",
    label: "Overhead",
    tooltip: "Top-down view showing layout or choreography.",
    promptSnippet: "overhead shot, top-down perspective highlighting composition",
  },
];

export const shotSizes: VisualOption[] = [
  {
    id: "extreme_long",
    label: "Extreme long shot",
    tooltip: "Sweeping view establishing scale and environment.",
    promptSnippet: "extreme long shot, cinematic scale establishing the environment",
  },
  {
    id: "long",
    label: "Long shot",
    tooltip: "Full subject framed head-to-toe with environment context.",
    promptSnippet: "long shot framing full body with environmental context",
  },
  {
    id: "medium",
    label: "Medium shot",
    tooltip: "Waist-up framing, conversational and balanced.",
    promptSnippet: "medium shot, waist-up framing for balanced storytelling",
  },
  {
    id: "medium_closeup",
    label: "Medium close-up",
    tooltip: "Chest-up framing, intimate but still contextual.",
    promptSnippet: "medium close-up, chest-up framing, intimate focus",
  },
  {
    id: "closeup",
    label: "Close-up",
    tooltip: "Focus on face or detail for emotional impact.",
    promptSnippet: "close-up shot, sharp focus on facial expression for emotional impact",
  },
  {
    id: "extreme_closeup",
    label: "Extreme close-up",
    tooltip: "Hyper-detailed shot of eyes, hands, or objects.",
    promptSnippet: "extreme close-up, hyper-detailed focal point",
  },
];

export const lightingStyles: VisualOption[] = [
  {
    id: "soft_diffuse",
    label: "Soft diffuse",
    tooltip: "Gentle light with soft shadows; flattering and dreamy.",
    promptSnippet: "soft diffuse lighting, gentle falloff, dreamy atmosphere",
  },
  {
    id: "rim",
    label: "Rim lighting",
    tooltip: "Bright edge separates subject from background.",
    promptSnippet: "rim lighting, luminous edge outlining the subject",
  },
  {
    id: "golden_hour",
    label: "Golden hour",
    tooltip: "Warm sunset glow with long, soft shadows.",
    promptSnippet: "golden hour glow, warm sunlight, long soft shadows",
  },
  {
    id: "neon",
    label: "Neon glow",
    tooltip: "Colorful neon signage bathing the scene in electric hues.",
    promptSnippet: "neon-lit scene, electric hues, cinematic contrast",
  },
  {
    id: "low_key",
    label: "Low key",
    tooltip: "Dark, moody lighting with sharp contrast.",
    promptSnippet: "low-key lighting, dramatic contrast, sculpted shadows",
  },
  {
    id: "noir",
    label: "Noir",
    tooltip: "High-contrast black-and-white with dramatic shadows.",
    promptSnippet: "noir-inspired lighting, stark black and white, dramatic chiaroscuro",
  },
];

export const colorPalettes: VisualOption[] = [
  {
    id: "warm_golden",
    label: "Warm golden",
    tooltip: "Oranges and ambers for nostalgic warmth.",
    promptSnippet: "warm golden palette, nostalgic amber tones",
  },
  {
    id: "cool_blue",
    label: "Cool blue",
    tooltip: "Calming blues and teals for serene moods.",
    promptSnippet: "cool blue palette, tranquil azure atmosphere",
  },
  {
    id: "teal_orange",
    label: "Teal & orange",
    tooltip: "Classic blockbuster contrast between teal shadows and orange skin tones.",
    promptSnippet: "teal and orange palette, cinematic blockbuster contrast",
  },
  {
    id: "neon_palette",
    label: "Neon spectrum",
    tooltip: "Saturated neon colors for high energy.",
    promptSnippet: "neon spectrum palette, saturated magenta and cyan accents",
  },
  {
    id: "muted_filmic",
    label: "Muted filmic",
    tooltip: "Desaturated cinematic colors with subtle grain.",
    promptSnippet: "muted filmic palette, desaturated tones, tasteful grain",
  },
  {
    id: "black_white",
    label: "Black & white",
    tooltip: "Monochrome storytelling with tonal contrast.",
    promptSnippet: "black and white palette, rich tonal contrast",
  },
];

export function findVisualSnippet(
  list: VisualOption[],
  id?: string
): VisualOption | undefined {
  if (!id) return undefined;
  return list.find((option) => option.id === id);
}
