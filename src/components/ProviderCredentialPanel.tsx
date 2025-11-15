"use client";

import { useMemo } from "react";
import { signIn, useSession } from "next-auth/react";

type ProviderCredentialPanelProps = {
  title?: string;
  description?: string;
};

export function ProviderCredentialPanel({
  title = "Google authentication",
  description = "Director Core will use your Google OAuth token to talk to Gemini and Veo.",
}: ProviderCredentialPanelProps) {
  const { data: session, status } = useSession();

  const expiryDisplay = useMemo(() => {
    const expiry = session?.accessTokenExpires;
    if (!expiry) return null;
    const date = new Date(expiry);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    }).format(date);
  }, [session?.accessTokenExpires]);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
          <p className="font-medium text-white">
            {isLoading ? "Checking session…" : session?.user?.email ?? "Not signed in"}
          </p>
          <p className="text-xs text-slate-400">{description}</p>
          {session?.accessToken && expiryDisplay ? (
            <p className="text-xs text-slate-500">Access token refresh expected around {expiryDisplay}.</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() =>
                void signIn("google", {
                  callbackUrl: typeof window !== "undefined" ? window.location.href : undefined,
                  prompt: "consent",
                })
              }
              className="rounded-full border border-canvas-accent/60 px-4 py-2 text-xs font-semibold text-white transition hover:bg-canvas-accent/20"
            >
              Refresh Google token
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                void signIn("google", {
                  callbackUrl: typeof window !== "undefined" ? window.location.href : undefined,
                })
              }
              className="rounded-full bg-canvas-accent px-4 py-2 text-xs font-semibold text-slate-950 shadow transition hover:bg-canvas-accent/90"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
