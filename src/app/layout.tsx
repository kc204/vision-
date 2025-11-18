import type { Metadata } from "next";
import "./globals.css";
import { LayoutShell } from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "Vision Architect Studio",
  description:
    "Craft cinematic image prompts, Gemini storyboards, and predictive loop sequences with a unified Director Core.",
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
