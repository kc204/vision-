
export type VisualOption = {
  id: string;
  label: string;
  tooltip: string;
  promptSnippet: string;
  group?: string;
  keywords?: string[];
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
      ...(option.keywords ?? []),
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
    keywords: ["neutral", "balanced"],
  },
  {
    id: "low_angle",
    label: "Low angle",
    tooltip: "Camera looks up to empower the subject with scale and authority.",
    promptSnippet: "low angle shot, camera looking up to emphasize power",
    group: "Foundation angles",
    keywords: ["powerful", "dominant"],
  },
  {
    id: "high_angle",
    label: "High angle",
    tooltip: "Camera looks down to create vulnerability or survey the environment.",
    promptSnippet: "high angle view, camera above the subject for a vulnerable tone",
    group: "Foundation angles",
    keywords: ["vulnerable", "survey"],
  },
  {
    id: "birdseye",
    label: "Bird’s-eye",
    tooltip: "Top-down perspective that maps choreography and spatial layout.",
    promptSnippet: "bird's-eye overhead angle, graphic layout of the scene",
    group: "Foundation angles",
    keywords: ["overhead", "map"],
  },
  {
    id: "worms_eye",
    label: "Worm’s-eye",
    tooltip: "Camera from ground level looking up for towering exaggeration.",
    promptSnippet: "worm's-eye angle, dramatic towering exaggeration",
    group: "Foundation angles",
    keywords: ["towering", "dramatic"],
  },
  {
    id: "dutch_tilt",
    label: "Dutch tilt",
    tooltip: "Canted horizon introduces tension, imbalance, or unease.",
    promptSnippet: "Dutch angle, canted horizon for off-kilter tension",
    group: "Expressive angles",
    keywords: ["canted", "tension"],
  },
  {
    id: "pov",
    label: "Point of view",
    tooltip: "Subjective camera mimics what the character sees for immersion.",
    promptSnippet: "subjective POV framing, immersive first-person view",
    group: "Expressive angles",
    keywords: ["subjective", "immersive"],
  },
  {
    id: "over_shoulder",
    label: "Over-the-shoulder",
    tooltip: "Looks past one character to another for conversational context.",
    promptSnippet: "over-the-shoulder framing, conversational depth cues",
    group: "Expressive angles",
    keywords: ["conversation", "dialogue"],
  },
  {
    id: "tracking_dolly",
    label: "Tracking dolly",
    tooltip: "Camera moves with the subject for fluid, cinematic motion.",
    promptSnippet: "tracking dolly angle, camera gliding alongside the subject",
    group: "Expressive angles",
    keywords: ["motion", "glide"],
  },
  {
    id: "crane_jib",
    label: "Crane / jib sweep",
    tooltip: "Elevated boom move reveals geography with graceful arcs.",
    promptSnippet: "crane jib perspective, graceful rising sweep revealing the world",
    group: "Expressive angles",
    keywords: ["elevated", "reveal"],
  },
  {
    id: "aerial_drone",
    label: "Aerial drone",
    tooltip: "High-altitude perspective for epic scale and geography.",
    promptSnippet: "aerial drone angle, sweeping cinematic overview",
    group: "Expressive angles",
    keywords: ["epic", "geography"],
  },
  {
    id: "macro_intimate",
    label: "Macro intimate",
    tooltip: "Extreme proximity highlighting micro detail and texture.",
    promptSnippet: "macro lens angle, intimate focus on tactile detail",
    group: "Expressive angles",
    keywords: ["macro", "texture"],
  },
];

export const shotSizes: VisualOption[] = [
  {
    id: "establishing",
    label: "Establishing wide",
    tooltip: "Sweeping view that situates characters within a grand environment.",
    promptSnippet: "establishing wide shot, expansive environment storytelling",
    group: "Framing essentials",
    keywords: ["environment", "context"],
  },
  {
    id: "wide",
    label: "Wide shot",
    tooltip: "Full body framing with clear relationship to the space.",
    promptSnippet: "wide shot framing, full figure within the environment",
    group: "Framing essentials",
    keywords: ["full body", "space"],
  },
  {
    id: "medium_wide",
    label: "Medium wide",
    tooltip: "Knees-up framing balancing intimacy with context.",
    promptSnippet: "medium wide shot, knees-up balance of subject and setting",
    group: "Framing essentials",
    keywords: ["knees up", "balanced"],
  },
  {
    id: "medium",
    label: "Medium shot",
    tooltip: "Waist-up framing ideal for dialogue and body language.",
    promptSnippet: "medium shot, waist-up conversational framing",
    group: "Framing essentials",
    keywords: ["waist", "dialogue"],
  },
  {
    id: "medium_close",
    label: "Medium close-up",
    tooltip: "Chest-up framing that leans into emotion while keeping context.",
    promptSnippet: "medium close-up, chest-up framing for emotional clarity",
    group: "Framing essentials",
    keywords: ["chest", "emotion"],
  },
  {
    id: "close_up",
    label: "Close-up",
    tooltip: "Faces or key details fill the frame for maximum impact.",
    promptSnippet: "close-up shot, intimate focus on expression or detail",
    group: "Framing essentials",
    keywords: ["intimate", "face"],
  },
  {
    id: "extreme_close_up",
    label: "Extreme close-up",
    tooltip: "Hyper-detailed crop revealing texture, eyes, or tactile moments.",
    promptSnippet: "extreme close-up, hyper-detailed tactile emphasis",
    group: "Framing essentials",
    keywords: ["texture", "micro"],
  },
  {
    id: "cowboy",
    label: "Cowboy shot",
    tooltip: "Mid-thigh framing popular for western and heroic stances.",
    promptSnippet: "cowboy framing, mid-thigh hero stance",
    group: "Specialty framings",
    keywords: ["hero", "western"],
  },
  {
    id: "two_shot",
    label: "Two-shot",
    tooltip: "Frames two characters equally to show connection or contrast.",
    promptSnippet: "balanced two-shot, dual character connection",
    group: "Specialty framings",
    keywords: ["duo", "dialogue"],
  },
  {
    id: "group_composition",
    label: "Group tableau",
    tooltip: "Multiple subjects arranged for ensemble storytelling.",
    promptSnippet: "group tableau framing, composed ensemble interaction",
    group: "Specialty framings",
    keywords: ["ensemble", "cast"],
  },
  {
    id: "insert_detail",
    label: "Insert detail",
    tooltip: "Cutaway to an object or hand for narrative emphasis.",
    promptSnippet: "insert detail shot, tactile object emphasis",
    group: "Specialty framings",
    keywords: ["object", "cutaway"],
  },
  {
    id: "choker",
    label: "Choker portrait",
    tooltip: "Frames from the shoulders up for intense closeness.",
    promptSnippet: "choker portrait framing, intense face-dominant composition",
    group: "Specialty framings",
    keywords: ["portrait", "intense"],
  },
];

export const composition: VisualOption[] = [
  {
    id: "rule_of_thirds",
    label: "Rule of thirds",
    tooltip: "Aligns key subjects to a thirds grid for balanced tension.",
    promptSnippet: "rule of thirds composition, subject on intersection points",
    group: "Classic balance",
    keywords: ["balanced", "grid"],
  },
  {
    id: "golden_ratio",
    label: "Golden ratio spiral",
    tooltip: "Organic spiral guides the eye with elegant proportions.",
    promptSnippet: "golden ratio spiral composition, elegant proportional flow",
    group: "Classic balance",
    keywords: ["spiral", "proportion"],
  },
  {
    id: "symmetry",
    label: "Symmetrical frame",
    tooltip: "Mirrored composition conveys order, ritual, or unease.",
    promptSnippet: "perfect symmetry, centered subject with mirrored balance",
    group: "Classic balance",
    keywords: ["mirror", "center"],
  },
  {
    id: "center_focus",
    label: "Central hero",
    tooltip: "Subject anchored dead-center for iconic focus.",
    promptSnippet: "centered composition, iconic hero focus",
    group: "Classic balance",
    keywords: ["iconic", "centered"],
  },
  {
    id: "leading_lines",
    label: "Leading lines",
    tooltip: "Architectural lines direct the eye toward the focal point.",
    promptSnippet: "leading lines composition, converging architecture toward the subject",
    group: "Dynamic storytelling",
    keywords: ["lines", "direction"],
  },
  {
    id: "diagonal_energy",
    label: "Diagonal energy",
    tooltip: "Diagonal axis injects motion and momentum into the frame.",
    promptSnippet: "diagonal composition, energized slant through the scene",
    group: "Dynamic storytelling",
    keywords: ["motion", "dynamic"],
  },
  {
    id: "frame_within_frame",
    label: "Frame within frame",
    tooltip: "Foreground shapes create a natural vignette around the subject.",
    promptSnippet: "frame within a frame, foreground elements encircling the subject",
    group: "Dynamic storytelling",
    keywords: ["vignette", "foreground"],
  },
  {
    id: "foreground_layering",
    label: "Foreground layering",
    tooltip: "Multiple depth planes add cinematic parallax and scale.",
    promptSnippet: "layered depth composition, foreground and background storytelling",
    group: "Dynamic storytelling",
    keywords: ["depth", "parallax"],
  },
  {
    id: "pattern_rhythm",
    label: "Pattern & rhythm",
    tooltip: "Repeating shapes create visual music and cohesion.",
    promptSnippet: "pattern-driven composition, rhythmic repetition guiding the eye",
    group: "Dynamic storytelling",
    keywords: ["repetition", "pattern"],
  },
  {
    id: "negative_space",
    label: "Negative space",
    tooltip: "Vast emptiness isolates the subject for poetic emphasis.",
    promptSnippet: "negative space composition, isolated subject against open void",
    group: "Atmospheric minimalism",
    keywords: ["minimal", "isolation"],
  },
  {
    id: "minimalist_geometry",
    label: "Minimalist geometry",
    tooltip: "Graphic shapes and bold blocks create a modernist statement.",
    promptSnippet: "minimalist geometric composition, bold shapes and clean balance",
    group: "Atmospheric minimalism",
    keywords: ["graphic", "modern"],
  },
  {
    id: "golden_triangle",
    label: "Golden triangle",
    tooltip: "Triangular energy divides the frame into dynamic tension zones.",
    promptSnippet: "golden triangle composition, dynamic intersecting diagonals",
    group: "Classic balance",
    keywords: ["triangle", "dynamic"],
  },
];

export const lightingStyles: VisualOption[] = [
  {
    id: "three_point",
    label: "Three-point setup",
    tooltip: "Classic key, fill, and backlight for polished dimensionality.",
    promptSnippet: "three-point lighting, balanced key fill and rim separation",
    group: "Key setups",
    keywords: ["polished", "balanced"],
  },
  {
    id: "soft_wrap",
    label: "Soft wrap",
    tooltip: "Large diffused source wraps gently for flattering skin.",
    promptSnippet: "soft diffused lighting, gentle wrap and airy highlights",
    group: "Key setups",
    keywords: ["diffused", "flattering"],
  },
  {
    id: "hard_chiaroscuro",
    label: "Hard chiaroscuro",
    tooltip: "High contrast carves shapes with dramatic shadows.",
    promptSnippet: "hard chiaroscuro lighting, sculpted shadow and luminous contrast",
    group: "Mood sculpting",
    keywords: ["dramatic", "contrast"],
  },
  {
    id: "low_key",
    label: "Low-key noir",
    tooltip: "Predominantly shadow with pockets of light for mystery.",
    promptSnippet: "low-key lighting, moody pools of light in deep shadow",
    group: "Mood sculpting",
    keywords: ["noir", "moody"],
  },
  {
    id: "high_key",
    label: "High-key gloss",
    tooltip: "Bright, low-contrast lighting for aspirational polish.",
    promptSnippet: "high-key lighting, luminous low contrast glow",
    group: "Key setups",
    keywords: ["bright", "commercial"],
  },
  {
    id: "rembrandt",
    label: "Rembrandt pocket",
    tooltip: "Key placed for the signature cheek triangle and depth.",
    promptSnippet: "Rembrandt lighting, triangular cheek highlight for painterly drama",
    group: "Mood sculpting",
    keywords: ["portrait", "classic"],
  },
  {
    id: "split",
    label: "Split lighting",
    tooltip: "Key lights only half the face for duality and tension.",
    promptSnippet: "split lighting, half in shadow to suggest duality",
    group: "Mood sculpting",
    keywords: ["duality", "shadow"],
  },
  {
    id: "practical_glow",
    label: "Practical glow",
    tooltip: "Scene is lit by visible sources like lamps, screens, or neon.",
    promptSnippet: "practical motivated lighting, diegetic lamps casting warm glow",
    group: "Mood sculpting",
    keywords: ["diegetic", "motivated"],
  },
  {
    id: "volumetric",
    label: "Volumetric beams",
    tooltip: "Light through haze reveals dramatic god rays and atmosphere.",
    promptSnippet: "volumetric lighting, cinematic god rays through mist",
    group: "Mood sculpting",
    keywords: ["atmosphere", "god rays"],
  },
  {
    id: "color_gels",
    label: "Color gel clash",
    tooltip: "Bold complementary gels bathe the scene in stylized hues.",
    promptSnippet: "gelled lighting, bold complementary colors washing the scene",
    group: "Color artistry",
    keywords: ["gel", "stylized"],
  },
  {
    id: "mixed_temperature",
    label: "Mixed temperature",
    tooltip: "Warm practicals versus cool ambient for cinematic contrast.",
    promptSnippet: "mixed color temperatures, warm practicals against cool ambience",
    group: "Color artistry",
    keywords: ["contrast", "warm cool"],
  },
  {
    id: "neon_bounce",
    label: "Neon bounce",
    tooltip: "Electric signage paints faces with saturated gradients.",
    promptSnippet: "neon bounce lighting, saturated signage reflecting on the subject",
    group: "Color artistry",
    keywords: ["neon", "electric"],
  },
  {
    id: "candlelight",
    label: "Candlelight flicker",
    tooltip: "Flickering flame sources create warm, intimate falloff.",
    promptSnippet: "candlelit ambience, warm flicker with soft falloff",
    group: "Mood sculpting",
    keywords: ["warm", "intimate"],
  },
  {
    id: "specular_edge",
    label: "Specular edge",
    tooltip: "Hard back edge light kisses contours with sparkle.",
    promptSnippet: "specular rim lighting, crisp highlights tracing silhouettes",
    group: "Key setups",
    keywords: ["rim", "sparkle"],
  },
];

export const colorPalettes: VisualOption[] = [
  {
    id: "sunset_glow",
    label: "Sunset glow",
    tooltip: "Amber, peach, and magenta gradients for romantic warmth.",
    promptSnippet: "sunset glow palette, amber to magenta warmth",
    group: "Warm & radiant",
    keywords: ["warm", "romantic"],
  },
  {
    id: "ember_night",
    label: "Ember night",
    tooltip: "Coal blacks with embers of orange and copper.",
    promptSnippet: "ember night palette, charcoal shadows with copper highlights",
    group: "Warm & radiant",
    keywords: ["fire", "contrast"],
  },
  {
    id: "desert_ochre",
    label: "Desert ochre",
    tooltip: "Dusty oranges, clay reds, and sun-bleached neutrals.",
    promptSnippet: "desert ochre palette, earthy sun-baked tones",
    group: "Warm & radiant",
    keywords: ["earthy", "sun"],
  },
  {
    id: "arctic_teal",
    label: "Arctic teal",
    tooltip: "Blue-teal gradients with crisp whites for icy calm.",
    promptSnippet: "arctic teal palette, icy cyan with crystalline whites",
    group: "Cool & moody",
    keywords: ["icy", "cool"],
  },
  {
    id: "midnight_indigo",
    label: "Midnight indigo",
    tooltip: "Deep blues and violets with silver highlights for nocturne moods.",
    promptSnippet: "midnight indigo palette, velvety blues with silver glints",
    group: "Cool & moody",
    keywords: ["night", "velvet"],
  },
  {
    id: "storm_greys",
    label: "Storm greys",
    tooltip: "Charcoal, slate, and steel tones for grounded realism.",
    promptSnippet: "storm grey palette, slate neutrals with moody contrast",
    group: "Cool & moody",
    keywords: ["grey", "realism"],
  },
  {
    id: "vaporwave",
    label: "Neon vaporwave",
    tooltip: "Cyan, magenta, and violet for bold retro futurism.",
    promptSnippet: "vaporwave palette, neon cyan and magenta glow",
    group: "Vibrant & stylized",
    keywords: ["retro", "neon"],
  },
  {
    id: "technicolor_pop",
    label: "Technicolor pop",
    tooltip: "Saturated primaries with punchy contrast.",
    promptSnippet: "technicolor palette, saturated primaries with crisp contrast",
    group: "Vibrant & stylized",
    keywords: ["bold", "primary"],
  },
  {
    id: "citrus_splash",
    label: "Citrus splash",
    tooltip: "Lemons, limes, and grapefruit notes for playful freshness.",
    promptSnippet: "citrus splash palette, zesty yellow lime and coral",
    group: "Vibrant & stylized",
    keywords: ["fresh", "playful"],
  },
  {
    id: "forest_moss",
    label: "Forest moss",
    tooltip: "Deep greens with bronze and bark undertones.",
    promptSnippet: "forest moss palette, lush greens with bronze undertones",
    group: "Earthy & filmic",
    keywords: ["green", "organic"],
  },
  {
    id: "muted_filmic",
    label: "Muted filmic",
    tooltip: "Desaturated cinematic palette with gentle contrast.",
    promptSnippet: "muted filmic palette, restrained colors with soft contrast",
    group: "Earthy & filmic",
    keywords: ["cinematic", "desaturated"],
  },
  {
    id: "sepia_archive",
    label: "Sepia archive",
    tooltip: "Warm browns and faded parchment for archival nostalgia.",
    promptSnippet: "sepia archive palette, warm browns with nostalgic fade",
    group: "Earthy & filmic",
    keywords: ["vintage", "nostalgic"],
  },
];

export const cameraMovement: VisualOption[] = [
  {
    id: "tracking_glide",
    label: "Tracking glide",
    tooltip: "Camera glides alongside the subject for immersive momentum.",
    promptSnippet: "tracking glide motion, camera pacing the subject in fluid motion",
    group: "Cinematic movement",
    keywords: ["tracking", "glide"],
  },
  {
    id: "steady_push",
    label: "Steady push-in",
    tooltip: "Slow dolly inward that builds focus and anticipation.",
    promptSnippet: "slow push-in, deliberate dolly drawing closer to the subject",
    group: "Cinematic movement",
    keywords: ["dolly", "focus"],
  },
  {
    id: "reveal_pullback",
    label: "Reveal pullback",
    tooltip: "Camera pulls out to reveal new context or scale.",
    promptSnippet: "pullback reveal, camera drifting backward to unveil context",
    group: "Cinematic movement",
    keywords: ["reveal", "scale"],
  },
  {
    id: "crane_rise",
    label: "Crane rise",
    tooltip: "Vertical lift or descent to dramatize geography.",
    promptSnippet: "crane rise, vertical sweep showcasing geography",
    group: "Cinematic movement",
    keywords: ["vertical", "sweep"],
  },
  {
    id: "aerial_sweep",
    label: "Aerial sweep",
    tooltip: "Sweeping drone arc for epic spectacle.",
    promptSnippet: "aerial sweep, dramatic drone arc over the scene",
    group: "Cinematic movement",
    keywords: ["drone", "epic"],
  },
  {
    id: "whip_pan",
    label: "Whip pan",
    tooltip: "Rapid pan blur that snaps attention between beats.",
    promptSnippet: "whip pan motion, rapid smear connecting story beats",
    group: "Kinetic energy",
    keywords: ["fast", "pan"],
  },
  {
    id: "handheld_urgency",
    label: "Handheld urgency",
    tooltip: "Energetic handheld sway for visceral immediacy.",
    promptSnippet: "handheld urgency, reactive camera with visceral sway",
    group: "Kinetic energy",
    keywords: ["handheld", "intense"],
  },
  {
    id: "slow_shutter",
    label: "Slow shutter trails",
    tooltip: "Long exposure streaks express speed and atmosphere.",
    promptSnippet: "slow shutter trails, luminous streaks conveying motion",
    group: "Kinetic energy",
    keywords: ["long exposure", "streaks"],
  },
  {
    id: "parallax_shift",
    label: "Parallax shift",
    tooltip: "Layered foregrounds move at different speeds for depth.",
    promptSnippet: "parallax shift, layered foregrounds sliding past the subject",
    group: "Kinetic energy",
    keywords: ["depth", "layers"],
  },
  {
    id: "freeze_frame",
    label: "Freeze-frame accent",
    tooltip: "Momentarily suspends motion for a stylized beat.",
    promptSnippet: "freeze-frame accent, suspended motion for dramatic punctuation",
    group: "Kinetic energy",
    keywords: ["staccato", "stylized"],
  },
];

export const atmosphere: VisualOption[] = [
  {
    id: "urban_noir_rain",
    label: "Urban noir rain",
    tooltip: "Slick asphalt, neon reflections, and misty drizzle wrapping the skyline.",
    promptSnippet: "midnight city streets glistening with rain, neon reflections in puddles",
    group: "Urban & Industrial",
    keywords: ["city", "rain", "noir"],
  },
  {
    id: "sunlit_meadow",
    label: "Sunlit meadow",
    tooltip: "Golden hour light drifting across tall grass and soft wildflowers.",
    promptSnippet: "sun-drenched meadow, tall grass glowing in late afternoon light",
    group: "Nature & Elements",
    keywords: ["sunset", "field", "warm"],
  },
  {
    id: "misty_forest_dawn",
    label: "Misty forest dawn",
    tooltip: "Cool haze threading between pine silhouettes at first light.",
    promptSnippet: "mist-covered evergreen forest at dawn, pale light filtering through",
    group: "Nature & Elements",
    keywords: ["forest", "mist", "dawn"],
  },
  {
    id: "desert_heat_haze",
    label: "Desert heat haze",
    tooltip: "Shimmering air over dunes with relentless sun and long shadows.",
    promptSnippet: "sun-baked desert dunes with heat haze and elongated shadows",
    group: "Nature & Elements",
    keywords: ["desert", "heat", "dune"],
  },
  {
    id: "arctic_crystal",
    label: "Arctic crystal",
    tooltip: "Icy winds over blue-white glaciers with prismatic sparkles.",
    promptSnippet: "arctic expanse of blue glaciers, crisp air with crystalline sparkle",
    group: "Nature & Elements",
    keywords: ["arctic", "ice", "cold"],
  },
  {
    id: "tropical_twilight",
    label: "Tropical twilight",
    tooltip: "Humid dusk with glowing palms, insects, and saturated horizon.",
    promptSnippet: "tropical shoreline at twilight, humid air and saturated horizon glow",
    group: "Nature & Elements",
    keywords: ["tropical", "dusk", "humid"],
  },
  {
    id: "futuristic_skyport",
    label: "Futuristic skyport",
    tooltip: "Hover platforms, holographic signage, and layered aerial traffic.",
    promptSnippet: "futuristic skyport with hovering vehicles and holographic signage",
    group: "Speculative Worlds",
    keywords: ["sci-fi", "sky", "hologram"],
  },
  {
    id: "ancient_ruins",
    label: "Ancient ruins",
    tooltip: "Weathered stone temples reclaimed by creeping vines and soft light.",
    promptSnippet: "ancient jungle ruins, weathered stone wrapped in creeping vines",
    group: "Speculative Worlds",
    keywords: ["ruins", "temple", "jungle"],
  },
  {
    id: "stormbreak_cliffs",
    label: "Stormbreak cliffs",
    tooltip: "Crashing waves, slate skies, and wind tearing across rugged cliffs.",
    promptSnippet: "storm-lashed sea cliffs, waves exploding under slate gray skies",
    group: "Nature & Elements",
    keywords: ["storm", "cliffs", "ocean"],
  },
  {
    id: "celestial_observatory",
    label: "Celestial observatory",
    tooltip: "Star-drenched dome interiors with glowing orreries and quiet reverence.",
    promptSnippet: "celestial observatory bathed in starlight, brass orreries in motion",
    group: "Speculative Worlds",
    keywords: ["stars", "observatory", "awe"],
  },
  {
    id: "underground_club",
    label: "Underground club",
    tooltip: "Bass-thick air, saturated strobes, and kinetic silhouettes in motion.",
    promptSnippet: "underground club haze, saturated strobes over moving silhouettes",
    group: "Urban & Industrial",
    keywords: ["club", "neon", "crowd"],
  },
  {
    id: "sacred_library",
    label: "Sacred library",
    tooltip: "Cathedral shelves, floating dust motes, and hushed reverence.",
    promptSnippet: "vast sacred library, towering shelves with dust motes in golden shafts",
    group: "Speculative Worlds",
    keywords: ["library", "sacred", "quiet"],
  },
];
