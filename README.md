# Visionary Canvas

Describe it like a human. Get prompts like a director.

Visionary Canvas is a Next.js application that helps creators translate plain-language ideas into production-ready image prompts and cinematic video plans.

## Getting started

### Prerequisites
- Node.js 18+
- pnpm, npm, or yarn

### Installation
```bash
npm install
```

### Running the development server
```bash
npm run dev
```

The app exposes two primary modules:
- `/image` – Vision Architect (image prompt builder)
- `/video` – YouTube Cinematic Director (video scene planner)

## Environment variables
## Tech stack
- Next.js App Router with TypeScript
- Tailwind CSS for styling
- Director Core (Gemini) orchestration client stub

## Folder structure
```
src/
  app/
    (home)/page.tsx                  # Landing page
    (builders)/image/page.tsx        # Vision Architect UI
    video/page.tsx                   # YouTube Cinematic Director UI
    api/
      director/route.ts
  components/
    copy-button.tsx
  lib/
    directorClient.ts
    directorTypes.ts
    prompts/
      directorCore.ts
    visualOptions.ts
```

## Notes
- The `/api/director` endpoint expects a JSON POST body that matches one of the `DirectorRequest` variants and responds with plain-text output from the future Director Core integration.
- The Gemini-based Director Core client is currently a stub and will throw until the service is wired up.
- Initial persistence is in-memory only; future iterations can add database-backed history.
