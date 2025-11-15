import Link from "next/link";

export default function HomePage() {
  return (
    <section className="space-y-12">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-canvas-accent">Visionary Canvas</p>
        <h1 className="mt-4 text-4xl font-bold text-white sm:text-5xl">
          Describe it like a human. Get prompts like a director.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">
          Visionary Canvas turns everyday language into professional-grade image prompts, cinematic video scene plans, and autonomous loop cycles. Start in one surface and hand results off to the others without re-writing your ideas.
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
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
            Launch Autonomous Loop Director
          </Link>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">Vision Architect</h2>
          <p className="mt-2 text-sm text-slate-300">
            Craft polished ComfyUI and SDXL prompts from simple language. Dial in camera angles, lighting, and color palettes with guided dropdowns.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Send the final frame prompt to the Loop Director to visualize seamless motion, or hand it off to the Cinematic Director for scene context.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-canvas-accent">
            <Link href="/loop" className="hover:underline">
              Hand off to loop
            </Link>
            <Link href="/video" className="hover:underline">
              Plan a scene
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">YouTube Cinematic Director</h2>
          <p className="mt-2 text-sm text-slate-300">
            Turn any script into a scene-by-scene plan with thumbnail ideas, camera movement, sound suggestions, and continuity notes.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Carry continuity locks into the Loop Director to animate transitions, or pick standout frames to refine with Vision Architect.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-canvas-accent">
            <Link href="/loop" className="hover:underline">
              Animate the beat
            </Link>
            <Link href="/image" className="hover:underline">
              Refine a keyframe
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold text-white">Autonomous Loop Director</h2>
          <p className="mt-2 text-sm text-slate-300">
            Feed a Vision Seed with inspiration links and drop-in start frames to spin up predictive storybeats with continuity locks and end-frame prompts.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Use Vision Architect to sculpt frames before looping, or surface loop beats in the Cinematic Director for longer narratives.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-canvas-accent">
            <Link href="/image" className="hover:underline">
              Refresh start frames
            </Link>
            <Link href="/video" className="hover:underline">
              Expand the story
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
