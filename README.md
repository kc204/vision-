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
Set an OpenAI API key before calling the generation endpoints:

```bash
export OPENAI_API_KEY=your_api_key
# Optional: override the default model (defaults to gpt-4o-mini)
export OPENAI_MODEL=gpt-4.1-mini
```

## Tech stack
- Next.js App Router with TypeScript
- Tailwind CSS for styling
- OpenAI Responses API for prompt generation

## Folder structure
```
src/
  app/
    (home)/page.tsx          # Landing page
    image/page.tsx           # Vision Architect UI
    video/page.tsx           # YouTube Cinematic Director UI
    api/
      generate-image-prompt/route.ts
      generate-video-plan/route.ts
  components/
    copy-button.tsx
  lib/
    visualOptions.ts
```

## Notes
- Both API routes expect JSON POST requests and respond with JSON.
- If the OpenAI response cannot be parsed, the API returns a 500 error with a friendly message for the UI.
- Initial persistence is in-memory only; future iterations can add database-backed history.
