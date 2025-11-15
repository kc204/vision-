"use client";

import { CopyButton } from "@/components/copy-button";

interface PromptOutputProps {
  label: string;
  value: string | null | undefined;
  copyLabel?: string;
  isCode?: boolean;
  className?: string;
  variant?: "default" | "subtle";
}

export function PromptOutput({
  label,
  value,
  copyLabel,
  isCode = false,
  className,
  variant = "default",
}: PromptOutputProps) {
  const displayValue = value && value.trim().length > 0 ? value : "—";

  const containerClass =
    variant === "subtle"
      ? "rounded-xl border border-white/10 bg-slate-950/60 p-4"
      : "rounded-2xl border border-white/10 bg-white/5 p-5";

  const headingClass =
    variant === "subtle"
      ? "text-xs font-semibold uppercase tracking-wide text-slate-300"
      : "text-sm font-semibold uppercase tracking-wide text-slate-300";

  const copyButtonClass =
    variant === "subtle"
      ? "inline-flex items-center rounded-lg border border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-white/30 hover:bg-white/10"
      : undefined;

  const body = isCode ? (
    <pre
      className={`${
        variant === "subtle"
          ? "mt-2 overflow-x-auto rounded-lg border border-white/5 bg-slate-950/80 p-3 text-xs text-slate-100"
          : "mt-3 overflow-x-auto rounded-xl border border-white/5 bg-slate-950/80 p-4 text-sm text-slate-100"
      }`}
    >
      <code className="font-mono">{displayValue}</code>
    </pre>
  ) : (
    <p
      className={`${
        variant === "subtle"
          ? "mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100"
          : "mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-100"
      }`}
    >
      {displayValue}
    </p>
  );

  return (
    <article className={`${containerClass} ${className ?? ""}`}>
      <header className="flex items-center justify-between gap-3">
        <h2 className={headingClass}>{label}</h2>
        {copyLabel ? (
          <CopyButton
            text={displayValue}
            label={copyLabel}
            className={copyButtonClass}
          />
        ) : null}
      </header>
      {body}
    </article>
  );
}
