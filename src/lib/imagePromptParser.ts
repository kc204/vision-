const SECTION_HEADERS = [
  "Summary",
  "Mood Memory",
  "Positive Prompt",
  "Negative Prompt",
  "Settings",
] as const;

type SectionHeader = (typeof SECTION_HEADERS)[number];

const SECTION_HEADER_SET = new Map(
  SECTION_HEADERS.map((header) => [header.toLowerCase(), header])
);

function normalizeHeaderCandidate(rawHeader: string): SectionHeader | null {
  const sanitized = rawHeader.replace(/\s+/g, " ").trim().toLowerCase();
  const match = SECTION_HEADER_SET.get(sanitized);
  return match ?? null;
}

type HeaderDetection = {
  header: SectionHeader;
  inlineContent: string;
};

function detectHeader(line: string): HeaderDetection | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^[*\s]*([^:*]+?)[*\s]*:\s*(.*)$/);
  if (!match) {
    return null;
  }

  const headerCandidate = normalizeHeaderCandidate(match[1]);
  if (!headerCandidate) {
    return null;
  }

  return {
    header: headerCandidate,
    inlineContent: match[2] ?? "",
  };
}

export function extractSection(
  text: string,
  header: SectionHeader
): string | undefined {
  const lines = text.split(/\r?\n/);
  const collected: string[] = [];
  let isCollecting = false;

  for (const line of lines) {
    const detected = detectHeader(line);
    if (detected) {
      if (detected.header === header) {
        isCollecting = true;
        collected.length = 0;
        if (detected.inlineContent.trim()) {
          collected.push(detected.inlineContent.trim());
        }
      } else if (isCollecting) {
        break;
      }
      continue;
    }

    if (isCollecting) {
      collected.push(line.replace(/\r$/, ""));
    }
  }

  const result = collected.join("\n").trim();
  return result ? result : undefined;
}

export function parseSettings(sectionText?: string): Record<string, string> {
  if (!sectionText) {
    return {};
  }

  const settings: Record<string, string> = {};
  const lines = sectionText.split(/\r?\n/);

  let pendingKey: string | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const keyValueMatch = line.match(/^(?:[-•]\s*)?([^:]+):\s*(.+)$/);
    if (keyValueMatch) {
      const key = keyValueMatch[1].trim();
      const value = keyValueMatch[2].trim();
      settings[key] = value;
      pendingKey = key;
      continue;
    }

    if (pendingKey) {
      settings[pendingKey] = `${settings[pendingKey]} ${line}`.trim();
    }
  }

  return settings;
}

export type ParsedImagePrompt = {
  positivePrompt: string;
  negativePrompt: string;
  summary: string;
  settings: Record<string, string>;
  moodMemory?: string;
};

export function parseStructuredText(content: string): ParsedImagePrompt | null {
  const summary = extractSection(content, "Summary");
  const moodMemory = extractSection(content, "Mood Memory");
  const positivePrompt = extractSection(content, "Positive Prompt");
  const negativePrompt = extractSection(content, "Negative Prompt");
  const settingsText = extractSection(content, "Settings");

  if (
    !summary &&
    !moodMemory &&
    !positivePrompt &&
    !negativePrompt &&
    !settingsText
  ) {
    return null;
  }

  return {
    summary: summary ?? "",
    positivePrompt: positivePrompt ?? "",
    negativePrompt: negativePrompt ?? "",
    moodMemory: moodMemory ?? undefined,
    settings: parseSettings(settingsText),
  };
}
