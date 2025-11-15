import Link from "next/link";

export default function LoopAssistantPage() {
  return (
    <section className="space-y-10">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-canvas-accent">
          Loop Assistant
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
          Shape perfectly looping stories with guidance from the Director Core.
        </h1>
        <p className="mt-4 max-w-3xl text-base text-slate-300">
          The Loop Assistant helps you workshop concepts before committing to a full cinematic loop sequence. Outline the
          feeling you're chasing, capture the starting frame, and gather continuity markers the Director Core will honor
          during generation.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Creative prompt scaffolding</h2>
          <p className="mt-2 text-sm text-slate-300">
            Build a concise vision seed with recommended motifs, palette anchors, and atmosphere cues tailored to loopable
            concepts.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Continuity checkpoints</h2>
          <p className="mt-2 text-sm text-slate-300">
            Capture key transitions, rhythm beats, and motion signatures so your final loop can resolve seamlessly.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Hand-off to Loop Creator</h2>
          <p className="mt-2 text-sm text-slate-300">
            Once your idea is locked, jump straight into the Infinite Cinematic Loop Creator with the groundwork already set.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
        <h2 className="text-2xl font-semibold text-white">Ready to produce the loop?</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Move into the full builder when you're ready for the Director Core to generate precise cycle plans and predictive
          frames.
        </p>
        <Link
          href="/loop"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-canvas-accent px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
        >
          Launch Infinite Cinematic Loop Creator
        </Link>
      </div>
    </section>
  );
}
