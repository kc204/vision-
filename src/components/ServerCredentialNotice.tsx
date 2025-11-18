import type { ReactNode } from "react";

type ServerCredentialNoticeProps = {
  title?: string;
  description?: ReactNode;
  helperText?: ReactNode;
  className?: string;
};

export function ServerCredentialNotice({
  title = "Server-managed credentials",
  description =
    "Director Core routes every request through managed Gemini accounts.",
  helperText = "No sign-in or API key entry is required in your browser.",
  className = "",
}: ServerCredentialNoticeProps) {
  return (
    <div
      className={`space-y-2 rounded-3xl border border-white/10 bg-slate-950/40 p-5 text-sm text-slate-200 shadow-sm ${className}`}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">Provider access</p>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="text-sm text-slate-300">{description}</p>
      {helperText ? (
        <p className="text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}
