import type { Metadata } from "next";
import "./globals.css";
import { LayoutShell } from "@/components/LayoutShell";

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
      <body className="min-h-screen bg-slate-950 antialiased">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
