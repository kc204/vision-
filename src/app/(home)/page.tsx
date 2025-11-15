import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-12">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-canvas-accent">Vision Architect Studio</p>
        <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
          One Director Core for every cinematic imagination.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Feed your ideas into the Director Core and receive production-ready image prompts, scene-by-scene video plans, and infinite loop concepts—no film school vocabulary required.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/image"
            className="inline-flex items-center justify-center rounded-lg bg-canvas-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
          >
            Launch Vision Architect
          </Link>
          <Link
            href="/video"
            className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-white/40"
          >
            Launch YouTube Cinematic Director
          </Link>
          <Link
            href="/loop"
            className="inline-flex items-center justify-center rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white hover:border-white/40"
          >
            Launch Infinite Cinematic Loop Creator
          </Link>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">Vision Architect</h2>
          <p className="mt-2 text-sm text-slate-300">
            Combine detailed Vision Seeds with cinematic dropdowns to generate SDXL, Flux, or Illustrious-ready prompts.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">YouTube Cinematic Director</h2>
          <p className="mt-2 text-sm text-slate-300">
            Turn a script into Veo-ready scene JSON with continuity locks, pacing notes, and a standout thumbnail concept.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">Infinite Loop Creator</h2>
          <p className="mt-2 text-sm text-slate-300">
            Forecast future frames with predictive loop cycles that preserve mood, palette, and narrative identity.
          </p>
        </div>
      </div>
    </section>
  );
}
