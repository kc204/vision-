import type { Metadata } from "next";
import "./globals.css";
import { LayoutShell } from "@/components/LayoutShell";
import { AuthProvider } from "@/components/AuthProvider";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Vision Architect Studio",
  description:
    "Craft cinematic image prompts, Veo-ready video plans, and predictive loop sequences with a unified Director Core.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" className="bg-slate-950">
      <body className="min-h-screen bg-slate-950 antialiased">
        <AuthProvider session={session}>
          <LayoutShell>{children}</LayoutShell>
        </AuthProvider>
      </body>
    </html>
  );
}
