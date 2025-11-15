import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Visionary Canvas",
  description:
    "Describe it like a human. Get prompts like a director. Visionary Canvas turns casual language into cinematic image prompts and video plans.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-slate-950">
      <body className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <header className="border-b border-white/10 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-white hover:text-canvas-accent"
            >
              Visionary Canvas
            </Link>
            <nav className="flex items-center gap-4 text-sm text-slate-300">
              <Link
                href="/image"
                className="hover:text-white"
              >
                Vision Architect
              </Link>
              <Link
                href="/video"
                className="hover:text-white"
              >
                YouTube Cinematic Director
              </Link>
              <Link
                href="/loop"
                className="hover:text-white"
              >
                Loop Animator
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500">
          Built with ❤️ using Next.js & Tailwind CSS.
        </footer>
      </body>
    </html>
  );
}
