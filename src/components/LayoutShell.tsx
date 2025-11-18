"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import type { ReactNode } from "react";

const navItems = [
  { href: "/image", label: "Image" },
  { href: "/video", label: "Video" },
  { href: "/loop", label: "Loop" },
  { href: "/loop-assistant", label: "Loop Assistant" },
] satisfies Array<{ href: Route; label: string }>;

export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-white/10 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white hover:text-canvas-accent"
          >
            Vision Architect Studio
          </Link>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-6 md:flex-1 md:justify-end">
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              {navItems.map(({ href, label }) => {
                const isActive = pathname === href || pathname?.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`rounded-full px-3 py-1 transition ${
                      isActive
                        ? "bg-canvas-accent/20 text-white ring-1 ring-canvas-accent/60"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex flex-col items-start gap-2 text-sm text-slate-300 sm:flex-row sm:items-center">
              <div className="flex flex-col text-left">
                <span className="text-xs uppercase tracking-wide text-slate-500">Provider access</span>
                <span className="font-medium text-white">Managed by Director Core</span>
                <span className="text-xs text-slate-400">
                  Requests route through server-provisioned Gemini credentials.
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 ring-1 ring-white/10">
                  Gemini: Managed
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 text-slate-200">{children}</main>
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500">
        Built with ❤️ using Next.js & Tailwind CSS.
      </footer>
    </div>
  );
}
