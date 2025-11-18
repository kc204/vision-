"use client";

import { type ChangeEvent } from "react";

type ProviderApiKeyInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  helperText?: string;
  placeholder?: string;
};

export function ProviderApiKeyInput({
  value,
  onChange,
  label = "Bring your own Gemini key",
  description,
  helperText =
    "Keys stay in this browser session and are only forwarded with your next request.",
  placeholder = "Paste your Gemini key",
}: ProviderApiKeyInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-200">{label}</span>
      {description ? (
        <p className="text-xs text-slate-400">{description}</p>
      ) : null}
      <input
        type="password"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-canvas-accent focus:outline-none focus:ring-1 focus:ring-canvas-accent"
      />
      <p className="text-xs text-slate-400">{helperText}</p>
    </label>
  );
}
