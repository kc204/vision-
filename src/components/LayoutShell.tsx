"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  { href: "/image", label: "Vision Architect" },
  { href: "/video", label: "YouTube Cinematic Director" },
  { href: "/loop", label: "Loop Animator" },
];

export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-white/10 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white hover:text-canvas-accent"
          >
            Vision Architect Studio
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            {navItems.map(({ href, label }) => {
              const isActive = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`transition hover:text-white ${
                    isActive ? "text-white" : "text-slate-300"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 text-slate-200">
        {children}
      </main>
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500">
        Built with ❤️ using Next.js & Tailwind CSS.
      </footer>
    </div>
  );
}
