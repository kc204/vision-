"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vas-provider-api-key";

function readInitialValue(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return typeof stored === "string" ? stored : "";
  } catch (error) {
    console.warn("Failed to read provider API key from sessionStorage", error);
    return "";
  }
}

export function useProviderApiKey() {
  const [providerApiKey, setProviderApiKeyState] = useState<string>(() =>
    readInitialValue()
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.sessionStorage.setItem(STORAGE_KEY, providerApiKey);
    } catch (error) {
      console.warn("Failed to persist provider API key to sessionStorage", error);
    }
  }, [providerApiKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.sessionStorage) {
        return;
      }

      if (event.key !== STORAGE_KEY) {
        return;
      }

      setProviderApiKeyState(event.newValue ?? "");
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setProviderApiKey = useCallback((value: string) => {
    setProviderApiKeyState(value);
  }, []);

  return { providerApiKey, setProviderApiKey } as const;
}
