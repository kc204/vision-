import { PropsWithChildren } from "react";
import { CopyButton } from "@/components/copy-button";

type PromptOutputProps = PropsWithChildren<{
  title: string;
  copyLabel?: string;
  copyValue?: string;
}>;

export function PromptOutput({ title, copyLabel, copyValue, children }: PromptOutputProps) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          {title}
        </h2>
        {copyLabel && copyValue ? (
          <CopyButton text={copyValue} label={copyLabel} />
        ) : null}
      </header>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-100">{children}</div>
    </article>
  );
}
