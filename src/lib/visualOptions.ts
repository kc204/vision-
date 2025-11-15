
export type VisualOption = {
  id: string;
  label: string;
  tooltip: string;
  promptSnippet: string;
  group?: string;
  aliases?: string[];
};

export type VisualOptionGroup = {
  id: string;
  label: string;
  options: VisualOption[];
};

const DEFAULT_GROUP_LABEL = "General";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function sortVisualOptions(options: VisualOption[]): VisualOption[] {
  return [...options].sort((a, b) => a.label.localeCompare(b.label));
}

export function groupOptions(options: VisualOption[]): VisualOptionGroup[] {
  const groups = new Map<string, VisualOptionGroup>();

  options.forEach((option) => {
    const label = option.group ?? DEFAULT_GROUP_LABEL;
    const id = slugify(label) || "general";

    if (!groups.has(id)) {
      groups.set(id, { id, label, options: [] });
    }

    groups.get(id)!.options.push(option);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      options: sortVisualOptions(group.options),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function searchOptions(options: VisualOption[], query: string): VisualOption[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return options;
  }

  const terms = trimmed.split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return options;
  }

  return options.filter((option) => {
    const haystack = [
      option.label,
      option.tooltip,
      ...(option.aliases ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return terms.every((term) => haystack.includes(term));
  });
}

export function findVisualSnippet(
  list: VisualOption[],
  id?: string
): VisualOption | undefined {
  if (!id) return undefined;
  return list.find((option) => option.id === id);
}

export function findVisualSnippets(
  list: VisualOption[],
  ids?: string[]
): VisualOption[] {
  if (!ids || ids.length === 0) return [];
  const idOrder = new Map(ids.map((value, index) => [value, index]));

  return list
    .filter((option) => idOrder.has(option.id))
    .sort((a, b) => idOrder.get(a.id)! - idOrder.get(b.id)!);
}

export const cameraAngles: VisualOption[] = [
  {
    id: "eye_level",
    label: "Eye level",
    tooltip: "Camera at the subject’s eye line for a neutral, conversational perspective.",
    promptSnippet: "eye-level composition, natural conversational perspective",
    group: "Foundation angles",
    aliases: ["neutral", "balanced"],
  },
  {
    id: "low_angle",
    label: "Low angle",
    tooltip: "Camera looks up to empower the subject with scale and authority.",
    promptSnippet: "low angle shot, camera looking up to emphasize power",
    group: "Foundation angles",
    aliases: ["powerful", "dominant"],
  },
  {
    id: "high_angle",
    label: "High angle",
    tooltip: "Camera looks down to create vulnerability or survey the environment.",
    promptSnippet: "high angle view, camera above the subject for a vulnerable tone",
    group: "Foundation angles",
    aliases: ["vulnerable", "survey"],
  },
  {
    id: "birdseye",
    label: "Bird’s-eye",
    tooltip: "Top-down perspective that maps choreography and spatial layout.",
    promptSnippet: "bird's-eye overhead angle, graphic layout of the scene",
    group: "Foundation angles",
    aliases: ["overhead", "map"],
  },
  {
    id: "worms_eye",
    label: "Worm’s-eye",
    tooltip: "Camera from ground level looking up for towering exaggeration.",
    promptSnippet: "worm's-eye angle, dramatic towering exaggeration",
    group: "Foundation angles",
    aliases: ["towering", "dramatic"],
  },
  {
    id: "dutch_tilt",
    label: "Dutch tilt",
    tooltip: "Canted horizon introduces tension, imbalance, or unease.",
    promptSnippet: "Dutch angle, canted horizon for off-kilter tension",
    group: "Expressive angles",
    aliases: ["canted", "tension"],
  },
  {
    id: "pov",
    label: "Point of view",
    tooltip: "Subjective camera mimics what the character sees for immersion.",
    promptSnippet: "subjective POV framing, immersive first-person view",
    group: "Expressive angles",
    aliases: ["subjective", "immersive"],
  },
  {
    id: "over_shoulder",
    label: "Over-the-shoulder",
    tooltip: "Looks past one character to another for conversational context.",
    promptSnippet: "over-the-shoulder framing, conversational depth cues",
    group: "Expressive angles",
    aliases: ["conversation", "dialogue"],
  },
  {
    id: "mirror_reflection",
    label: "Mirror reflection",
    tooltip:
      "Frames the subject through reflective surfaces for layered storytelling.",
    promptSnippet:
      "mirror-reflection angle, subject seen through reflective glass for duality",
    group: "Expressive angles",
    aliases: ["reflection", "duality"],
  },
  {
    id: "tracking_dolly",
    label: "Tracking dolly",
    tooltip: "Camera moves with the subject for fluid, cinematic motion.",
    promptSnippet: "tracking dolly angle, camera gliding alongside the subject",
    group: "Expressive angles",
    aliases: ["motion", "glide"],
  },
  {
    id: "crane_jib",
    label: "Crane / jib sweep",
    tooltip: "Elevated boom move reveals geography with graceful arcs.",
    promptSnippet: "crane jib perspective, graceful rising sweep revealing the world",
    group: "Expressive angles",
    aliases: ["elevated", "reveal"],
  },
  {
    id: "aerial_drone",
    label: "Aerial drone",
    tooltip: "High-altitude perspective for epic scale and geography.",
    promptSnippet: "aerial drone angle, sweeping cinematic overview",
    group: "Expressive angles",
    aliases: ["epic", "geography"],
  },
  {
    id: "macro_intimate",
    label: "Macro intimate",
    tooltip: "Extreme proximity highlighting micro detail and texture.",
    promptSnippet: "macro lens angle, intimate focus on tactile detail",
    group: "Expressive angles",
    aliases: ["macro", "texture"],
  },
  {
    id: "profile_silhouette",
    label: "Profile silhouette",
    tooltip:
      "Side-on silhouette emphasizing outline against a luminous backdrop.",
    promptSnippet:
      "profile silhouette angle, subject outlined against luminous backdrop",
    group: "Expressive angles",
    aliases: ["silhouette", "profile"],
  },
];

export const shotSizes: VisualOption[] = [
  {
    id: "establishing",
    label: "Establishing wide",
    tooltip: "Sweeping view that situates characters within a grand environment.",
    promptSnippet: "establishing wide shot, expansive environment storytelling",
    group: "Framing essentials",
    aliases: ["environment", "context"],
  },
  {
    id: "wide",
    label: "Wide shot",
    tooltip: "Full body framing with clear relationship to the space.",
    promptSnippet: "wide shot framing, full figure within the environment",
    group: "Framing essentials",
    aliases: ["full body", "space"],
  },
  {
    id: "medium_wide",
    label: "Medium wide",
    tooltip: "Knees-up framing balancing intimacy with context.",
    promptSnippet: "medium wide shot, knees-up balance of subject and setting",
    group: "Framing essentials",
    aliases: ["knees up", "balanced"],
  },
  {
    id: "medium",
    label: "Medium shot",
    tooltip: "Waist-up framing ideal for dialogue and body language.",
    promptSnippet: "medium shot, waist-up conversational framing",
    group: "Framing essentials",
    aliases: ["waist", "dialogue"],
  },
  {
    id: "medium_close",
    label: "Medium close-up",
    tooltip: "Chest-up framing that leans into emotion while keeping context.",
    promptSnippet: "medium close-up, chest-up framing for emotional clarity",
    group: "Framing essentials",
    aliases: ["chest", "emotion"],
  },
  {
    id: "close_up",
    label: "Close-up",
    tooltip: "Faces or key details fill the frame for maximum impact.",
    promptSnippet: "close-up shot, intimate focus on expression or detail",
    group: "Framing essentials",
    aliases: ["intimate", "face"],
  },
  {
    id: "extreme_close_up",
    label: "Extreme close-up",
    tooltip: "Hyper-detailed crop revealing texture, eyes, or tactile moments.",
    promptSnippet: "extreme close-up, hyper-detailed tactile emphasis",
    group: "Framing essentials",
    aliases: ["texture", "micro"],
  },
  {
    id: "cowboy",
    label: "Cowboy shot",
    tooltip: "Mid-thigh framing popular for western and heroic stances.",
    promptSnippet: "cowboy framing, mid-thigh hero stance",
    group: "Specialty framings",
    aliases: ["hero", "western"],
  },
  {
    id: "two_shot",
    label: "Two-shot",
    tooltip: "Frames two characters equally to show connection or contrast.",
    promptSnippet: "balanced two-shot, dual character connection",
    group: "Specialty framings",
    aliases: ["duo", "dialogue"],
  },
  {
    id: "group_composition",
    label: "Group tableau",
    tooltip: "Multiple subjects arranged for ensemble storytelling.",
    promptSnippet: "group tableau framing, composed ensemble interaction",
    group: "Specialty framings",
    aliases: ["ensemble", "cast"],
  },
  {
    id: "tableau_vista",
    label: "Tableau vista",
    tooltip:
      "Wide ensemble staging arranged like a living painting across the frame.",
    promptSnippet:
      "tableau vista framing, painterly ensemble arrangement across the frame",
    group: "Specialty framings",
    aliases: ["tableau", "ensemble wide"],
  },
  {
    id: "insert_detail",
    label: "Insert detail",
    tooltip: "Cutaway to an object or hand for narrative emphasis.",
    promptSnippet: "insert detail shot, tactile object emphasis",
    group: "Specialty framings",
    aliases: ["object", "cutaway"],
  },
  {
    id: "choker",
    label: "Choker portrait",
    tooltip: "Frames from the shoulders up for intense closeness.",
    promptSnippet: "choker portrait framing, intense face-dominant composition",
    group: "Specialty framings",
    aliases: ["portrait", "intense"],
  },
  {
    id: "micro_cutaway",
    label: "Micro cutaway",
    tooltip: "Razor-tight slice of action for tactile clarity and suspense.",
    promptSnippet: "micro cutaway shot, razor tight detail of critical action",
    group: "Specialty framings",
    aliases: ["micro", "detail shot"],
  },
];

export const composition: VisualOption[] = [
  {
    id: "rule_of_thirds",
    label: "Rule of thirds",
    tooltip: "Aligns key subjects to a thirds grid for balanced tension.",
    promptSnippet: "rule of thirds composition, subject on intersection points",
    group: "Classic balance",
    aliases: ["balanced", "grid"],
  },
  {
    id: "golden_ratio",
    label: "Golden ratio spiral",
    tooltip: "Organic spiral guides the eye with elegant proportions.",
    promptSnippet: "golden ratio spiral composition, elegant proportional flow",
    group: "Classic balance",
    aliases: ["spiral", "proportion"],
  },
  {
    id: "symmetry",
    label: "Symmetrical frame",
    tooltip: "Mirrored composition conveys order, ritual, or unease.",
    promptSnippet: "perfect symmetry, centered subject with mirrored balance",
    group: "Classic balance",
    aliases: ["mirror", "center"],
  },
  {
    id: "center_focus",
    label: "Central hero",
    tooltip: "Subject anchored dead-center for iconic focus.",
    promptSnippet: "centered composition, iconic hero focus",
    group: "Classic balance",
    aliases: ["iconic", "centered"],
  },
  {
    id: "leading_lines",
    label: "Leading lines",
    tooltip: "Architectural lines direct the eye toward the focal point.",
    promptSnippet: "leading lines composition, converging architecture toward the subject",
    group: "Dynamic storytelling",
    aliases: ["lines", "direction"],
  },
  {
    id: "s_curve_flow",
    label: "S-curve flow",
    tooltip: "Serpentine path guides the gaze with lyrical momentum.",
    promptSnippet:
      "S-curve composition, serpentine path guiding the eye through the frame",
    group: "Dynamic storytelling",
    aliases: ["s-curve", "serpentine"],
  },
  {
    id: "diagonal_energy",
    label: "Diagonal energy",
    tooltip: "Diagonal axis injects motion and momentum into the frame.",
    promptSnippet: "diagonal composition, energized slant through the scene",
    group: "Dynamic storytelling",
    aliases: ["motion", "dynamic"],
  },
  {
    id: "frame_within_frame",
    label: "Frame within frame",
    tooltip: "Foreground shapes create a natural vignette around the subject.",
    promptSnippet: "frame within a frame, foreground elements encircling the subject",
    group: "Dynamic storytelling",
    aliases: ["vignette", "foreground"],
  },
  {
    id: "foreground_layering",
    label: "Foreground layering",
    tooltip: "Multiple depth planes add cinematic parallax and scale.",
    promptSnippet: "layered depth composition, foreground and background storytelling",
    group: "Dynamic storytelling",
    aliases: ["depth", "parallax"],
  },
  {
    id: "pattern_rhythm",
    label: "Pattern & rhythm",
    tooltip: "Repeating shapes create visual music and cohesion.",
    promptSnippet: "pattern-driven composition, rhythmic repetition guiding the eye",
    group: "Dynamic storytelling",
    aliases: ["repetition", "pattern"],
  },
  {
    id: "negative_space",
    label: "Negative space",
    tooltip: "Vast emptiness isolates the subject for poetic emphasis.",
    promptSnippet: "negative space composition, isolated subject against open void",
    group: "Atmospheric minimalism",
    aliases: ["minimal", "isolation"],
  },
  {
    id: "minimalist_geometry",
    label: "Minimalist geometry",
    tooltip: "Graphic shapes and bold blocks create a modernist statement.",
    promptSnippet: "minimalist geometric composition, bold shapes and clean balance",
    group: "Atmospheric minimalism",
    aliases: ["graphic", "modern"],
  },
  {
    id: "radial_burst",
    label: "Radial burst",
    tooltip: "Radiating elements converge on the subject like a spotlight.",
    promptSnippet: "radial burst composition, converging rays spotlighting the subject",
    group: "Dynamic storytelling",
    aliases: ["radial", "burst"],
  },
  {
    id: "golden_triangle",
    label: "Golden triangle",
    tooltip: "Triangular energy divides the frame into dynamic tension zones.",
    promptSnippet: "golden triangle composition, dynamic intersecting diagonals",
    group: "Classic balance",
    aliases: ["triangle", "dynamic"],
  },
];

export const lightingStyles: VisualOption[] = [
  {
    id: "three_point",
    label: "Three-point setup",
    tooltip: "Classic key, fill, and backlight for polished dimensionality.",
    promptSnippet: "three-point lighting, balanced key fill and rim separation",
    group: "Key setups",
    aliases: ["polished", "balanced"],
  },
  {
    id: "soft_wrap",
    label: "Soft wrap",
    tooltip: "Large diffused source wraps gently for flattering skin.",
    promptSnippet: "soft diffused lighting, gentle wrap and airy highlights",
    group: "Key setups",
    aliases: ["diffused", "flattering"],
  },
  {
    id: "hard_chiaroscuro",
    label: "Hard chiaroscuro",
    tooltip: "High contrast carves shapes with dramatic shadows.",
    promptSnippet: "hard chiaroscuro lighting, sculpted shadow and luminous contrast",
    group: "Mood sculpting",
    aliases: ["dramatic", "contrast"],
  },
  {
    id: "low_key",
    label: "Low-key noir",
    tooltip: "Predominantly shadow with pockets of light for mystery.",
    promptSnippet: "low-key lighting, moody pools of light in deep shadow",
    group: "Mood sculpting",
    aliases: ["noir", "moody"],
  },
  {
    id: "high_key",
    label: "High-key gloss",
    tooltip: "Bright, low-contrast lighting for aspirational polish.",
    promptSnippet: "high-key lighting, luminous low contrast glow",
    group: "Key setups",
    aliases: ["bright", "commercial"],
  },
  {
    id: "rembrandt",
    label: "Rembrandt pocket",
    tooltip: "Key placed for the signature cheek triangle and depth.",
    promptSnippet: "Rembrandt lighting, triangular cheek highlight for painterly drama",
    group: "Mood sculpting",
    aliases: ["portrait", "classic"],
  },
  {
    id: "split",
    label: "Split lighting",
    tooltip: "Key lights only half the face for duality and tension.",
    promptSnippet: "split lighting, half in shadow to suggest duality",
    group: "Mood sculpting",
    aliases: ["duality", "shadow"],
  },
  {
    id: "practical_glow",
    label: "Practical glow",
    tooltip: "Scene is lit by visible sources like lamps, screens, or neon.",
    promptSnippet: "practical motivated lighting, diegetic lamps casting warm glow",
    group: "Mood sculpting",
    aliases: ["diegetic", "motivated"],
  },
  {
    id: "moonlit_silhouette",
    label: "Moonlit silhouette",
    tooltip: "Cool rim light carves silhouettes against night atmospherics.",
    promptSnippet:
      "moonlit silhouette lighting, cool rim tracing figures against twilight",
    group: "Mood sculpting",
    aliases: ["moonlight", "silhouette"],
  },
  {
    id: "volumetric",
    label: "Volumetric beams",
    tooltip: "Light through haze reveals dramatic god rays and atmosphere.",
    promptSnippet: "volumetric lighting, cinematic god rays through mist",
    group: "Mood sculpting",
    aliases: ["atmosphere", "god rays"],
  },
  {
    id: "color_gels",
    label: "Color gel clash",
    tooltip: "Bold complementary gels bathe the scene in stylized hues.",
    promptSnippet: "gelled lighting, bold complementary colors washing the scene",
    group: "Color artistry",
    aliases: ["gel", "stylized"],
  },
  {
    id: "mixed_temperature",
    label: "Mixed temperature",
    tooltip: "Warm practicals versus cool ambient for cinematic contrast.",
    promptSnippet: "mixed color temperatures, warm practicals against cool ambience",
    group: "Color artistry",
    aliases: ["contrast", "warm cool"],
  },
  {
    id: "neon_bounce",
    label: "Neon bounce",
    tooltip: "Electric signage paints faces with saturated gradients.",
    promptSnippet: "neon bounce lighting, saturated signage reflecting on the subject",
    group: "Color artistry",
    aliases: ["neon", "electric"],
  },
  {
    id: "candlelight",
    label: "Candlelight flicker",
    tooltip: "Flickering flame sources create warm, intimate falloff.",
    promptSnippet: "candlelit ambience, warm flicker with soft falloff",
    group: "Mood sculpting",
    aliases: ["warm", "intimate"],
  },
  {
    id: "specular_edge",
    label: "Specular edge",
    tooltip: "Hard back edge light kisses contours with sparkle.",
    promptSnippet: "specular rim lighting, crisp highlights tracing silhouettes",
    group: "Key setups",
    aliases: ["rim", "sparkle"],
  },
  {
    id: "studio_cyclorama",
    label: "Studio cyclorama",
    tooltip: "Even wrap from seamless cyc for product-perfect clarity.",
    promptSnippet:
      "studio cyclorama lighting, seamless white sweep with even wrap illumination",
    group: "Key setups",
    aliases: ["cyc", "studio"],
  },
];

export const colorPalettes: VisualOption[] = [
  {
    id: "sunset_glow",
    label: "Sunset glow",
    tooltip: "Amber, peach, and magenta gradients for romantic warmth.",
    promptSnippet: "sunset glow palette, amber to magenta warmth",
    group: "Warm & radiant",
    aliases: ["warm", "romantic"],
  },
  {
    id: "ember_night",
    label: "Ember night",
    tooltip: "Coal blacks with embers of orange and copper.",
    promptSnippet: "ember night palette, charcoal shadows with copper highlights",
    group: "Warm & radiant",
    aliases: ["fire", "contrast"],
  },
  {
    id: "desert_ochre",
    label: "Desert ochre",
    tooltip: "Dusty oranges, clay reds, and sun-bleached neutrals.",
    promptSnippet: "desert ochre palette, earthy sun-baked tones",
    group: "Warm & radiant",
    aliases: ["earthy", "sun"],
  },
  {
    id: "arctic_teal",
    label: "Arctic teal",
    tooltip: "Blue-teal gradients with crisp whites for icy calm.",
    promptSnippet: "arctic teal palette, icy cyan with crystalline whites",
    group: "Cool & moody",
    aliases: ["icy", "cool"],
  },
  {
    id: "midnight_indigo",
    label: "Midnight indigo",
    tooltip: "Deep blues and violets with silver highlights for nocturne moods.",
    promptSnippet: "midnight indigo palette, velvety blues with silver glints",
    group: "Cool & moody",
    aliases: ["night", "velvet"],
  },
  {
    id: "storm_greys",
    label: "Storm greys",
    tooltip: "Charcoal, slate, and steel tones for grounded realism.",
    promptSnippet: "storm grey palette, slate neutrals with moody contrast",
    group: "Cool & moody",
    aliases: ["grey", "realism"],
  },
  {
    id: "vaporwave",
    label: "Neon vaporwave",
    tooltip: "Cyan, magenta, and violet for bold retro futurism.",
    promptSnippet: "vaporwave palette, neon cyan and magenta glow",
    group: "Vibrant & stylized",
    aliases: ["retro", "neon"],
  },
  {
    id: "technicolor_pop",
    label: "Technicolor pop",
    tooltip: "Saturated primaries with punchy contrast.",
    promptSnippet: "technicolor palette, saturated primaries with crisp contrast",
    group: "Vibrant & stylized",
    aliases: ["bold", "primary"],
  },
  {
    id: "citrus_splash",
    label: "Citrus splash",
    tooltip: "Lemons, limes, and grapefruit notes for playful freshness.",
    promptSnippet: "citrus splash palette, zesty yellow lime and coral",
    group: "Vibrant & stylized",
    aliases: ["fresh", "playful"],
  },
  {
    id: "forest_moss",
    label: "Forest moss",
    tooltip: "Deep greens with bronze and bark undertones.",
    promptSnippet: "forest moss palette, lush greens with bronze undertones",
    group: "Earthy & filmic",
    aliases: ["green", "organic"],
  },
  {
    id: "muted_filmic",
    label: "Muted filmic",
    tooltip: "Desaturated cinematic palette with gentle contrast.",
    promptSnippet: "muted filmic palette, restrained colors with soft contrast",
    group: "Earthy & filmic",
    aliases: ["cinematic", "desaturated"],
  },
  {
    id: "sepia_archive",
    label: "Sepia archive",
    tooltip: "Warm browns and faded parchment for archival nostalgia.",
    promptSnippet: "sepia archive palette, warm browns with nostalgic fade",
    group: "Earthy & filmic",
    aliases: ["vintage", "nostalgic"],
  },
  {
    id: "aurora_spectrum",
    label: "Aurora spectrum",
    tooltip: "Iridescent greens, violets, and cyan like polar skies.",
    promptSnippet: "aurora spectrum palette, iridescent greens and violets in motion",
    group: "Vibrant & stylized",
    aliases: ["aurora", "iridescent"],
  },
  {
    id: "obsidian_monochrome",
    label: "Obsidian monochrome",
    tooltip: "Inky blacks with steel gradients for sculpted minimalism.",
    promptSnippet:
      "obsidian monochrome palette, inky blacks with steel gradients and sheen",
    group: "Cool & moody",
    aliases: ["monochrome", "obsidian"],
  },
];

export const cameraMovement: VisualOption[] = [
  {
    id: "tracking_glide",
    label: "Tracking glide",
    tooltip: "Camera glides alongside the subject for immersive momentum.",
    promptSnippet: "tracking glide motion, camera pacing the subject in fluid motion",
    group: "Cinematic movement",
    aliases: ["tracking", "glide"],
  },
  {
    id: "steady_push",
    label: "Steady push-in",
    tooltip: "Slow dolly inward that builds focus and anticipation.",
    promptSnippet: "slow push-in, deliberate dolly drawing closer to the subject",
    group: "Cinematic movement",
    aliases: ["dolly", "focus"],
  },
  {
    id: "reveal_pullback",
    label: "Reveal pullback",
    tooltip: "Camera pulls out to reveal new context or scale.",
    promptSnippet: "pullback reveal, camera drifting backward to unveil context",
    group: "Cinematic movement",
    aliases: ["reveal", "scale"],
  },
  {
    id: "crane_rise",
    label: "Crane rise",
    tooltip: "Vertical lift or descent to dramatize geography.",
    promptSnippet: "crane rise, vertical sweep showcasing geography",
    group: "Cinematic movement",
    aliases: ["vertical", "sweep"],
  },
  {
    id: "aerial_sweep",
    label: "Aerial sweep",
    tooltip: "Sweeping drone arc for epic spectacle.",
    promptSnippet: "aerial sweep, dramatic drone arc over the scene",
    group: "Cinematic movement",
    aliases: ["drone", "epic"],
  },
  {
    id: "orbit_drift",
    label: "Orbit drift",
    tooltip: "Slow orbit circles the subject to reveal facets and depth.",
    promptSnippet:
      "orbit drift move, camera circling subject to unveil dimensional context",
    group: "Cinematic movement",
    aliases: ["orbit", "circle"],
  },
  {
    id: "whip_pan",
    label: "Whip pan",
    tooltip: "Rapid pan blur that snaps attention between beats.",
    promptSnippet: "whip pan motion, rapid smear connecting story beats",
    group: "Kinetic energy",
    aliases: ["fast", "pan"],
  },
  {
    id: "handheld_urgency",
    label: "Handheld urgency",
    tooltip: "Energetic handheld sway for visceral immediacy.",
    promptSnippet: "handheld urgency, reactive camera with visceral sway",
    group: "Kinetic energy",
    aliases: ["handheld", "intense"],
  },
  {
    id: "slow_shutter",
    label: "Slow shutter trails",
    tooltip: "Long exposure streaks express speed and atmosphere.",
    promptSnippet: "slow shutter trails, luminous streaks conveying motion",
    group: "Kinetic energy",
    aliases: ["long exposure", "streaks"],
  },
  {
    id: "parallax_shift",
    label: "Parallax shift",
    tooltip: "Layered foregrounds move at different speeds for depth.",
    promptSnippet: "parallax shift, layered foregrounds sliding past the subject",
    group: "Kinetic energy",
    aliases: ["depth", "layers"],
  },
  {
    id: "freeze_frame",
    label: "Freeze-frame accent",
    tooltip: "Momentarily suspends motion for a stylized beat.",
    promptSnippet: "freeze-frame accent, suspended motion for dramatic punctuation",
    group: "Kinetic energy",
    aliases: ["staccato", "stylized"],
  },
  {
    id: "steadicam_float",
    label: "Steadicam float",
    tooltip: "Balanced floating move that glides with human grace.",
    promptSnippet:
      "steadicam float move, balanced glide following the subject with poise",
    group: "Cinematic movement",
    aliases: ["steadicam", "float"],
  },
];

export const atmosphere: VisualOption[] = [
  {
    id: "neo_noir",
    label: "Neo noir",
    tooltip: "Glistening streets, stark contrast, and moody urban drama.",
    promptSnippet: "neo-noir styling, rain-soaked streets with razor contrast",
    group: "Cinematic treatments",
    aliases: ["noir", "urban"],
  },
  {
    id: "analog_film",
    label: "Analog film",
    tooltip: "35mm grain, soft halation, and nostalgic imperfection.",
    promptSnippet: "analog film aesthetic, 35mm grain and halation bloom",
    group: "Cinematic treatments",
    aliases: ["35mm", "grain"],
  },
  {
    id: "editorial_gloss",
    label: "Editorial gloss",
    tooltip: "High-fashion polish with sculpted poses and specular sheen.",
    promptSnippet: "high-fashion editorial styling, sculpted poses and glossy lighting",
    group: "Cinematic treatments",
    aliases: ["fashion", "luxury"],
  },
  {
    id: "documentary_realism",
    label: "Documentary realism",
    tooltip: "Naturalistic texture with observational authenticity.",
    promptSnippet: "documentary realism, candid textures and honest detail",
    group: "Cinematic treatments",
    aliases: ["natural", "authentic"],
  },
  {
    id: "concept_painting",
    label: "Concept art painting",
    tooltip: "Brushy painterly rendering with atmospheric depth.",
    promptSnippet: "concept art style, painterly strokes with atmospheric depth",
    group: "Illustrated looks",
    aliases: ["painterly", "concept"],
  },
  {
    id: "anime_cel",
    label: "Anime cel shading",
    tooltip: "Clean line art, bold shadows, and stylized highlights.",
    promptSnippet: "anime cel shading, crisp lines and stylized highlights",
    group: "Illustrated looks",
    aliases: ["anime", "cel"],
  },
  {
    id: "graphic_novel",
    label: "Graphic novel ink",
    tooltip: "High-contrast inked panels with halftone accents.",
    promptSnippet: "graphic novel style, inky linework and halftone texture",
    group: "Illustrated looks",
    aliases: ["ink", "comic"],
  },
  {
    id: "watercolor_dream",
    label: "Watercolor dream",
    tooltip: "Soft washes, bloom edges, and translucent pigment.",
    promptSnippet: "watercolor dream style, soft washes and translucent pigment",
    group: "Illustrated looks",
    aliases: ["watercolor", "delicate"],
  },
  {
    id: "retro_futurism",
    label: "Retro futurism",
    tooltip: "Synthwave neon meets chrome optimism and vintage tech.",
    promptSnippet: "retro futurism styling, neon gradients with chrome details",
    group: "Speculative worlds",
    aliases: ["synthwave", "retro"],
  },
  {
    id: "bioluminescent_fantasy",
    label: "Bioluminescent fantasy",
    tooltip: "Glowing flora, ethereal particles, and mystical wonder.",
    promptSnippet: "bioluminescent fantasy, glowing flora and ethereal particles",
    group: "Speculative worlds",
    aliases: ["fantasy", "glow"],
  },
  {
    id: "cosmic_sci_fi",
    label: "Cosmic sci-fi",
    tooltip: "Deep-space vistas, lens flares, and futuristic tech.",
    promptSnippet: "cosmic sci-fi styling, futuristic tech amid stellar vistas",
    group: "Speculative worlds",
    aliases: ["space", "futuristic"],
  },
  {
    id: "surreal_dreamscape",
    label: "Surreal dreamscape",
    tooltip: "Gravity-defying environments and poetic symbolism.",
    promptSnippet: "surreal dreamscape, symbolic imagery and impossible spaces",
    group: "Speculative worlds",
    aliases: ["surreal", "dream"],
  },
  {
    id: "mythic_folklore",
    label: "Mythic folklore",
    tooltip: "Storybook motifs, embroidered textiles, and firelight legend.",
    promptSnippet:
      "mythic folklore treatment, storybook textiles and ceremonial firelight",
    group: "Atmospheric storytelling",
    aliases: ["folklore", "mythic"],
  },
  {
    id: "post_apocalyptic",
    label: "Post-apocalyptic grit",
    tooltip: "Weathered industry, dust motes, and survivalist patina.",
    promptSnippet:
      "post-apocalyptic treatment, rusted industry and dust-laden atmosphere",
    group: "Atmospheric storytelling",
    aliases: ["apocalypse", "grit"],
  },
];
