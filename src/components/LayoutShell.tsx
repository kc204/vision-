import Link from "next/link";
import { ReactNode } from "react";

const navigation = [
  { href: "/app/image", label: "Image Builder" },
  { href: "/app/video", label: "Video Director" },
  { href: "/app/loop", label: "Loop Designer" },
];

export interface LayoutShellProps {
  children: ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-white/10 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-white hover:text-canvas-accent"
          >
            Vision Architect Studio
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-300">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500">
        Built with ❤️ using Next.js & Tailwind CSS.
      </footer>
    </div>
  );
}

export default LayoutShell;
