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

Create a `.env.local` file in the project root to provide API keys for the supported providers. These values allow the server and/or browser to make authenticated requests on your behalf and do not configure any OAuth flows.

```bash
# Optional browser defaults that appear in the credential status bar
NEXT_PUBLIC_GEMINI_API_KEY=""
NEXT_PUBLIC_VEO_API_KEY=""
NEXT_PUBLIC_NANO_BANANA_API_KEY=""

# Server-side fallbacks for Director Core routes
GEMINI_API_KEY=""
GOOGLE_API_KEY=""
VEO_API_KEY=""
VEO_VERTEX_API_KEY=""
VEO_VERTEX_API_URL=""
NANO_BANANA_API_KEY=""
```

Populate whichever keys you have access to—local browser credentials entered in the UI always take precedence.
## Tech stack
- Next.js App Router with TypeScript
- Tailwind CSS for styling
- Director Core (Gemini) orchestration client stub

## Folder structure
```
src/
  app/
    (home)/page.tsx          # Landing page
    image/page.tsx           # Vision Architect UI
    video/page.tsx           # YouTube Cinematic Director UI
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
- The `/api/director` endpoint expects a JSON POST body that matches one of the `DirectorRequest` variants and returns `{ "text": string }` from the future Director Core integration.
- The Gemini-based Director Core client is currently a stub and will throw until the service is wired up.
- Initial persistence is in-memory only; future iterations can add database-backed history.
- The image, video, and loop assistant builders accept an optional provider API key input. Keys stay in the browser session and are forwarded with the request via the `x-provider-api-key` header so they are never persisted on the server.
