"use client";

import { useId } from "react";

import {
  type ProviderCredentialKey,
  updateProviderCredential,
} from "@/lib/providerCredentials";
import { useProviderCredentials } from "@/hooks/useProviderCredentials";

type ProviderCredentialPanelProps = {
  title?: string;
  description?: string;
};

const credentialFields: Array<{
  key: ProviderCredentialKey;
  label: string;
  placeholder: string;
  helper: string;
}> = [
  {
    key: "geminiApiKey",
    label: "Gemini image & chat",
    placeholder: "AIcx...",
    helper:
      "Use a Google AI Studio key. Director Core falls back to server credentials if provided.",
  },
  {
    key: "veoApiKey",
    label: "Veo video planning",
    placeholder: "AIcx...",
    helper:
      "Provide a Veo-capable Google API key to unlock video planning locally.",
  },
  {
    key: "nanoBananaApiKey",
    label: "Nano Banana loop synthesis",
    placeholder: "nanb_...",
    helper: "Paste your Nano Banana API key to render predictive loop sequences.",
  },
];

export function ProviderCredentialPanel({
  title = "Provider credentials",
  description = "Store API keys locally so each provider call can use your credentials.",
}: ProviderCredentialPanelProps) {
  const credentials = useProviderCredentials();
  const panelId = useId();

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
          <p className="font-medium text-white">Director Core credentials</p>
          <p className="text-xs text-slate-400">{description}</p>
          <p className="text-xs text-slate-500">
            Keys are persisted in <code className="font-mono">localStorage</code> and sent with API
            requests from this browser only.
          </p>
        </div>
        <div className="w-full max-w-xl space-y-3">
          {credentialFields.map((field) => {
            const inputId = `${panelId}-${field.key}`;
            return (
              <label key={field.key} className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {field.label}
                </span>
                <input
                  id={inputId}
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={credentials[field.key] ?? ""}
                  onChange={(event) =>
                    updateProviderCredential(field.key, event.target.value)
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
                />
                <span className="text-[0.7rem] text-slate-500">{field.helper}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
