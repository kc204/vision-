"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label: string;
  className?: string;
}

export function CopyButton({ text, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        "mt-3 inline-flex items-center rounded-md bg-canvas-accent px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
      }
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
