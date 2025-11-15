const STORAGE_KEY = "vas-provider-credentials";

export type ProviderCredentialKey =
  | "geminiApiKey"
  | "veoApiKey"
  | "nanoBananaApiKey";

export type ProviderCredentialSnapshot = Record<ProviderCredentialKey, string>;

const DEFAULT_SNAPSHOT: ProviderCredentialSnapshot = {
  geminiApiKey: "",
  veoApiKey: "",
  nanoBananaApiKey: "",
};

let cachedSnapshot: ProviderCredentialSnapshot = { ...DEFAULT_SNAPSHOT };
const listeners = new Set<() => void>();

function readFromStorage(): ProviderCredentialSnapshot {
  if (typeof window === "undefined") {
    return cachedSnapshot;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SNAPSHOT };
    }

    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    return {
      geminiApiKey: typeof parsed.geminiApiKey === "string" ? parsed.geminiApiKey : "",
      veoApiKey: typeof parsed.veoApiKey === "string" ? parsed.veoApiKey : "",
      nanoBananaApiKey:
        typeof parsed.nanoBananaApiKey === "string" ? parsed.nanoBananaApiKey : "",
    } satisfies ProviderCredentialSnapshot;
  } catch (error) {
    console.warn("Unable to parse stored provider credentials", error);
    return { ...DEFAULT_SNAPSHOT };
  }
}

function persistSnapshot(nextSnapshot: ProviderCredentialSnapshot) {
  cachedSnapshot = nextSnapshot;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSnapshot));
    } catch (error) {
      console.warn("Failed to persist provider credentials", error);
    }
  }
  notifyListeners();
}

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

export function getProviderCredentialSnapshot(): ProviderCredentialSnapshot {
  if (typeof window !== "undefined" && listeners.size === 0) {
    // Ensure the cached snapshot reflects the latest storage value when the
    // first consumer subscribes in the browser environment.
    cachedSnapshot = readFromStorage();
  }
  return cachedSnapshot;
}

export function getServerProviderCredentialSnapshot(): ProviderCredentialSnapshot {
  return cachedSnapshot;
}

export function subscribeToProviderCredentials(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {
      /* noop on server */
    };
  }

  if (listeners.size === 0) {
    cachedSnapshot = readFromStorage();
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function updateProviderCredential(
  key: ProviderCredentialKey,
  value: string
): void {
  const nextSnapshot: ProviderCredentialSnapshot = {
    ...cachedSnapshot,
    [key]: value,
  };
  persistSnapshot(nextSnapshot);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }
    cachedSnapshot = readFromStorage();
    notifyListeners();
  });
}
