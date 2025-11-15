import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "vision-provider-api-key";

export function useProviderApiKey() {
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedValue = window.sessionStorage.getItem(STORAGE_KEY);
      if (storedValue) {
        setApiKey(storedValue);
      }
    } catch (error) {
      console.warn("Unable to access sessionStorage for provider API key", error);
    }
  }, []);

  const updateApiKey = useCallback((value: string) => {
    setApiKey(value);

    if (typeof window === "undefined") {
      return;
    }

    try {
      if (value.trim().length > 0) {
        window.sessionStorage.setItem(STORAGE_KEY, value);
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn("Unable to persist provider API key", error);
    }
  }, []);

  return [apiKey, updateApiKey] as const;
}
